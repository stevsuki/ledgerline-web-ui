import { isRecord, readEnum, readNumber, readString } from "@/lib/api/parse";
import {
  API_ERROR_CODES,
  type ApiFailure,
  type ApiFieldError,
  type ApiMeta,
  type ApiResult,
} from "@/types/api";

/** The single door to `ledgerline-backend`. */

const DEFAULT_BASE_URL = "http://localhost:8080/api/v1";

/** No HTTP exchange happened, so there is no status to report. */
const NO_STATUS = 0;

/** The backend answers a wait in seconds, never as an HTTP date. */
const RETRY_AFTER_HEADER = "Retry-After";

const UNREACHABLE_MESSAGE =
  "Cannot reach the Ledgerline API. Check that the backend is running.";
const UNREADABLE_MESSAGE = "The API returned a response we could not read.";
const FALLBACK_ERROR_MESSAGE = "The request could not be completed.";
const FALLBACK_SUCCESS_MESSAGE = "Success";

function baseUrl(): string {
  const configured = process.env.LEDGERLINE_API_URL?.trim();
  return (configured || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

export type ApiRequest = {
  readonly path: string;
  readonly method: "GET" | "POST" | "PATCH" | "DELETE";
  readonly body?: Readonly<Record<string, unknown>>;
  readonly accessToken?: string;
};

function buildHeaders(request: ApiRequest): Headers {
  const headers = new Headers({ Accept: "application/json" });
  if (request.body) {
    headers.set("Content-Type", "application/json");
  }
  if (request.accessToken) {
    headers.set("Authorization", `Bearer ${request.accessToken}`);
  }
  return headers;
}

async function send(request: ApiRequest): Promise<Response | null> {
  try {
    return await fetch(`${baseUrl()}${request.path}`, {
      method: request.method,
      headers: buildHeaders(request),
      body: request.body ? JSON.stringify(request.body) : undefined,
      // Auth answers are per-user and short-lived; they are never reused.
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

async function readEnvelope(
  response: Response,
): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await response.json();
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readFieldErrors(
  envelope: Record<string, unknown>,
): readonly ApiFieldError[] {
  const raw = envelope.errors;
  if (!Array.isArray(raw)) {
    return [];
  }

  const errors: ApiFieldError[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) {
      continue;
    }
    const field = readString(entry, "field");
    const message = readString(entry, "message");
    if (field && message) {
      errors.push({ field, message });
    }
  }
  return errors;
}

function readMeta(envelope: Record<string, unknown>): ApiMeta | null {
  const raw = envelope.meta;
  if (!isRecord(raw)) {
    return null;
  }
  return {
    page: readNumber(raw, "page") ?? 1,
    perPage: readNumber(raw, "per_page") ?? 0,
    totalItems: readNumber(raw, "total_items") ?? 0,
    totalPages: readNumber(raw, "total_pages") ?? 0,
  };
}

/** How long the backend asked the caller to wait, in whole seconds. */
function readRetryAfter(response: Response): number {
  const raw = response.headers.get(RETRY_AFTER_HEADER);
  if (!raw) {
    return 0;
  }
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 0;
}

type FailureParts = {
  readonly code: ApiFailure["code"];
  readonly message: string;
  readonly status: number;
  readonly fieldErrors?: readonly ApiFieldError[];
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;
};

function failure(parts: FailureParts): ApiResult<never> {
  return {
    ok: false,
    error: {
      code: parts.code,
      message: parts.message,
      status: parts.status,
      fieldErrors: parts.fieldErrors ?? [],
      requestId: parts.requestId ?? "",
      retryAfterSeconds: parts.retryAfterSeconds ?? 0,
    },
  };
}

function toFailure(
  response: Response,
  envelope: Record<string, unknown> | null,
): ApiResult<never> {
  if (!envelope) {
    return failure({
      code: "UNREADABLE",
      message: UNREADABLE_MESSAGE,
      status: response.status,
    });
  }

  return failure({
    // A code released after this client was written keeps its own message.
    code: readEnum(envelope, "code", API_ERROR_CODES, "UNKNOWN"),
    message: readString(envelope, "message") ?? FALLBACK_ERROR_MESSAGE,
    status: response.status,
    fieldErrors: readFieldErrors(envelope),
    requestId: readString(envelope, "request_id") ?? "",
    retryAfterSeconds: readRetryAfter(response),
  });
}

/** Performs the call and unwraps the envelope. */
export async function apiRequest(
  request: ApiRequest,
): Promise<ApiResult<unknown>> {
  const response = await send(request);
  if (!response) {
    return failure({
      code: "UNREACHABLE",
      message: UNREACHABLE_MESSAGE,
      status: NO_STATUS,
    });
  }

  const envelope = await readEnvelope(response);
  if (!response.ok) {
    return toFailure(response, envelope);
  }
  if (!envelope) {
    return failure({
      code: "UNREADABLE",
      message: UNREADABLE_MESSAGE,
      status: response.status,
    });
  }

  return {
    ok: true,
    data: envelope.data ?? null,
    message: readString(envelope, "message") ?? FALLBACK_SUCCESS_MESSAGE,
    meta: readMeta(envelope),
  };
}

/** The raw response, for the one endpoint whose body is not JSON: the audit log CSV. */
export async function apiStream(
  request: ApiRequest,
): Promise<Response | null> {
  return send(request);
}

/** Runs a successful result's payload through a parser, or reports it unreadable. */
export function withParsed<T>(
  result: ApiResult<unknown>,
  parse: (raw: unknown) => T | null,
): ApiResult<T> {
  if (!result.ok) {
    return result;
  }

  const parsed = parse(result.data);
  if (!parsed) {
    return failure({
      code: "UNREADABLE",
      message: UNREADABLE_MESSAGE,
      status: NO_STATUS,
    });
  }
  return { ok: true, data: parsed, message: result.message, meta: result.meta };
}

/** For endpoints whose success carries no payload, only a message. */
export function withoutData(result: ApiResult<unknown>): ApiResult<null> {
  if (!result.ok) {
    return result;
  }
  return { ok: true, data: null, message: result.message, meta: result.meta };
}

/** Appends the query the list endpoints read. */
export function withQuery(
  path: string,
  query: Readonly<Record<string, string | number | undefined>>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const encoded = search.toString();
  return encoded ? `${path}?${encoded}` : path;
}

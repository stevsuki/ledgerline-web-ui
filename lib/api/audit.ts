import {
  apiRequest,
  apiStream,
  withParsed,
  withQuery,
} from "@/lib/api/client";
import { parseAuditDetail } from "@/lib/api/audit-detail";
import { isRecord, readEnum, readNumber, readString } from "@/lib/api/parse";
import {
  AUDIT_SEVERITIES,
  AUDIT_STATUSES,
  type AuditActorOption,
  type AuditEvent,
  type AuditFilterOption,
  type AuditOptions,
  type AuditOverview,
} from "@/types/access";
import type { ApiResult } from "@/types/api";

/**
 * The four audit endpoints of `ledgerline-backend`:
 * `/audit-logs`, `/audit-logs/overview`, `/audit-logs/options` and
 * `/audit-logs/export`.
 *
 * As everywhere else in `lib/api`, the payload is narrowed into a real type
 * here rather than cast, so a backend that answers with something unexpected
 * produces a reportable failure instead of a crash inside a component.
 */

const AUDIT_LOGS = "/audit-logs";

/** The backend's `binding:"max=100"` on `per_page`. */
const MAX_PER_PAGE = 100;

export type AuditQuery = {
  readonly search: string;
  readonly userId: string;
  readonly status: string;
  readonly severity: string;
  readonly module: string;
  readonly from: string;
  readonly to: string;
};

export type AuditListQuery = AuditQuery & {
  readonly sort: string;
  readonly page: number;
  readonly perPage: number;
};

/** The filter half of the query, shared by the list and the export. */
function rangeParams(query: AuditQuery): Record<string, string> {
  return {
    search: query.search,
    user_id: query.userId,
    status: query.status,
    severity: query.severity,
    module: query.module,
    from: query.from,
    to: query.to,
  };
}

/* ── list ──────────────────────────────────────────────────────────────── */

/**
 * `created_at` arrives as `2026-08-27 19:41:00`; the table prints
 * `27-08-2026 19:41`. Rearranged as text rather than through `Date`, because
 * the backend sends no zone and parsing one in would shift the stamp by
 * whatever the viewer's offset happens to be.
 */
function toDisplayStamp(createdAt: string): string {
  const [date, time = ""] = createdAt.split(" ");
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) {
    return createdAt;
  }
  return `${day}-${month}-${year} ${time.slice(0, 5)}`.trim();
}

function parseEvent(raw: unknown): AuditEvent | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = readString(raw, "id");
  if (!id) {
    return null;
  }

  const createdAt = readString(raw, "created_at") ?? "";

  return {
    id,
    time: toDisplayStamp(createdAt),
    actorId: readString(raw, "user_id") ?? "",
    actor: readString(raw, "user_full_name") ?? "Unknown",
    role: readString(raw, "role_name") ?? "—",
    action: readString(raw, "action") ?? "",
    module: readString(raw, "module") ?? "",
    detail: readString(raw, "detail_text") ?? "",
    ip: readString(raw, "ip_address") || "—",
    status: readEnum(raw, "status", AUDIT_STATUSES, "success"),
    severity: readEnum(raw, "severity", AUDIT_SEVERITIES, "info"),
    details: parseAuditDetail(raw.details),
  };
}

export type AuditPage = {
  readonly items: readonly AuditEvent[];
  readonly total: number;
};

/** GET /audit-logs */
export async function listAuditLogs(
  accessToken: string,
  query: AuditListQuery,
): Promise<ApiResult<AuditPage>> {
  const path = withQuery(AUDIT_LOGS, {
    ...rangeParams(query),
    sort: query.sort,
    page: query.page,
    per_page: Math.min(query.perPage, MAX_PER_PAGE),
  });

  const result = await apiRequest({ path, method: "GET", accessToken });
  if (!result.ok) {
    return result;
  }

  const items = Array.isArray(result.data)
    ? result.data
        .map(parseEvent)
        .filter((event): event is AuditEvent => event !== null)
    : [];

  return {
    ok: true,
    data: { items, total: result.meta?.totalItems ?? items.length },
    message: result.message,
    meta: result.meta,
  };
}

/* ── overview ──────────────────────────────────────────────────────────── */

function parseOverview(raw: unknown): AuditOverview | null {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    windowDays: readNumber(raw, "window_days") ?? 0,
    events: readNumber(raw, "events") ?? 0,
    modules: readNumber(raw, "modules") ?? 0,
    sensitive: readNumber(raw, "sensitive") ?? 0,
    failedSignIns: readNumber(raw, "failed_sign_ins") ?? 0,
    failedSignInAddresses: readNumber(raw, "failed_sign_in_addresses") ?? 0,
    retentionDays: readNumber(raw, "retention_days") ?? 0,
  };
}

/** GET /audit-logs/overview */
export async function fetchAuditOverview(
  accessToken: string,
): Promise<ApiResult<AuditOverview>> {
  const result = await apiRequest({
    path: `${AUDIT_LOGS}/overview`,
    method: "GET",
    accessToken,
  });
  return withParsed(result, parseOverview);
}

/* ── options ───────────────────────────────────────────────────────────── */

function parseOption(raw: unknown): AuditFilterOption | null {
  if (!isRecord(raw)) {
    return null;
  }

  const value = readString(raw, "value");
  if (!value) {
    return null;
  }
  return { value, label: readString(raw, "label") || value };
}

function parseActor(raw: unknown): AuditActorOption | null {
  const option = parseOption(raw);
  if (!option || !isRecord(raw)) {
    return null;
  }
  return { ...option, role: readString(raw, "role") ?? "" };
}

function parseOptionList<T>(
  raw: unknown,
  parse: (entry: unknown) => T | null,
): readonly T[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(parse).filter((entry): entry is T => entry !== null);
}

function parseOptions(raw: unknown): AuditOptions | null {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    actors: parseOptionList(raw.actors, parseActor),
    modules: parseOptionList(raw.modules, parseOption),
    statuses: parseOptionList(raw.statuses, parseOption),
    severities: parseOptionList(raw.severities, parseOption),
  };
}

/** GET /audit-logs/options */
export async function fetchAuditOptions(
  accessToken: string,
): Promise<ApiResult<AuditOptions>> {
  const result = await apiRequest({
    path: `${AUDIT_LOGS}/options`,
    method: "GET",
    accessToken,
  });
  return withParsed(result, parseOptions);
}

/* ── export ────────────────────────────────────────────────────────────── */

/**
 * GET /audit-logs/export — the raw response, body and all.
 *
 * The backend streams the CSV row by row and names the file after the range,
 * so the route handler in front of this passes both straight through rather
 * than reading, re-encoding or re-naming anything.
 */
export async function streamAuditExport(
  accessToken: string,
  query: AuditQuery,
): Promise<Response | null> {
  return apiStream({
    path: withQuery(`${AUDIT_LOGS}/export`, rangeParams(query)),
    method: "GET",
    accessToken,
  });
}

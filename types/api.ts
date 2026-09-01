/**
 * The shapes the Go backend puts on the wire.
 *
 * Every endpoint answers with the same envelope — `pkg/response` in
 * `ledgerline-backend` — so it is parsed once here and every caller works from
 * one result type instead of re-reading `response.ok` and `response.status`.
 */

/**
 * The codes `handleError` in the backend's `internal/delivery/http/handler`
 * can emit, plus the two this client adds when the answer never arrived or was
 * not the envelope at all.
 */
export const API_ERROR_CODES = [
  "BAD_REQUEST",
  "VALIDATION_ERROR",
  "INVALID_INPUT",
  "INVALID_CREDENTIALS",
  "INVALID_OTP",
  "MAX_ATTEMPTS_EXCEEDED",
  "TOKEN_EXPIRED",
  "TOKEN_INVALID",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "TOO_MANY_REQUESTS",
  "INTERNAL_ERROR",
  /** The request never reached the API. */
  "UNREACHABLE",
  /** It answered, but not with a body this client recognises. */
  "UNREADABLE",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** One entry of the backend's `errors` array, keyed by the field's json tag. */
export type ApiFieldError = {
  readonly field: string;
  readonly message: string;
};

export type ApiMeta = {
  readonly page: number;
  readonly perPage: number;
  readonly totalItems: number;
  readonly totalPages: number;
};

export type ApiFailure = {
  readonly code: ApiErrorCode;
  readonly message: string;
  /** The HTTP status, or 0 when the request never completed. */
  readonly status: number;
  readonly fieldErrors: readonly ApiFieldError[];
};

export type ApiResult<T> =
  | {
      readonly ok: true;
      readonly data: T;
      readonly message: string;
      readonly meta: ApiMeta | null;
    }
  | { readonly ok: false; readonly error: ApiFailure };

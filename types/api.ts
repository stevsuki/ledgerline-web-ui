/** The shapes the Go backend puts on the wire. */

/**
 * The backend's published catalogue, mirrored from `ERROR_CODES.md` — whose own
 * source is `internal/domain/error_codes.go`. `code` is the contract and the
 * only thing to branch on; `message` is for people and is never parsed.
 *
 * A code the backend adds later still arrives readable: it lands on `UNKNOWN`
 * and keeps the message the API sent with it.
 */
export const API_ERROR_CODES = [
  /* generic */
  "INTERNAL_ERROR",
  "VALIDATION_ERROR",
  "BAD_REQUEST",
  "INVALID_PARAM",
  "INVALID_INPUT",
  "NOT_FOUND",
  "CONFLICT",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "TOO_MANY_REQUESTS",
  "REQUEST_TIMEOUT",
  "ROUTE_NOT_FOUND",
  "METHOD_NOT_ALLOWED",
  "DB_UNAVAILABLE",

  /* auth */
  "AUTH_INVALID_CREDENTIALS",
  "AUTH_ACCOUNT_LOCKED",
  "AUTH_TOKEN_MISSING",
  "AUTH_TOKEN_INVALID",
  "AUTH_TOKEN_EXPIRED",
  "AUTH_INVALID_OTP",
  "AUTH_OTP_MAX_ATTEMPTS",
  "AUTH_RESET_REQUESTED_TOO_SOON",

  /* user */
  "USER_NOT_FOUND",
  "USER_EMAIL_TAKEN",
  "USER_INVALID_ROLE",
  "USER_INVALID_DATA",

  /* category */
  "CATEGORY_NOT_FOUND",
  "CATEGORY_NAME_TAKEN",
  "CATEGORY_INVALID_TYPE",
  "CATEGORY_INVALID_DATA",

  /* wallet */
  "WALLET_NOT_FOUND",
  "WALLET_NAME_TAKEN",
  "WALLET_INVALID_DATA",
  "WALLET_INVALID_TYPE",
  "WALLET_INVALID_CURRENCY",
  "WALLET_INVALID_CARD",

  /* role */
  "ROLE_NOT_FOUND",
  "ROLE_NAME_TAKEN",
  "ROLE_SYSTEM_IMMUTABLE",
  "ROLE_INVALID_MENU",
  "ROLE_INVALID_DATA",

  /* menu and audit log */
  "MENU_NOT_FOUND",
  "AUDIT_LOG_NOT_FOUND",

  /** The request never reached the API. */
  "UNREACHABLE",
  /** It answered, but not with a body this client recognises. */
  "UNREADABLE",
  /** It answered with a code released after this list was written. */
  "UNKNOWN",
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
  /** Matches `X-Request-ID` and the server log line. "" when none was sent. */
  readonly requestId: string;
  /** Seconds off the `Retry-After` header; 0 when the failure has no wait. */
  readonly retryAfterSeconds: number;
};

export type ApiResult<T> =
  | {
      readonly ok: true;
      readonly data: T;
      readonly message: string;
      readonly meta: ApiMeta | null;
    }
  | { readonly ok: false; readonly error: ApiFailure };

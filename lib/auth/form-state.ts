import type { ApiErrorCode, ApiFailure } from "@/types/api";

/** What an auth Server Action hands back to its form. */
export type AuthFormState = {
  /** A form-level failure, or "" when there is none. */
  readonly error: string;
  /** A form-level confirmation, e.g. after the OTP has gone out. */
  readonly notice: string;
  /** Backend validation errors, keyed by the input's `name`. */
  readonly fieldErrors: Readonly<Record<string, string>>;
  /** The non-secret values that were submitted. */
  readonly values: Readonly<Record<string, string>>;
};

export const IDLE_AUTH_STATE: AuthFormState = {
  error: "",
  notice: "",
  fieldErrors: {},
  values: {},
};

/** Shared by every code that means "the fields tell you what is wrong". */
const CHECK_FIELDS = "Check the highlighted fields and try again.";

/** A session that has to be started again, whichever way it ended. */
const SESSION_OVER = "Your session has ended. Sign in again.";

/**
 * Wording for the failures a person actually meets, keyed by the backend's
 * code. A code with no entry here falls through to the message the API sent,
 * which is written to be safe to show.
 */
const MESSAGE_BY_CODE: Partial<Readonly<Record<ApiErrorCode, string>>> = {
  /* auth */
  AUTH_INVALID_CREDENTIALS: "That email and password do not match an account.",
  AUTH_INVALID_OTP:
    "That code is not valid or has expired. Check it, or request a new one.",
  AUTH_OTP_MAX_ATTEMPTS:
    "Too many attempts on that code. Request a new one to continue.",
  AUTH_TOKEN_MISSING: SESSION_OVER,
  AUTH_TOKEN_EXPIRED: SESSION_OVER,
  AUTH_TOKEN_INVALID: "Your session is no longer valid. Sign in again.",
  UNAUTHORIZED: SESSION_OVER,
  FORBIDDEN: "Your role is not allowed to do that.",

  /* the access editors */
  USER_EMAIL_TAKEN: "An account with that email already exists.",
  USER_INVALID_ROLE: "Pick a role that still exists, then save again.",
  USER_INVALID_DATA: CHECK_FIELDS,
  ROLE_NAME_TAKEN: "A role with that name already exists.",
  ROLE_SYSTEM_IMMUTABLE: "That is a built-in role and cannot be changed.",
  ROLE_INVALID_MENU: "One of the selected menus no longer exists. Reload the page.",
  ROLE_INVALID_DATA: CHECK_FIELDS,

  /* the category editor */
  CATEGORY_NAME_TAKEN: "A category already goes by that name.",
  CATEGORY_NOT_FOUND: "That category no longer exists. Reload the page.",
  CATEGORY_INVALID_TYPE: "A category is either income or expense.",
  CATEGORY_INVALID_MASTER:
    "That master category no longer exists. Reload the page.",
  CATEGORY_INVALID_DATA: CHECK_FIELDS,

  /* the wallet editor */
  WALLET_NAME_TAKEN: "A wallet with that name already exists.",
  WALLET_NOT_FOUND: "That wallet no longer exists. Reload the page.",
  WALLET_INVALID_TYPE: "Pick one of the wallet types offered.",
  WALLET_INVALID_CURRENCY: "Pick one of the currencies offered.",
  WALLET_INVALID_CARD:
    "A credit limit and a statement day belong to a credit card only.",
  WALLET_INVALID_DATA: CHECK_FIELDS,

  /* generic */
  VALIDATION_ERROR: CHECK_FIELDS,
  INVALID_INPUT: CHECK_FIELDS,
  INVALID_PARAM: "That address is not valid. Go back and try again.",
  CONFLICT: "That already exists.",
  NOT_FOUND: "That record no longer exists. Reload the page.",
  USER_NOT_FOUND: "That account no longer exists. Reload the page.",
  ROLE_NOT_FOUND: "That role no longer exists. Reload the page.",
  REQUEST_TIMEOUT: "The server took too long to answer. Try again.",
  DB_UNAVAILABLE: "The service is briefly unavailable. Try again shortly.",
  INTERNAL_ERROR: "Something went wrong on our side. Try again in a moment.",
  UNREADABLE: "The API answered in a way we did not expect. Try again.",
};

/**
 * Codes the backend answers with a `Retry-After`. Each is the sentence up to
 * the wait, so the real remaining time finishes it.
 */
const WAIT_LEAD: Partial<Readonly<Record<ApiErrorCode, string>>> = {
  AUTH_ACCOUNT_LOCKED: "Too many failed sign-ins. This account is locked, try",
  AUTH_RESET_REQUESTED_TOO_SOON: "A code was just sent. Ask for another",
  TOO_MANY_REQUESTS: "Too many requests. Try again",
};

const SECONDS_PER_MINUTE = 60;

/** "in 45 seconds" / "in about 4 minutes" / "in a moment" when none was given. */
function formatWait(seconds: number): string {
  if (seconds <= 0) {
    return "in a moment";
  }
  if (seconds < SECONDS_PER_MINUTE) {
    return `in ${seconds} seconds`;
  }

  const minutes = Math.ceil(seconds / SECONDS_PER_MINUTE);
  return minutes === 1 ? "in about a minute" : `in about ${minutes} minutes`;
}

/**
 * The backend repeats the log's request id in the error body so one screenshot
 * finds the line. Worth showing only when the fault was on their side.
 */
function withReference(message: string, requestId: string): string {
  return requestId ? `${message} Reference ${requestId}.` : message;
}

function messageFor(
  failure: ApiFailure,
  overrides: Partial<Readonly<Record<ApiErrorCode, string>>>,
): string {
  const override = overrides[failure.code];
  if (override) {
    return override;
  }

  const lead = WAIT_LEAD[failure.code];
  if (lead) {
    return `${lead} ${formatWait(failure.retryAfterSeconds)}.`;
  }

  const known = MESSAGE_BY_CODE[failure.code] ?? failure.message;
  return failure.code === "INTERNAL_ERROR"
    ? withReference(known, failure.requestId)
    : known;
}

function fieldErrorsOf(failure: ApiFailure): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const entry of failure.fieldErrors) {
    errors[entry.field] = entry.message;
  }
  return errors;
}

/** Turns a rejected API call into the state its form renders. */
export function failureState(
  failure: ApiFailure,
  values: Readonly<Record<string, string>> = {},
  overrides: Partial<Readonly<Record<ApiErrorCode, string>>> = {},
): AuthFormState {
  return {
    error: messageFor(failure, overrides),
    notice: "",
    fieldErrors: fieldErrorsOf(failure),
    values,
  };
}

/** A failure the form found itself, before the API was ever called. */
export function localFailureState(
  error: string,
  fieldErrors: Readonly<Record<string, string>>,
  values: Readonly<Record<string, string>> = {},
): AuthFormState {
  return { error, notice: "", fieldErrors, values };
}

/** A step that succeeded but keeps the user on the same form. */
export function noticeState(
  notice: string,
  values: Readonly<Record<string, string>> = {},
): AuthFormState {
  return { error: "", notice, fieldErrors: {}, values };
}

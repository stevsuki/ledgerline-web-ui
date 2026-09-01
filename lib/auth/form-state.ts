import type { ApiErrorCode, ApiFailure } from "@/types/api";

/**
 * What an auth Server Action hands back to its form.
 *
 * This module is imported from both sides of the boundary — the actions build
 * the state, the client forms render it — so it holds no `next/headers` and no
 * `"use server"` directive.
 */
export type AuthFormState = {
  /** A form-level failure, or "" when there is none. */
  readonly error: string;
  /** A form-level confirmation, e.g. after the OTP has gone out. */
  readonly notice: string;
  /** Backend validation errors, keyed by the input's `name`. */
  readonly fieldErrors: Readonly<Record<string, string>>;
  /**
   * The non-secret values that were submitted. React clears an uncontrolled
   * form once its action resolves, so they are echoed back and re-applied as
   * `defaultValue` — otherwise a rejected sign-in would also wipe the email.
   */
  readonly values: Readonly<Record<string, string>>;
};

export const IDLE_AUTH_STATE: AuthFormState = {
  error: "",
  notice: "",
  fieldErrors: {},
  values: {},
};

/**
 * Wording for the failures a person actually meets. Anything not listed keeps
 * the backend's own message, which is already written for a reader.
 */
const MESSAGE_BY_CODE: Partial<Readonly<Record<ApiErrorCode, string>>> = {
  INVALID_CREDENTIALS: "That email and password do not match an account.",
  CONFLICT: "An account with that email already exists.",
  VALIDATION_ERROR: "Check the highlighted fields and try again.",
  INVALID_OTP: "That code is not valid. Check it and try again.",
  MAX_ATTEMPTS_EXCEEDED:
    "Too many attempts on that code. Request a new one to continue.",
  TOO_MANY_REQUESTS: "Too many requests. Wait a moment, then try again.",
  TOKEN_EXPIRED: "That link has expired. Start the reset again.",
  TOKEN_INVALID: "That link is no longer valid. Start the reset again.",
  UNAUTHORIZED: "Your session has ended. Sign in again.",
  FORBIDDEN: "Your role is not allowed to do that.",
  INTERNAL_ERROR: "Something went wrong on our side. Try again in a moment.",
  UNREADABLE: "The API answered in a way we did not expect. Try again.",
};

function fieldErrorsOf(failure: ApiFailure): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const entry of failure.fieldErrors) {
    errors[entry.field] = entry.message;
  }
  return errors;
}

/**
 * Turns a rejected API call into the state its form renders.
 *
 * `overrides` is for a code whose meaning depends on the card it lands on:
 * `UNAUTHORIZED` is a lapsed session on the sign-in card, but a stale grant
 * on the reset card, where there is no session to have lapsed.
 */
export function failureState(
  failure: ApiFailure,
  values: Readonly<Record<string, string>> = {},
  overrides: Partial<Readonly<Record<ApiErrorCode, string>>> = {},
): AuthFormState {
  return {
    error:
      overrides[failure.code] ??
      MESSAGE_BY_CODE[failure.code] ??
      failure.message,
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

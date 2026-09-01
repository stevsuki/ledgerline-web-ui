/**
 * The names on the auth inputs.
 *
 * They are the backend's json tags on purpose: a `VALIDATION_ERROR` names the
 * field it rejected, so keeping the two vocabularies identical means the error
 * lands under the right input with no translation table in between.
 */
export const FIELD = {
  email: "email",
  fullName: "full_name",
  password: "password",
  otp: "otp",
  newPassword: "new_password",
  confirmNewPassword: "confirm_new_password",
  currency: "currency",
  remember: "remember",
  terms: "terms",
  /** Which of the reset card's two buttons was pressed. */
  intent: "intent",
  /** Where to go once the sign-in succeeds. */
  returnTo: "next",
} as const;

/** The backend's `binding:"min=8,max=72"` on every password field. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/** The backend's `OTP_LENGTH`. */
export const OTP_LENGTH = 6;

/** The backend's `OTP_TTL`, written out for the reset card's intro line. */
export const OTP_VALIDITY_LABEL = "10 minutes";

/** The backend's `binding:"min=3,max=100"` on `full_name`. */
export const FULL_NAME_MIN_LENGTH = 3;
export const FULL_NAME_MAX_LENGTH = 100;

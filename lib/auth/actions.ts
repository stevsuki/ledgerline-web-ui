"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  login,
  registerAccount,
  requestPasswordOtp,
  resetPassword,
  verifyPasswordOtp,
} from "@/lib/api/auth";
import { FIELD, OTP_VALIDITY_LABEL } from "@/lib/auth/fields";
import {
  failureState,
  localFailureState,
  noticeState,
  type AuthFormState,
} from "@/lib/auth/form-state";
import { resetStepHref, safeReturnPath, signInHref } from "@/lib/auth/routes";
import {
  clearResetGrant,
  endSession,
  readResetGrant,
  saveResetGrant,
  startSession,
} from "@/lib/auth/session";
import type { ApiErrorCode } from "@/types/api";

/** Every auth mutation the UI can perform. */

/** A checkbox with no `value` posts this when it is ticked. */
const CHECKED = "on";

/** After a session change the whole tree is stale — nav, header, avatar. */
const ROOT_PATH = "/";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Passwords are read untrimmed: trimming one would silently change it. */
function secret(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/* ── sign in ───────────────────────────────────────────────────────────── */

export async function signInAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = text(formData, FIELD.email);
  const result = await login({
    email,
    password: secret(formData, FIELD.password),
  });

  if (!result.ok) {
    return failureState(result.error, { [FIELD.email]: email });
  }

  await startSession(result.data, formData.get(FIELD.remember) === CHECKED);
  revalidatePath(ROOT_PATH, "layout");
  redirect(safeReturnPath(text(formData, FIELD.returnTo)));
}

export async function signOutAction(): Promise<void> {
  await endSession();
  revalidatePath(ROOT_PATH, "layout");
  redirect(signInHref(undefined, "signed-out"));
}

/* ── register ──────────────────────────────────────────────────────────── */

export async function registerAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = text(formData, FIELD.email);
  const fullName = text(formData, FIELD.fullName);
  const values = { [FIELD.email]: email, [FIELD.fullName]: fullName };

  // Checked on the server as well as in the browser.
  if (formData.get(FIELD.terms) !== CHECKED) {
    return localFailureState(
      "You need to accept the terms before an account can be created.",
      { [FIELD.terms]: "Required." },
      values,
    );
  }

  const result = await registerAccount({
    email,
    fullName,
    password: secret(formData, FIELD.password),
  });

  if (!result.ok) {
    return failureState(result.error, values);
  }

  // The backend returns the new user, not a token pair.
  redirect(signInHref(undefined, "registered"));
}

/* ── reset, leg one: claim the email, prove the OTP ────────────────────── */

const SEND_INTENT = "send";

async function sendOtpStep(formData: FormData): Promise<AuthFormState> {
  const email = text(formData, FIELD.email);
  const values = { [FIELD.email]: email };

  const result = await requestPasswordOtp(email);
  if (!result.ok) {
    return failureState(result.error, values);
  }

  return noticeState(
    `Code sent to ${email}. It expires in ${OTP_VALIDITY_LABEL}.`,
    values,
  );
}

async function verifyOtpStep(formData: FormData): Promise<AuthFormState> {
  const email = text(formData, FIELD.email);
  const otp = text(formData, FIELD.otp);

  const result = await verifyPasswordOtp({ email, otp });
  if (!result.ok) {
    return failureState(result.error, {
      [FIELD.email]: email,
      [FIELD.otp]: otp,
    });
  }

  await saveResetGrant(result.data);
  redirect(resetStepHref("reset"));
}

/** One action for one card. The card carries both the email and the OTP. */
export async function resetRequestAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (text(formData, FIELD.intent) === SEND_INTENT) {
    return sendOtpStep(formData);
  }
  return verifyOtpStep(formData);
}

/** On this card a rejected grant is a stale link, not a lapsed session. */
const RESET_GRANT_MESSAGES: Partial<Readonly<Record<ApiErrorCode, string>>> = {
  UNAUTHORIZED:
    "That reset is no longer valid. Request a new code to continue.",
};

/* ── reset, leg two: the new password ──────────────────────────────────── */

export async function updatePasswordAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const newPassword = secret(formData, FIELD.newPassword);
  const confirmNewPassword = secret(formData, FIELD.confirmNewPassword);

  // Caught here rather than at the API.
  if (newPassword !== confirmNewPassword) {
    return localFailureState("The two passwords do not match.", {
      [FIELD.confirmNewPassword]: "This does not match the new password.",
    });
  }

  const resetToken = await readResetGrant();
  if (!resetToken) {
    return localFailureState(
      "That reset has expired. Request a new code to continue.",
      {},
    );
  }

  const result = await resetPassword({
    resetToken,
    newPassword,
    confirmNewPassword,
  });
  if (!result.ok) {
    return failureState(result.error, {}, RESET_GRANT_MESSAGES);
  }

  await clearResetGrant();
  redirect(signInHref(undefined, "password-updated"));
}

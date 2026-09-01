"use client";

import { useActionState } from "react";

import { FormFeedback } from "@/components/auth/form-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import { TextField } from "@/components/ui/form";
import { updatePasswordAction } from "@/lib/auth/actions";
import {
  FIELD,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth/fields";
import { IDLE_AUTH_STATE } from "@/lib/auth/form-state";

/** Leg two of the reset. The grant earned by the OTP is not in this form. */
export function NewPasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    IDLE_AUTH_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormFeedback state={state} />

      <TextField
        id="reset-new-password"
        name={FIELD.newPassword}
        label="New password"
        type="password"
        placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_LENGTH}
        error={state.fieldErrors[FIELD.newPassword]}
      />
      <TextField
        id="reset-confirm-password"
        name={FIELD.confirmNewPassword}
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_LENGTH}
        error={state.fieldErrors[FIELD.confirmNewPassword]}
      />

      <SubmitButton pending={pending} pendingLabel="Updating…">
        Update password
      </SubmitButton>
    </form>
  );
}

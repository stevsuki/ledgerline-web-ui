"use client";

import { useActionState } from "react";

import { FormFeedback } from "@/components/auth/form-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import { TextField } from "@/components/ui/form";
import { resetRequestAction } from "@/lib/auth/actions";
import { FIELD, OTP_LENGTH } from "@/lib/auth/fields";
import { IDLE_AUTH_STATE } from "@/lib/auth/form-state";

/**
 * Leg one of the reset: claim the email, then prove the code sent to it.
 *
 * Both backend calls need the email, so both buttons submit the same form and
 * say which leg they mean through `name="intent"`. One form, one action, one
 * `useActionState` — and the email typed for the OTP is the email verified
 * against it, with no chance of the two drifting apart.
 */
export function ResetRequestForm() {
  const [state, formAction, pending] = useActionState(
    resetRequestAction,
    IDLE_AUTH_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormFeedback state={state} />

      {/* The send button sits on the field's baseline: `.input` and `.btn`
          share the 38px control height, and `.field-offset` clears the label. */}
      <div className="flex items-start gap-2">
        <TextField
          id="reset-email"
          name={FIELD.email}
          label="Email"
          type="email"
          placeholder="you@studio.id"
          autoComplete="email"
          required
          className="flex-1"
          defaultValue={state.values[FIELD.email]}
          error={state.fieldErrors[FIELD.email]}
        />
        <SubmitButton
          pending={pending}
          pendingLabel="Sending…"
          className="btn btn-secondary field-offset flex-none"
          name={FIELD.intent}
          value="send"
          formNoValidate
        >
          Send OTP
        </SubmitButton>
      </div>

      <TextField
        id="reset-code"
        name={FIELD.otp}
        label="OTP code"
        placeholder="000000"
        autoComplete="one-time-code"
        inputMode="numeric"
        required
        maxLength={OTP_LENGTH}
        minLength={OTP_LENGTH}
        inputClassName="text-center text-[19px] tracking-[0.4em] tabular-nums"
        defaultValue={state.values[FIELD.otp]}
        error={state.fieldErrors[FIELD.otp]}
      />

      <SubmitButton
        pending={pending}
        pendingLabel="Checking…"
        name={FIELD.intent}
        value="verify"
      >
        Continue
      </SubmitButton>
    </form>
  );
}

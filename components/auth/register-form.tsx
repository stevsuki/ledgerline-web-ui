"use client";

import { useActionState } from "react";

import { FormFeedback } from "@/components/auth/form-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import { SelectField, TextField, ToggleRow } from "@/components/ui/form";
import { registerAction } from "@/lib/auth/actions";
import {
  FIELD,
  FULL_NAME_MAX_LENGTH,
  FULL_NAME_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth/fields";
import { IDLE_AUTH_STATE } from "@/lib/auth/form-state";

/**
 * The register card's fields.
 *
 * The backend takes email, full name and password. The currency choice is on
 * the card because the artboard puts it there, but `/auth/register` has no
 * field for it yet, so it is not sent — it lands with the account preferences
 * once the backend grows them.
 */
const CURRENCIES = ["IDR — Rupiah", "USD — US Dollar"] as const;

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerAction,
    IDLE_AUTH_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormFeedback state={state} />

      <TextField
        id="register-name"
        name={FIELD.fullName}
        label="Full name"
        placeholder="Rangga Aditama"
        autoComplete="name"
        required
        minLength={FULL_NAME_MIN_LENGTH}
        maxLength={FULL_NAME_MAX_LENGTH}
        defaultValue={state.values[FIELD.fullName]}
        error={state.fieldErrors[FIELD.fullName]}
      />
      <TextField
        id="register-email"
        name={FIELD.email}
        label="Email"
        type="email"
        placeholder="you@studio.id"
        autoComplete="email"
        required
        defaultValue={state.values[FIELD.email]}
        error={state.fieldErrors[FIELD.email]}
      />
      <TextField
        id="register-password"
        name={FIELD.password}
        label="Password"
        type="password"
        placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_LENGTH}
        error={state.fieldErrors[FIELD.password]}
      />
      <SelectField
        id="register-currency"
        name={FIELD.currency}
        label="Primary currency"
        options={CURRENCIES}
      />
      <ToggleRow
        id="register-terms"
        name={FIELD.terms}
        label="I agree to the terms and privacy policy"
        labelFirst={false}
        required
      />

      <SubmitButton pending={pending} pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}

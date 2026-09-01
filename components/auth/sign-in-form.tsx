"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormFeedback } from "@/components/auth/form-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import { TextField, ToggleRow } from "@/components/ui/form";
import { signInAction } from "@/lib/auth/actions";
import {
  FIELD,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth/fields";
import { IDLE_AUTH_STATE } from "@/lib/auth/form-state";
import { RESET_PASSWORD_PATH } from "@/lib/auth/routes";

/** The sign-in card's fields. */
export function SignInForm({ returnTo }: { readonly returnTo: string }) {
  const [state, formAction, pending] = useActionState(
    signInAction,
    IDLE_AUTH_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormFeedback state={state} />

      <input type="hidden" name={FIELD.returnTo} value={returnTo} />

      <TextField
        id="signin-email"
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
        id="signin-password"
        name={FIELD.password}
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_LENGTH}
        error={state.fieldErrors[FIELD.password]}
      />

      <div className="flex items-center justify-between">
        <ToggleRow
          id="signin-remember"
          name={FIELD.remember}
          label="Keep me signed in"
          labelFirst={false}
          defaultChecked
        />
        <Link href={RESET_PASSWORD_PATH} className="btn btn-ghost text-note">
          Forgot?
        </Link>
      </div>

      <SubmitButton pending={pending} pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}

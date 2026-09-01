import type { Metadata } from "next";

import { AuthCard, AuthDivider } from "@/components/auth/auth-card";
import { FormBanner } from "@/components/auth/form-feedback";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Icon } from "@/components/ui/icon";
import {
  AUTH_STATUSES,
  RETURN_PARAM,
  STATUS_PARAM,
  safeReturnPath,
  type AuthStatus,
} from "@/lib/auth/routes";
import { WORKSPACE } from "@/lib/nav";
import { readOption, readText } from "@/lib/search-params";

export const metadata: Metadata = { title: "Sign in" };

/**
 * What the card says after arriving from somewhere else. `none` is the first
 * entry of `AUTH_STATUSES`, so an absent or unknown `?status=` says nothing.
 */
const NOTICE_BY_STATUS: Partial<Readonly<Record<AuthStatus, string>>> = {
  registered: "Account created. Sign in to open your workspace.",
  "password-updated": "Password updated. Sign in with the new one.",
  "signed-out": "You are signed out.",
  "session-expired": "Your session ended. Sign in again to pick up where you left off.",
};

export default async function SignInPage(
  props: Readonly<PageProps<"/sign-in">>,
) {
  const params = await props.searchParams;
  const notice =
    NOTICE_BY_STATUS[readOption(params, STATUS_PARAM, AUTH_STATUSES)];

  return (
    <AuthCard showBrand title="Sign in" intro={WORKSPACE.tagline}>
      {notice ? <FormBanner tone="notice" message={notice} /> : null}

      <SignInForm returnTo={safeReturnPath(readText(params, RETURN_PARAM))} />

      <AuthDivider />

      {/* The artboard draws this, and the backend has no OAuth exchange behind
          it yet — so it is shown in the state that says so rather than wired
          to a route that would only bounce back here. */}
      <button
        type="button"
        disabled
        title="Google sign-in is not connected yet"
        className="btn btn-secondary btn-block"
      >
        <Icon name="globe" size={15} />
        Continue with Google
      </button>
    </AuthCard>
  );
}

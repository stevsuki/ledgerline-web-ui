import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { fetchProfile } from "@/lib/api/auth";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  RESET_COOKIE,
  SESSION_COOKIES,
  sessionCookieOptions,
  sessionCookieWrites,
} from "@/lib/auth/cookies";
import { signInHref } from "@/lib/auth/routes";
import type { AuthTokens, Profile, ResetGrant } from "@/types/auth";

/**
 * The session, read and written on the server.
 *
 * Reads work anywhere; writes only work where Next allows a cookie to be set —
 * a Server Action or `proxy.ts` — which is why `startSession` and friends are
 * called from `lib/auth/actions.ts` and nowhere else.
 */

/** Floor for the reset grant, in case the API reports no lifetime. */
const MIN_RESET_MAX_AGE_SECONDS = 60;

export async function startSession(
  tokens: AuthTokens,
  persistent: boolean,
): Promise<void> {
  const store = await cookies();
  for (const write of sessionCookieWrites(tokens, persistent)) {
    store.set(write.name, write.value, write.options);
  }
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  for (const name of SESSION_COOKIES) {
    store.delete(name);
  }
}

export async function readAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function hasRefreshToken(): Promise<boolean> {
  const store = await cookies();
  return Boolean(store.get(REFRESH_COOKIE)?.value);
}

/* ── the password-reset grant ──────────────────────────────────────────── */

/**
 * The grant never reaches the browser as a readable value: it is parked in an
 * http-only cookie between the OTP step and the new-password step, so the
 * second form does not have to carry it in a hidden input.
 */
export async function saveResetGrant(grant: ResetGrant): Promise<void> {
  const store = await cookies();
  store.set(
    RESET_COOKIE,
    grant.resetToken,
    sessionCookieOptions(Math.max(grant.expiresIn, MIN_RESET_MAX_AGE_SECONDS)),
  );
}

export async function readResetGrant(): Promise<string | null> {
  const store = await cookies();
  return store.get(RESET_COOKIE)?.value ?? null;
}

export async function clearResetGrant(): Promise<void> {
  const store = await cookies();
  store.delete(RESET_COOKIE);
}

/* ── who is signed in ──────────────────────────────────────────────────── */

/**
 * The one place the app asks who the caller is.
 *
 * `proxy.ts` only glances at the cookie; this asks the backend, which is what
 * makes it authoritative. React's `cache` collapses every call made while one
 * request renders into a single `/auth/me`.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const accessToken = await readAccessToken();
  if (!accessToken) {
    return null;
  }

  const result = await fetchProfile(accessToken);
  return result.ok ? result.data : null;
});

/**
 * Guard for anything behind the gate, returning the sidebar with the account:
 * every screen needs both, and `cache` means they cost one `/auth/me` between
 * them however many components ask.
 */
export async function requireProfile(returnTo?: string): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) {
    redirect(signInHref(returnTo, "session-expired"));
  }
  return profile;
}

/**
 * The token every call to the API carries. A caller that gets here without one
 * has no session left, so it lands on the sign-in card like any other
 * unauthenticated request rather than sending the backend an empty header.
 */
export async function requireAccessToken(): Promise<string> {
  const accessToken = await readAccessToken();
  if (!accessToken) {
    redirect(signInHref(undefined, "session-expired"));
  }
  return accessToken;
}

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
import type { ApiErrorCode } from "@/types/api";
import type { AuthTokens, Profile, ResetGrant } from "@/types/auth";

/** The session, read and written on the server. */

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

/** The grant never reaches the browser as a readable value. */
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
 * Codes that mean the session itself is over. Anything else — a 500, a timeout,
 * an unreachable API — is the backend being unwell, and must not be mistaken
 * for a lapsed sign-in: the backend stopped answering 401 for those on purpose.
 */
const SESSION_ENDED_CODES: readonly ApiErrorCode[] = [
  "AUTH_TOKEN_MISSING",
  "AUTH_TOKEN_INVALID",
  "AUTH_TOKEN_EXPIRED",
  "UNAUTHORIZED",
];

type ProfileResult =
  | { readonly ok: true; readonly profile: Profile }
  | { readonly ok: false; readonly sessionEnded: boolean; readonly reason: string };

/** The one place the app asks who the caller is. */
const loadProfile = cache(async (): Promise<ProfileResult> => {
  const accessToken = await readAccessToken();
  if (!accessToken) {
    return { ok: false, sessionEnded: true, reason: "no access token" };
  }

  const result = await fetchProfile(accessToken);
  if (result.ok) {
    return { ok: true, profile: result.data };
  }

  return {
    ok: false,
    sessionEnded: SESSION_ENDED_CODES.includes(result.error.code),
    reason: `${result.error.code}: ${result.error.message}`,
  };
});

/** For callers that treat "not signed in" and "cannot tell" the same way. */
export async function getProfile(): Promise<Profile | null> {
  const result = await loadProfile();
  return result.ok ? result.profile : null;
}

/** Guard for anything behind the gate, returning the sidebar with the account. */
export async function requireProfile(returnTo?: string): Promise<Profile> {
  const result = await loadProfile();
  if (result.ok) {
    return result.profile;
  }

  if (result.sessionEnded) {
    redirect(signInHref(returnTo, "session-expired"));
  }

  // Sending them to sign-in would be a lie, and the proxy would bounce them
  // straight back here while the cookie is still good. Let the boundary show.
  throw new Error(`/auth/me failed — ${result.reason}`);
}

/** The token every call to the API carries. */
export async function requireAccessToken(): Promise<string> {
  const accessToken = await readAccessToken();
  if (!accessToken) {
    redirect(signInHref(undefined, "session-expired"));
  }
  return accessToken;
}

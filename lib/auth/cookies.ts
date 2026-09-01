import type { AuthTokens } from "@/types/auth";

/**
 * Where the session lives, and for how long.
 *
 * Kept free of `next/headers` on purpose: `proxy.ts` writes these cookies onto
 * a `NextResponse` while the Server Actions write them through the cookie
 * store, and both need the same names and the same options.
 *
 * All four are http-only. They are credentials, not display preferences —
 * unlike the theme and rail cookies in `lib/preferences.ts`, no browser script
 * ever reads them.
 */

export const ACCESS_COOKIE = "ll-access";
export const REFRESH_COOKIE = "ll-refresh";
export const RESET_COOKIE = "ll-reset";

/**
 * Records that the person ticked "Keep me signed in". Without it the refresh
 * token is a session cookie that dies with the browser, and the proxy needs to
 * know which of the two it is renewing.
 */
export const PERSIST_COOKIE = "ll-persist";
export const PERSIST_VALUE = "1";

/** Mirrors the backend's `JWT_REFRESH_TOKEN_TTL` (168h). */
export const REFRESH_MAX_AGE_SECONDS = 168 * 60 * 60;

/**
 * Retire the access cookie a little before the token itself dies, so a request
 * that is already in flight cannot arrive at the API with an expired token.
 */
const EXPIRY_SKEW_SECONDS = 30;

/** Floor for the access cookie, in case the API reports no lifetime at all. */
const MIN_ACCESS_MAX_AGE_SECONDS = 60;

export type SessionCookieOptions = {
  readonly httpOnly: true;
  readonly sameSite: "lax";
  readonly path: "/";
  readonly secure: boolean;
  /** Left off to make it a session cookie, gone when the browser closes. */
  readonly maxAge?: number;
};

export type CookieWrite = {
  readonly name: string;
  readonly value: string;
  readonly options: SessionCookieOptions;
};

export function sessionCookieOptions(maxAge?: number): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

function accessMaxAge(expiresIn: number): number {
  return Math.max(expiresIn - EXPIRY_SKEW_SECONDS, MIN_ACCESS_MAX_AGE_SECONDS);
}

/**
 * The cookies that make up a signed-in session.
 *
 * The access cookie always carries a `maxAge`: its own expiry is what tells
 * the proxy to go and refresh. Only the refresh cookie answers to the
 * "keep me signed in" choice.
 */
export function sessionCookieWrites(
  tokens: AuthTokens,
  persistent: boolean,
): readonly CookieWrite[] {
  const writes: CookieWrite[] = [
    {
      name: ACCESS_COOKIE,
      value: tokens.accessToken,
      options: sessionCookieOptions(accessMaxAge(tokens.expiresIn)),
    },
    {
      name: REFRESH_COOKIE,
      value: tokens.refreshToken,
      options: sessionCookieOptions(
        persistent ? REFRESH_MAX_AGE_SECONDS : undefined,
      ),
    },
  ];

  if (persistent) {
    writes.push({
      name: PERSIST_COOKIE,
      value: PERSIST_VALUE,
      options: sessionCookieOptions(REFRESH_MAX_AGE_SECONDS),
    });
  }

  return writes;
}

/** Everything `endSession` and a failed refresh have to clear. */
export const SESSION_COOKIES = [
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  RESET_COOKIE,
  PERSIST_COOKIE,
] as const;

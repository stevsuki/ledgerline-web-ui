import type { AuthTokens } from "@/types/auth";

/** Where the session lives, and for how long. */

export const ACCESS_COOKIE = "ll-access";
export const REFRESH_COOKIE = "ll-refresh";
export const RESET_COOKIE = "ll-reset";

/** Records that the person ticked "Keep me signed in". */
export const PERSIST_COOKIE = "ll-persist";
export const PERSIST_VALUE = "1";

/** Mirrors the backend's `JWT_REFRESH_TOKEN_TTL` (168h). */
export const REFRESH_MAX_AGE_SECONDS = 168 * 60 * 60;

/** Retire the access cookie a little before the token itself dies. */
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

/** The cookies that make up a signed-in session. */
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

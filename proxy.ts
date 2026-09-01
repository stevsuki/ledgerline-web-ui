import { NextResponse, type NextRequest } from "next/server";

import { refreshTokens } from "@/lib/api/auth";
import {
  ACCESS_COOKIE,
  PERSIST_COOKIE,
  PERSIST_VALUE,
  REFRESH_COOKIE,
  SESSION_COOKIES,
  sessionCookieWrites,
} from "@/lib/auth/cookies";
import {
  HOME_PATH,
  STATUS_PARAM,
  isPublicPath,
  signInHref,
} from "@/lib/auth/routes";
import type { AuthTokens } from "@/types/auth";

/**
 * The gate in front of every route.
 *
 * Next 16 renamed this file convention from `middleware` to `proxy`; the job
 * is the same one middleware always did — run before the request is served,
 * and redirect or rewrite it.
 *
 * Two things happen here and nowhere else:
 *
 * 1. An optimistic check. It reads the cookie, never `/auth/me` — this runs on
 *    every request, so it stays cheap. The authoritative check is
 *    `requireUser()` in `lib/auth/session.ts`, which sits next to the data.
 * 2. The token refresh. The access token lives 15 minutes and the refresh
 *    token a week, and a Server Component may not write a cookie — so this is
 *    the only place that can notice an expired access token and quietly
 *    replace the pair before the page renders.
 */

/**
 * What `requireUser()` puts on the sign-in URL when the API rejects a token
 * the browser still holds. Without noticing it, this file would send the
 * visitor straight back to a page that redirects here again — a Server
 * Component cannot clear a cookie, so the clearing has to happen here.
 */
const REJECTED_SESSION = "session-expired";

const PREFETCH_HEADER = "next-router-prefetch";
const PURPOSE_HEADER = "purpose";
const PREFETCH_PURPOSE = "prefetch";

/** No body, so the router keeps nothing and re-asks on a real navigation. */
const NO_CONTENT = 204;

function isPrefetch(request: NextRequest): boolean {
  return (
    request.headers.get(PREFETCH_HEADER) === "1" ||
    request.headers.get(PURPOSE_HEADER) === PREFETCH_PURPOSE
  );
}

function isRejectedSession(request: NextRequest): boolean {
  return request.nextUrl.searchParams.get(STATUS_PARAM) === REJECTED_SESSION;
}

function currentPath(request: NextRequest): string {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

function redirectTo(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.nextUrl));
}

function applyTokens(
  response: NextResponse,
  tokens: AuthTokens,
  persistent: boolean,
): NextResponse {
  for (const write of sessionCookieWrites(tokens, persistent)) {
    response.cookies.set(write.name, write.value, write.options);
  }
  return response;
}

function clearSession(response: NextResponse): NextResponse {
  for (const name of SESSION_COOKIES) {
    response.cookies.delete(name);
  }
  return response;
}

/** The access token is gone but a refresh token is still on hand. */
async function renewSession(
  request: NextRequest,
  refreshToken: string,
  isPublic: boolean,
): Promise<NextResponse> {
  // A prefetch must not be answered from a stale session: refreshing on every
  // hovered link would stampede the API, and letting the page render would
  // cache a redirect to sign-in for a visitor who is in fact still signed in.
  if (isPrefetch(request)) {
    return new NextResponse(null, { status: NO_CONTENT });
  }

  const renewed = await refreshTokens(refreshToken);
  if (!renewed.ok) {
    return clearSession(
      isPublic
        ? NextResponse.next()
        : redirectTo(request, signInHref(currentPath(request), "session-expired")),
    );
  }

  return applyTokens(
    isPublic ? redirectTo(request, HOME_PATH) : NextResponse.next(),
    renewed.data,
    request.cookies.get(PERSIST_COOKIE)?.value === PERSIST_VALUE,
  );
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const isPublic = isPublicPath(request.nextUrl.pathname);

  if (request.cookies.get(ACCESS_COOKIE)?.value) {
    if (!isPublic) {
      return NextResponse.next();
    }
    return isRejectedSession(request)
      ? clearSession(NextResponse.next())
      : redirectTo(request, HOME_PATH);
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return isPublic
      ? NextResponse.next()
      : redirectTo(request, signInHref(currentPath(request)));
  }

  return renewSession(request, refreshToken, isPublic);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

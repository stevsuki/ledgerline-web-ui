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

/** The gate in front of every route. */

/** What `requireUser()` puts on the sign-in URL when the API rejects a token. */
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
  // A prefetch must not be answered from a stale session.
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

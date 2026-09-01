/** The route names the gate is built from. */

export const SIGN_IN_PATH = "/sign-in";
export const REGISTER_PATH = "/register";
export const RESET_PASSWORD_PATH = "/reset-password";

/** Where a signed-in visitor lands: the workspace opens on the dashboard. */
export const HOME_PATH = "/dashboard";

/** Reachable without a session. Everything else is behind the gate. */
export const PUBLIC_PATHS = [
  SIGN_IN_PATH,
  REGISTER_PATH,
  RESET_PASSWORD_PATH,
] as const;

/** The query key that remembers where a signed-out visitor was heading. */
/** The root path is not a destination of its own; it forwards to HOME_PATH. */
const ROOT_PATH = "/";

export const RETURN_PARAM = "next";

/** The query key the auth pages read their one-line confirmations from. */
export const STATUS_PARAM = "status";

export const AUTH_STATUSES = [
  "none",
  "registered",
  "password-updated",
  "signed-out",
  "session-expired",
] as const;

export type AuthStatus = (typeof AUTH_STATUSES)[number];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/** Turns a `?next=` value back into a destination. */
export function safeReturnPath(raw: string | null | undefined): string {
  if (!raw?.startsWith("/") || raw.startsWith("//") || raw === ROOT_PATH) {
    return HOME_PATH;
  }
  const [pathname] = raw.split("?");
  return isPublicPath(pathname) ? HOME_PATH : raw;
}

/** Builds the sign-in URL, carrying the interrupted destination along. */
export function signInHref(
  returnTo?: string,
  status: AuthStatus = "none",
): string {
  const query = new URLSearchParams();
  // The same rule the sign-in form applies on the way back.
  if (returnTo && safeReturnPath(returnTo) !== HOME_PATH) {
    query.set(RETURN_PARAM, returnTo);
  }
  if (status !== "none") {
    query.set(STATUS_PARAM, status);
  }
  const search = query.toString();
  return search ? `${SIGN_IN_PATH}?${search}` : SIGN_IN_PATH;
}

/* ── the two legs of the password reset ────────────────────────────────── */

/** The leg lives in the URL rather than in React state. */
export const RESET_STEPS = ["request", "reset"] as const;
export type ResetStep = (typeof RESET_STEPS)[number];

export const RESET_STEP_PARAM = "step";

export function resetStepHref(step: ResetStep): string {
  return `${RESET_PASSWORD_PATH}?${RESET_STEP_PARAM}=${step}`;
}

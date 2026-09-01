import { parseMenus } from "@/lib/api/access";
import { apiRequest, withParsed, withoutData } from "@/lib/api/client";
import { isRecord, readEnum, readNumber, readString } from "@/lib/api/parse";
import type { ApiResult } from "@/types/api";
import {
  USER_ROLES,
  USER_STATUSES,
  type AuthTokens,
  type AuthUser,
  type Profile,
  type ResetGrant,
  type UserRole,
} from "@/types/auth";

/** The seven `/auth/*` endpoints the backend ships today, one function each. */

const AUTH = "/auth";

/* ── parsers ───────────────────────────────────────────────────────────── */

/** The role arrives as its display name from the RBAC table — `"Admin"`, `"User"`. */
function readRole(raw: Record<string, unknown>): UserRole {
  const name = readString(raw, "role")?.toLowerCase();
  return USER_ROLES.find((role) => role === name) ?? "user";
}

function parseUser(raw: unknown): AuthUser | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = readString(raw, "id");
  const email = readString(raw, "email");
  if (!id || !email) {
    return null;
  }

  return {
    id,
    email,
    fullName: readString(raw, "full_name") ?? email,
    role: readRole(raw),
    status: readEnum(raw, "status", USER_STATUSES, "enabled"),
    createdAt: readString(raw, "created_at") ?? "",
    updatedAt: readString(raw, "updated_at") ?? "",
  };
}

/** `/auth/me` answers with a profile — `{ user, menus }` — not the account on its own. */
function parseProfile(raw: unknown): Profile | null {
  if (!isRecord(raw)) {
    return null;
  }

  const user = parseUser(raw.user);
  return user ? { user, menus: parseMenus(raw.menus) } : null;
}

function parseTokens(raw: unknown): AuthTokens | null {
  if (!isRecord(raw)) {
    return null;
  }

  const accessToken = readString(raw, "access_token");
  const refreshToken = readString(raw, "refresh_token");
  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    expiresIn: readNumber(raw, "expires_in") ?? 0,
  };
}

function parseResetGrant(raw: unknown): ResetGrant | null {
  if (!isRecord(raw)) {
    return null;
  }

  const resetToken = readString(raw, "reset_token");
  if (!resetToken) {
    return null;
  }

  return { resetToken, expiresIn: readNumber(raw, "expires_in") ?? 0 };
}

/* ── endpoints ─────────────────────────────────────────────────────────── */

export type RegisterInput = {
  readonly email: string;
  readonly fullName: string;
  readonly password: string;
};

/** POST /auth/register — creates the account; it does not sign anyone in. */
export async function registerAccount(
  input: RegisterInput,
): Promise<ApiResult<AuthUser>> {
  const result = await apiRequest({
    path: `${AUTH}/register`,
    method: "POST",
    body: {
      email: input.email,
      full_name: input.fullName,
      password: input.password,
    },
  });
  return withParsed(result, parseUser);
}

export type LoginInput = {
  readonly email: string;
  readonly password: string;
};

/** POST /auth/login */
export async function login(input: LoginInput): Promise<ApiResult<AuthTokens>> {
  const result = await apiRequest({
    path: `${AUTH}/login`,
    method: "POST",
    body: { email: input.email, password: input.password },
  });
  return withParsed(result, parseTokens);
}

/** POST /auth/refresh */
export async function refreshTokens(
  refreshToken: string,
): Promise<ApiResult<AuthTokens>> {
  const result = await apiRequest({
    path: `${AUTH}/refresh`,
    method: "POST",
    body: { refresh_token: refreshToken },
  });
  return withParsed(result, parseTokens);
}

/** GET /auth/me — the authority on who the caller is, and what they may see. */
export async function fetchProfile(
  accessToken: string,
): Promise<ApiResult<Profile>> {
  const result = await apiRequest({
    path: `${AUTH}/me`,
    method: "GET",
    accessToken,
  });
  return withParsed(result, parseProfile);
}

/** POST /auth/forgot-password — sends the OTP. */
export async function requestPasswordOtp(
  email: string,
): Promise<ApiResult<null>> {
  return withoutData(
    await apiRequest({
      path: `${AUTH}/forgot-password`,
      method: "POST",
      body: { email },
    }),
  );
}

export type VerifyOtpInput = {
  readonly email: string;
  readonly otp: string;
};

/** POST /auth/verify-otp — trades a good OTP for the reset grant. */
export async function verifyPasswordOtp(
  input: VerifyOtpInput,
): Promise<ApiResult<ResetGrant>> {
  const result = await apiRequest({
    path: `${AUTH}/verify-otp`,
    method: "POST",
    body: { email: input.email, otp: input.otp },
  });
  return withParsed(result, parseResetGrant);
}

export type ResetPasswordInput = {
  readonly resetToken: string;
  readonly newPassword: string;
  readonly confirmNewPassword: string;
};

/** POST /auth/reset-password */
export async function resetPassword(
  input: ResetPasswordInput,
): Promise<ApiResult<null>> {
  return withoutData(
    await apiRequest({
      path: `${AUTH}/reset-password`,
      method: "POST",
      body: {
        reset_token: input.resetToken,
        new_password: input.newPassword,
        confirm_new_password: input.confirmNewPassword,
      },
    }),
  );
}

import type { MenuNode } from "@/types/access";

/** The account model, mirroring `internal/domain` in `ledgerline-backend`. */

export const USER_ROLES = ["admin", "user"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["enabled", "disabled", "invited"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export type AuthUser = {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** The pair issued by `/auth/login` and `/auth/refresh`. */
export type AuthTokens = {
  readonly accessToken: string;
  readonly refreshToken: string;
  /** Lifetime of the access token in seconds. */
  readonly expiresIn: number;
};

/** The short-lived grant `/auth/verify-otp` hands out once an OTP checks out. */
export type ResetGrant = {
  readonly resetToken: string;
  readonly expiresIn: number;
};

/** `/auth/me` — the account plus the sidebar its role may reach. */
export type Profile = {
  readonly user: AuthUser;
  readonly menus: readonly MenuNode[];
};

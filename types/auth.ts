import type { MenuNode } from "@/types/access";

/**
 * The account model, mirroring `internal/domain` in `ledgerline-backend`.
 *
 * `role` here is the built-in privilege, not the RBAC role: the backend sends the
 * role's display name, and only the built-in admin maps onto anything the UI gates
 * on. The role screens work from `RoleRecord`, which carries the real row.
 */

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

/**
 * `/auth/me` — the account plus the sidebar its role may reach. The menus are
 * already filtered and nested by the backend: only what the role can read
 * comes back, and a group whose children are all hidden comes back not at all.
 */
export type Profile = {
  readonly user: AuthUser;
  readonly menus: readonly MenuNode[];
};

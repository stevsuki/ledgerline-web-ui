import type { IconName } from "@/components/ui/icon-sprite";
import { withCurrent } from "@/lib/icon-choice";

/** The names on the access forms. */
export const ACCESS_FIELD = {
  id: "id",
  email: "email",
  fullName: "full_name",
  password: "password",
  roleId: "role_id",
  name: "name",
  description: "description",
  icon: "icon",
  /** One per granted cell of the matrix, as `<menu id>:<action>`. */
  grant: "grant",
} as const;

/** Splits `grant` values; a menu id is a UUID, so it never contains one. */
export const GRANT_SEPARATOR = ":";

export function grantValue(menuId: string, action: string): string {
  return `${menuId}${GRANT_SEPARATOR}${action}`;
}

/** The backend's `binding:"min=2,max=50"` on a role name. */
export const ROLE_NAME_MIN_LENGTH = 2;
export const ROLE_NAME_MAX_LENGTH = 50;

/** The backend's `binding:"omitempty,max=255"` on a role description. */
export const ROLE_DESCRIPTION_MAX_LENGTH = 255;

/* ── the role's icon ───────────────────────────────────────────────────── */

/**
 * `roles.icon` holds an icon key, not a path — `lib/icon-choice.ts` keeps that
 * contract; this is only the shortlist the role picker offers.
 *
 * A shortlist rather than all forty-odd symbols: a role is a set of
 * permissions, so the icons that mean anything here are the ones about
 * authority, people, and the areas of the app a role covers.
 */
export const ROLE_ICON_CHOICES: readonly IconName[] = [
  "shield",
  "users",
  "lock",
  "gear",
  "chart",
  "wallet",
  "target",
  "flag",
  "bell",
  "search",
];

/** What a role with no icon of its own is drawn with. */
export function defaultRoleIcon(isSystem: boolean): IconName {
  return isSystem ? "shield" : "users";
}

/** The shortlist, plus whatever this role is already wearing. */
export function roleIconChoices(current: IconName): readonly IconName[] {
  return withCurrent(ROLE_ICON_CHOICES, current);
}

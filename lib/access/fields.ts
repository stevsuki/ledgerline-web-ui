/**
 * The names on the access forms.
 *
 * They are the backend's json tags, exactly as the auth forms do it: a
 * `VALIDATION_ERROR` names the field it rejected, so the error lands under the
 * right input with no translation table in between.
 */
export const ACCESS_FIELD = {
  id: "id",
  email: "email",
  fullName: "full_name",
  password: "password",
  roleId: "role_id",
  name: "name",
  description: "description",
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

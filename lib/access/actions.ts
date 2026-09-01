"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createRole,
  createUser,
  deleteRole,
  deleteUser,
  updateRole,
  updateUser,
  type RolePermissionInput,
} from "@/lib/api/access";
import { ACCESS_FIELD, GRANT_SEPARATOR } from "@/lib/access/fields";
import {
  failureState,
  noticeState,
  type AuthFormState,
} from "@/lib/auth/form-state";
import { requireAccessToken } from "@/lib/auth/session";
import { PERMISSION_ACTIONS, type PermissionAction } from "@/types/access";

/**
 * Every mutation the access screens perform.
 *
 * The forms post straight to these, so a row can be edited with JavaScript
 * switched off; the client halves only add the pending label, the inline error
 * and the live permission grid.
 */

/** Both lists sit behind the shell, so a change invalidates the whole tree. */
const USERS_PATH = "/users";
const ROLES_PATH = "/roles";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function secret(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/* ── users ─────────────────────────────────────────────────────────────── */

/**
 * One action for one sheet. Creating needs an email and a password, editing
 * needs neither — `PATCH /users/{id}` takes only the name and the role — so
 * the presence of an id is what decides which call is made.
 */
export async function saveUserAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const id = text(formData, ACCESS_FIELD.id);
  const email = text(formData, ACCESS_FIELD.email);
  const fullName = text(formData, ACCESS_FIELD.fullName);
  const roleId = text(formData, ACCESS_FIELD.roleId);
  const values = {
    [ACCESS_FIELD.email]: email,
    [ACCESS_FIELD.fullName]: fullName,
    [ACCESS_FIELD.roleId]: roleId,
  };

  const accessToken = await requireAccessToken();
  const result = id
    ? await updateUser(accessToken, id, { fullName, roleId })
    : await createUser(accessToken, {
        email,
        fullName,
        password: secret(formData, ACCESS_FIELD.password),
        roleId,
      });

  if (!result.ok) {
    return failureState(result.error, values);
  }

  revalidatePath(USERS_PATH);
  return noticeState(
    id
      ? `${result.data.fullName} updated.`
      : `${result.data.fullName} can sign in now.`,
  );
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const id = text(formData, ACCESS_FIELD.id);
  if (!id) {
    return;
  }

  const accessToken = await requireAccessToken();
  await deleteUser(accessToken, id);
  revalidatePath(USERS_PATH);
}

/* ── roles ─────────────────────────────────────────────────────────────── */

function isPermissionAction(value: string): value is PermissionAction {
  return PERMISSION_ACTIONS.some((action) => action === value);
}

/**
 * Reads the matrix back off the form.
 *
 * Every ticked cell posts one `grant` value, so the grid needs no JSON blob
 * and no parsing that could fail: an entry that is not `<uuid>:<action>` is
 * simply not a grant.
 */
function readGrants(formData: FormData): readonly RolePermissionInput[] {
  const byMenu = new Map<string, Partial<Record<PermissionAction, boolean>>>();

  for (const raw of formData.getAll(ACCESS_FIELD.grant)) {
    if (typeof raw !== "string") {
      continue;
    }

    const [menuId, action] = raw.split(GRANT_SEPARATOR);
    if (!menuId || !action || !isPermissionAction(action)) {
      continue;
    }

    const granted = byMenu.get(menuId) ?? {};
    granted[action] = true;
    byMenu.set(menuId, granted);
  }

  return [...byMenu].map(([menuId, granted]) => ({ menuId, granted }));
}

export async function saveRoleAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const id = text(formData, ACCESS_FIELD.id);
  const name = text(formData, ACCESS_FIELD.name);
  const description = text(formData, ACCESS_FIELD.description);
  const values = {
    [ACCESS_FIELD.name]: name,
    [ACCESS_FIELD.description]: description,
  };

  const accessToken = await requireAccessToken();
  const permissions = readGrants(formData);

  // A built-in role posts no name — its input is disabled, because the backend
  // rejects the field outright on those roles rather than comparing it.
  const result = id
    ? await updateRole(accessToken, id, {
        name: name || undefined,
        description,
        permissions,
      })
    : await createRole(accessToken, { name, description, permissions });

  if (!result.ok) {
    return failureState(result.error, values);
  }

  revalidatePath(ROLES_PATH);
  redirect(ROLES_PATH);
}

export async function deleteRoleAction(formData: FormData): Promise<void> {
  const id = text(formData, ACCESS_FIELD.id);
  if (!id) {
    return;
  }

  const accessToken = await requireAccessToken();
  await deleteRole(accessToken, id);
  revalidatePath(ROLES_PATH);
}

import { apiRequest, withParsed, withoutData, withQuery } from "@/lib/api/client";
import { isRecord, readBoolean, readNumber, readString } from "@/lib/api/parse";
import { ICON_NAMES, type IconName } from "@/components/ui/icon-sprite";
import { defaultRoleIcon } from "@/lib/access/fields";
import type { ApiResult } from "@/types/api";
import {
  ACCOUNT_STATUS_BY_CODE,
  PERMISSION_ACTIONS,
  type AccountStatus,
  type MenuAccess,
  type MenuNode,
  type PermissionAction,
  type RoleMenuPermission,
  type RoleRecord,
  type UserRecord,
} from "@/types/access";

/** The RBAC endpoints: `/roles`, `/users`, and the menu tree that rides along with `/auth/me`. */

const ROLES = "/roles";
const USERS = "/users";

/** The backend caps `per_page` at 100 (`binding:"max=100"`). */
export const MAX_PER_PAGE = 100;

/* ── shared parsers ────────────────────────────────────────────────────── */

/** The five `can_*` flags, in the artboard's column order. */
const ACCESS_FIELD: Readonly<Record<PermissionAction, string>> = {
  read: "can_read",
  create: "can_create",
  update: "can_update",
  delete: "can_delete",
  approval: "can_approve",
};

function readAccess(raw: Record<string, unknown>): MenuAccess {
  return {
    read: readBoolean(raw, ACCESS_FIELD.read),
    create: readBoolean(raw, ACCESS_FIELD.create),
    update: readBoolean(raw, ACCESS_FIELD.update),
    delete: readBoolean(raw, ACCESS_FIELD.delete),
    approval: readBoolean(raw, ACCESS_FIELD.approval),
  };
}

/** Serialises one matrix row back into the payload the backend binds. */
export function toAccessPayload(
  menuId: string,
  granted: Readonly<Partial<Record<PermissionAction, boolean>>>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = { menu_id: menuId };
  for (const action of PERMISSION_ACTIONS) {
    payload[ACCESS_FIELD[action]] = Boolean(granted[action]);
  }
  return payload;
}

/** A group carries no access row of its own, so every flag reads false. */
const NO_ACCESS: MenuAccess = readAccess({});

function readIcon(raw: Record<string, unknown>, fallback: IconName): IconName {
  const name = readString(raw, "icon");
  return ICON_NAMES.find((icon) => icon === name) ?? fallback;
}

function readStatus(raw: Record<string, unknown>): AccountStatus {
  const code = readString(raw, "status")?.toLowerCase() ?? "";
  return ACCOUNT_STATUS_BY_CODE[code] ?? "Disabled";
}

/** Reads the array a list endpoint puts in `data`, ignoring anything else. */
function readList<T>(raw: unknown, parse: (entry: unknown) => T | null): T[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const items: T[] = [];
  for (const entry of raw) {
    const parsed = parse(entry);
    if (parsed) {
      items.push(parsed);
    }
  }
  return items;
}

/* ── menus ─────────────────────────────────────────────────────────────── */

function parseMenu(raw: unknown): MenuNode | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = readString(raw, "id");
  const code = readString(raw, "code");
  if (!id || !code) {
    return null;
  }

  const children = readList(raw.children, parseMenu);
  const access = isRecord(raw.access) ? readAccess(raw.access) : NO_ACCESS;

  return {
    id,
    code,
    name: readString(raw, "name") ?? code,
    icon: readIcon(raw, "grid"),
    access,
    children,
  };
}

export function parseMenus(raw: unknown): readonly MenuNode[] {
  return readList(raw, parseMenu);
}

/* ── roles ─────────────────────────────────────────────────────────────── */

function parsePermission(raw: unknown): RoleMenuPermission | null {
  if (!isRecord(raw)) {
    return null;
  }

  const menuId = readString(raw, "menu_id");
  return menuId ? { menuId, ...readAccess(raw) } : null;
}

function parseRole(raw: unknown): RoleRecord | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = readString(raw, "id");
  const name = readString(raw, "name");
  if (!id || !name) {
    return null;
  }

  // The column is nullable and takes any string, so a role that has never been
  // given one — every seeded role included — falls back to what it always drew.
  const isSystem = readBoolean(raw, "is_system");

  return {
    id,
    name,
    description: readString(raw, "description") ?? "",
    icon: readIcon(raw, defaultRoleIcon(isSystem)),
    isSystem,
    userCount: readNumber(raw, "user_count") ?? 0,
    createdAt: readString(raw, "created_at") ?? "",
    updatedAt: readString(raw, "updated_at") ?? "",
    permissions: readList(raw.permissions, parsePermission),
  };
}

/** What every list endpoint takes: the backend's four query params. */
export type ListQuery = {
  readonly search?: string;
  readonly sort?: string;
  readonly page?: number;
  readonly perPage?: number;
};

function listPath(base: string, query: ListQuery): string {
  return withQuery(base, {
    search: query.search,
    sort: query.sort,
    page: query.page,
    per_page: query.perPage,
  });
}

export type ListResult<T> = {
  readonly items: readonly T[];
  readonly total: number;
};

/** A list answer keeps its `meta`, which is the only place the total lives. */
function withList<T>(
  result: ApiResult<unknown>,
  parse: (entry: unknown) => T | null,
): ApiResult<ListResult<T>> {
  if (!result.ok) {
    return result;
  }

  const items = readList(result.data, parse);
  return {
    ok: true,
    data: { items, total: result.meta?.totalItems ?? items.length },
    message: result.message,
    meta: result.meta,
  };
}

/** GET /roles */
export async function listRoles(
  accessToken: string,
  query: ListQuery,
): Promise<ApiResult<ListResult<RoleRecord>>> {
  return withList(
    await apiRequest({ path: listPath(ROLES, query), method: "GET", accessToken }),
    parseRole,
  );
}

/** GET /roles/{id} */
export async function fetchRole(
  accessToken: string,
  id: string,
): Promise<ApiResult<RoleRecord>> {
  const result = await apiRequest({
    path: `${ROLES}/${id}`,
    method: "GET",
    accessToken,
  });
  return withParsed(result, parseRole);
}

export type RolePermissionInput = {
  readonly menuId: string;
  readonly granted: Readonly<Partial<Record<PermissionAction, boolean>>>;
};

export type SaveRoleInput = {
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly permissions: readonly RolePermissionInput[];
};

/** The same, with the name optional — see `updateRole` for why it is left out. */
export type UpdateRoleInput = Omit<SaveRoleInput, "name"> & {
  readonly name?: string;
};

function permissionsPayload(
  permissions: readonly RolePermissionInput[],
): readonly Record<string, unknown>[] {
  return permissions.map((entry) =>
    toAccessPayload(entry.menuId, entry.granted),
  );
}

/** POST /roles */
export async function createRole(
  accessToken: string,
  input: SaveRoleInput,
): Promise<ApiResult<RoleRecord>> {
  const result = await apiRequest({
    path: ROLES,
    method: "POST",
    accessToken,
    body: {
      name: input.name,
      description: input.description,
      icon: input.icon,
      permissions: permissionsPayload(input.permissions),
    },
  });
  return withParsed(result, parseRole);
}

/** PATCH /roles/{id} */
export async function updateRole(
  accessToken: string,
  id: string,
  input: UpdateRoleInput,
): Promise<ApiResult<RoleRecord>> {
  const body: Record<string, unknown> = {
    description: input.description,
    icon: input.icon,
    permissions: permissionsPayload(input.permissions),
  };

  // The rename guard in `roleService.Update` fires on the field being *present*.
  if (input.name) {
    body.name = input.name;
  }

  const result = await apiRequest({
    path: `${ROLES}/${id}`,
    method: "PATCH",
    accessToken,
    body,
  });
  return withParsed(result, parseRole);
}

/** DELETE /roles/{id} */
export async function deleteRole(
  accessToken: string,
  id: string,
): Promise<ApiResult<null>> {
  return withoutData(
    await apiRequest({ path: `${ROLES}/${id}`, method: "DELETE", accessToken }),
  );
}

/* ── users ─────────────────────────────────────────────────────────────── */

export function parseUserRecord(raw: unknown): UserRecord | null {
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
    roleId: readString(raw, "role_id") ?? "",
    roleName: readString(raw, "role") ?? "",
    status: readStatus(raw),
    createdAt: readString(raw, "created_at") ?? "",
    updatedAt: readString(raw, "updated_at") ?? "",
  };
}

/** GET /users */
export async function listUsers(
  accessToken: string,
  query: ListQuery,
): Promise<ApiResult<ListResult<UserRecord>>> {
  return withList(
    await apiRequest({ path: listPath(USERS, query), method: "GET", accessToken }),
    parseUserRecord,
  );
}

export type CreateUserInput = {
  readonly email: string;
  readonly fullName: string;
  readonly password: string;
  readonly roleId: string;
};

/** POST /users */
export async function createUser(
  accessToken: string,
  input: CreateUserInput,
): Promise<ApiResult<UserRecord>> {
  const result = await apiRequest({
    path: USERS,
    method: "POST",
    accessToken,
    body: {
      email: input.email,
      full_name: input.fullName,
      password: input.password,
      role_id: input.roleId,
    },
  });
  return withParsed(result, parseUserRecord);
}

/** PATCH /users/{id} — the backend accepts the name and the role, nothing else. */
export async function updateUser(
  accessToken: string,
  id: string,
  input: { readonly fullName: string; readonly roleId: string },
): Promise<ApiResult<UserRecord>> {
  const result = await apiRequest({
    path: `${USERS}/${id}`,
    method: "PATCH",
    accessToken,
    body: { full_name: input.fullName, role_id: input.roleId },
  });
  return withParsed(result, parseUserRecord);
}

/** DELETE /users/{id} */
export async function deleteUser(
  accessToken: string,
  id: string,
): Promise<ApiResult<null>> {
  return withoutData(
    await apiRequest({ path: `${USERS}/${id}`, method: "DELETE", accessToken }),
  );
}

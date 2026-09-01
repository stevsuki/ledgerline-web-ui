import type { IconName } from "@/components/ui/icon-sprite";
import {
  MAX_PER_PAGE,
  fetchRole,
  listRoles,
  listUsers,
} from "@/lib/api/access";
import { permissionModules, type PermissionModule } from "@/lib/access/menus";
import { getProfile, requireAccessToken } from "@/lib/auth/session";
import { formatTimestamp } from "@/lib/format";
import { paginate, pagedFromTotal, type Paged } from "@/lib/pagination";
import {
  type AccountStatus,
  type MenuNode,
  type PermissionAction,
  type RoleRecord,
  type UserRecord,
} from "@/types/access";
import type { MiniStat } from "@/types/ledger";

/**
 * The access screens, served from `ledgerline-backend`.
 *
 * `GET /users` and `GET /roles` take `search`, `sort`, `page` and `per_page`,
 * and nothing else — there is no role or status filter on the wire yet. So one
 * window of rows is fetched (the backend's own `per_page` ceiling), the two
 * selects are applied to it here on the server, and the page is cut from what
 * is left. The browser still only ever receives the rows it shows.
 *
 * The ceiling is the one thing to remember about this file: past
 * `MAX_PER_PAGE` accounts the list needs `role` and `status` as real query
 * params, and the status tiles need a counts endpoint.
 */

export const ACCESS_PAGE_SIZES = [10, 25, 50] as const;

export const ALL_ROLES = "All roles";
export const ALL_STATUSES = "All statuses";

export const USER_STATUS_OPTIONS = [
  ALL_STATUSES,
  "Enabled",
  "Disabled",
  "Invited",
] as const;

/* ── sorting ───────────────────────────────────────────────────────────── */

/**
 * The columns the backend will sort by — `dto.userSort` and `dto.roleSort`.
 * Anything else is refused there, so the header links never offer it.
 */
export const USER_SORT_COLUMNS = [
  "full_name",
  "email",
  "role",
  "created_at",
  "updated_at",
] as const;

export const ROLE_SORT_COLUMNS = [
  "name",
  "user_count",
  "is_system",
  "created_at",
  "updated_at",
] as const;

/* ── rows, as the tables render them ───────────────────────────────────── */

export type UserRow = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly roleId: string;
  readonly updated: string;
  readonly status: AccountStatus;
};

export type RoleRow = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly members: number;
  readonly updated: string;
  readonly isSystem: boolean;
  readonly icon: IconName;
};

/*
 * There is no permission count on the row: `GET /roles` answers with an empty
 * `permissions` array — only `GET /roles/{id}` hydrates it — so any figure
 * here would read zero for every role. A `permission_count` on the list
 * response is what would bring the artboard's sub-line back.
 */

function toUserRow(record: UserRecord): UserRow {
  return {
    id: record.id,
    name: record.fullName,
    email: record.email,
    role: record.roleName,
    roleId: record.roleId,
    updated: formatTimestamp(record.updatedAt),
    status: record.status,
  };
}

/** Built-in roles carry the shield; a role somebody made carries the group. */
function roleIcon(record: RoleRecord): IconName {
  return record.isSystem ? "shield" : "users";
}

function toRoleRow(record: RoleRecord): RoleRow {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    members: record.userCount,
    updated: formatTimestamp(record.updatedAt),
    isSystem: record.isSystem,
    icon: roleIcon(record),
  };
}

/* ── users ─────────────────────────────────────────────────────────────── */

export type UserFilters = {
  readonly query: string;
  readonly role: string;
  readonly status: string;
  readonly sort: string;
  readonly page: number;
  readonly size: number;
};

export type UsersResult = {
  readonly page: Paged<UserRow>;
  readonly stats: readonly MiniStat[];
  readonly isEmpty: boolean;
  /** What went wrong, when the API could not answer at all. */
  readonly error: string;
};

function userStats(rows: readonly UserRow[], total: number): readonly MiniStat[] {
  const countOf = (status: AccountStatus): string =>
    String(rows.filter((row) => row.status === status).length);
  const roles = new Set(rows.map((row) => row.role)).size;

  return [
    { id: "total", label: "Total users", value: String(total), tone: "text", note: `Across ${roles} role(s)` },
    { id: "enabled", label: "Enabled", value: countOf("Enabled"), tone: "income", note: "Can sign in today" },
    { id: "invited", label: "Invited", value: countOf("Invited"), tone: "warn", note: "Awaiting first sign-in" },
    { id: "disabled", label: "Disabled", value: countOf("Disabled"), tone: "muted", note: "Access revoked" },
  ];
}

const EMPTY_PAGE_SIZE = 10;

function emptyUsers(error: string, size: number): UsersResult {
  return {
    page: paginate<UserRow>([], 1, size || EMPTY_PAGE_SIZE),
    stats: userStats([], 0),
    isEmpty: true,
    error,
  };
}

export async function getUsers(filters: UserFilters): Promise<UsersResult> {
  const accessToken = await requireAccessToken();
  const listed = await listUsers(accessToken, {
    search: filters.query,
    sort: filters.sort,
    page: 1,
    perPage: MAX_PER_PAGE,
  });

  if (!listed.ok) {
    return emptyUsers(listed.error.message, filters.size);
  }

  const rows = listed.data.items.map(toUserRow);
  const matches = rows.filter(
    (row) =>
      (filters.role === ALL_ROLES || row.role === filters.role) &&
      (filters.status === ALL_STATUSES || row.status === filters.status),
  );

  return {
    page: paginate(matches, filters.page, filters.size),
    stats: userStats(rows, listed.data.total),
    isEmpty: matches.length === 0,
    error: "",
  };
}

/* ── roles ─────────────────────────────────────────────────────────────── */

export type RoleFilters = {
  readonly query: string;
  readonly sort: string;
  readonly page: number;
  readonly size: number;
};

export type RolesResult = {
  readonly page: Paged<RoleRow>;
  readonly isEmpty: boolean;
  readonly error: string;
};

export async function getRoles(filters: RoleFilters): Promise<RolesResult> {
  const accessToken = await requireAccessToken();
  const listed = await listRoles(accessToken, {
    search: filters.query,
    sort: filters.sort,
    page: filters.page,
    perPage: filters.size,
  });

  if (!listed.ok) {
    return {
      page: paginate<RoleRow>([], 1, filters.size),
      isEmpty: true,
      error: listed.error.message,
    };
  }

  const rows = listed.data.items.map(toRoleRow);
  return {
    page: pagedFromTotal(rows, filters.page, filters.size, listed.data.total),
    isEmpty: rows.length === 0,
    error: "",
  };
}

export async function getRole(id: string): Promise<RoleRecord | null> {
  const accessToken = await requireAccessToken();
  const result = await fetchRole(accessToken, id);
  return result.ok ? result.data : null;
}

/* ── the permission matrix ─────────────────────────────────────────────── */

/**
 * The rows of the role editor, and the grants one role already holds, keyed by
 * menu id so the grid can look each row up directly.
 */
export type GrantMap = Readonly<
  Record<string, Readonly<Partial<Record<PermissionAction, boolean>>>>
>;

export function toGrantMap(record: RoleRecord): GrantMap {
  const grants: Record<string, Partial<Record<PermissionAction, boolean>>> = {};
  for (const permission of record.permissions) {
    grants[permission.menuId] = {
      read: permission.read,
      create: permission.create,
      update: permission.update,
      delete: permission.delete,
      approval: permission.approval,
    };
  }
  return grants;
}

async function profileMenus(): Promise<readonly MenuNode[]> {
  return (await getProfile())?.menus ?? [];
}

export async function getPermissionModules(): Promise<
  readonly PermissionModule[]
> {
  return permissionModules(await profileMenus());
}

/* ── what a role grants, for the user editor ───────────────────────────── */

export type RoleOption = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
};

/**
 * The roles a user can be given.
 *
 * The artboard's sheet lists the menus the chosen role grants. That list is
 * not on the wire — `GET /roles` sends no permissions, and asking
 * `GET /roles/{id}` once per option would be a request per row — so the
 * role's own description stands in its place until the list carries them.
 */
export async function getRoleOptions(): Promise<readonly RoleOption[]> {
  const accessToken = await requireAccessToken();
  const listed = await listRoles(accessToken, { perPage: MAX_PER_PAGE });

  if (!listed.ok) {
    return [];
  }

  return listed.data.items.map((record) => ({
    id: record.id,
    name: record.name,
    description: record.description,
  }));
}

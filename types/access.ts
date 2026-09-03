import type { IconName } from "@/components/ui/icon-sprite";
import type { AuditDetail } from "@/types/audit-detail";

/** The five permission columns of the role matrix, in artboard order. */
export const PERMISSION_ACTIONS = [
  "read",
  "create",
  "update",
  "delete",
  "approval",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type AccountStatus = "Enabled" | "Disabled" | "Invited";

/** The backend stores the status lower-cased; the artboard prints it capitalised. */
export const ACCOUNT_STATUS_BY_CODE: Readonly<Record<string, AccountStatus>> = {
  enabled: "Enabled",
  disabled: "Disabled",
  invited: "Invited",
};

/* audit log — Mirrors `internal/domain/audit_log.go` and `audit_detail.go`. */

export const AUDIT_SEVERITIES = ["info", "warning", "critical"] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export const AUDIT_STATUSES = ["success", "failed"] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];

/** `AuditModule` in the backend. Codes match `menus.code` where a menu exists. */
export const AUDIT_MODULES = [
  "auth",
  "budgets",
  "data_export",
  "insights",
  "recurring",
  "roles",
  "goals",
  "settings",
  "shared",
  "transactions",
  "users",
  "wallets",
] as const;
export type AuditModule = (typeof AUDIT_MODULES)[number];

/** One row of the table. `detail` is the backend's `detail_text`. */
export type AuditEvent = {
  readonly id: string;
  /** `created_at` formatted for the table: `27-08-2026 19:41`. */
  readonly time: string;
  readonly actorId: string;
  readonly actor: string;
  readonly role: string;
  /** A dotted code, e.g. `auth.login`. The UI names it; the backend does not. */
  readonly action: string;
  readonly module: string;
  readonly detail: string;
  readonly ip: string;
  readonly status: AuditStatus;
  readonly severity: AuditSeverity;
  /** The structured payload `detail` was rendered from, when one is stored. */
  readonly details: AuditDetail | null;
};

/** The counters behind the four cards, from `/audit-logs/overview`. */
export type AuditOverview = {
  readonly windowDays: number;
  readonly events: number;
  readonly modules: number;
  readonly sensitive: number;
  readonly failedSignIns: number;
  readonly failedSignInAddresses: number;
  readonly retentionDays: number;
};

/** One entry of a filter dropdown, from `/audit-logs/options`. */
export type AuditFilterOption = {
  readonly value: string;
  readonly label: string;
};

/** An actor carries their role, so the dropdown can show it beside the name. */
export type AuditActorOption = AuditFilterOption & { readonly role: string };

export type AuditOptions = {
  readonly actors: readonly AuditActorOption[];
  readonly modules: readonly AuditFilterOption[];
  readonly statuses: readonly AuditFilterOption[];
  readonly severities: readonly AuditFilterOption[];
};

/* ── what the backend actually stores ──────────────────────────────────── */

/** The RBAC records as `ledgerline-backend` returns them. */

/** What one role may do on one menu. All false when no permission row exists. */
export type MenuAccess = Readonly<Record<PermissionAction, boolean>>;

/** One entry of the sidebar tree from `/auth/me`. */
export type MenuNode = {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly icon: IconName;
  readonly access: MenuAccess;
  readonly children: readonly MenuNode[];
};

export type RoleMenuPermission = {
  readonly menuId: string;
} & MenuAccess;

export type RoleRecord = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** The badge beside the name. Falls back to the built-in / custom default. */
  readonly icon: IconName;
  /** Built-in roles cannot be renamed or deleted; the UI hides those actions. */
  readonly isSystem: boolean;
  readonly userCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly permissions: readonly RoleMenuPermission[];
};

export type UserRecord = {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly roleId: string;
  /** The role's display name, joined in by the backend. */
  readonly roleName: string;
  readonly status: AccountStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

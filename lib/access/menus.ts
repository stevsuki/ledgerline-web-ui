import type { IconName } from "@/components/ui/icon-sprite";
import type { NavGroup } from "@/lib/nav";
import type { MenuNode } from "@/types/access";

/** The menus table, read as the app needs it. */

/** Menu code → the route it opens. A code with no route never reaches the rail. */
const PATH_BY_CODE: Readonly<Record<string, string>> = {
  dashboard: "/dashboard",
  transactions: "/transactions",
  budgets: "/budgets",
  wallets: "/wallets",
  categories: "/categories",
  goals: "/goals",
  recurring: "/recurring",
  insights: "/insights",
  shared: "/shared",
  reminders: "/reminders",
  users: "/users",
  roles: "/roles",
  audit: "/audit",
  settings: "/settings",
  mobile: "/mobile",
};

export function pathForMenu(code: string): string | undefined {
  return PATH_BY_CODE[code];
}

/** Whether the signed-in role may read a menu. */
export function canReadMenu(
  menus: readonly MenuNode[],
  code: string,
): boolean {
  return menus.some(
    (menu) =>
      menu.code === code || menu.children.some((page) => page.code === code),
  );
}

/* ── the rail ──────────────────────────────────────────────────────────── */

/** The menu tree as the rail renders it. */
export function navGroupsFromMenus(
  menus: readonly MenuNode[],
): readonly NavGroup[] {
  const groups: NavGroup[] = [];

  for (const menu of menus) {
    const pages = menu.children.length > 0 ? menu.children : [menu];
    const items = pages
      .map((page) => ({
        href: pathForMenu(page.code),
        label: page.name,
        icon: page.icon,
      }))
      .filter((item): item is { href: string; label: string; icon: IconName } =>
        Boolean(item.href),
      );

    if (items.length > 0) {
      groups.push({ id: menu.code, label: menu.name, items });
    }
  }

  return groups;
}

/* ── the permission matrix ─────────────────────────────────────────────── */

/** One row of the role editor's grid: a page, not a group. */
export type PermissionModule = {
  /** The menu's id — what `POST /roles` keys a permission row by. */
  readonly id: string;
  readonly code: string;
  readonly label: string;
  readonly icon: IconName;
};

/** The pages of the menus table, by the ids the seed pins. */
const MENU_CATALOGUE: readonly PermissionModule[] = [
  { id: "b0000000-0000-0000-0000-000000000001", code: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "b0000000-0000-0000-0000-000000000002", code: "transactions", label: "Transactions", icon: "swap" },
  { id: "b0000000-0000-0000-0000-000000000003", code: "budgets", label: "Budgets", icon: "target" },
  { id: "b0000000-0000-0000-0000-000000000004", code: "wallets", label: "Wallets", icon: "wallet" },
  { id: "b0000000-0000-0000-0000-000000000005", code: "goals", label: "Goals", icon: "flag" },
  { id: "b0000000-0000-0000-0000-000000000006", code: "recurring", label: "Recurring", icon: "repeat" },
  { id: "b0000000-0000-0000-0000-000000000007", code: "insights", label: "Insights", icon: "chart" },
  { id: "b0000000-0000-0000-0000-000000000008", code: "shared", label: "Shared", icon: "users" },
  { id: "b0000000-0000-0000-0000-000000000009", code: "reminders", label: "Reminders", icon: "bell" },
  { id: "b0000000-0000-0000-0000-000000000010", code: "users", label: "Users", icon: "users" },
  { id: "b0000000-0000-0000-0000-000000000011", code: "roles", label: "Roles", icon: "shield" },
  { id: "b0000000-0000-0000-0000-000000000012", code: "audit", label: "Audit log", icon: "search" },
  { id: "b0000000-0000-0000-0000-000000000013", code: "settings", label: "Settings", icon: "gear" },
  { id: "b0000000-0000-0000-0000-000000000014", code: "mobile", label: "Mobile", icon: "phone" },
  // A menu of its own rather than a panel inside Budgets: `/categories` is a
  // real backend resource (full CRUD, user-scoped, its own error codes) while
  // budgets has no table and no endpoint at all — only
  // `GET /categories/options?slug=budget`, which is the budget form *reading*
  // this list. It belongs beside Budgets in the rail, not inside it: the seed's
  // `money` parent (a0000000-…-0002) already draws that heading.
  // Until the migration adds the row, `/auth/me` returns no such menu and the
  // rail cannot show it.
  { id: "b0000000-0000-0000-0000-000000000015", code: "categories", label: "Categories", icon: "tag" },
];

/** Every page of the tree, groups unwrapped, in display order. */
function pagesOf(menus: readonly MenuNode[]): readonly MenuNode[] {
  return menus.flatMap((menu) =>
    menu.children.length > 0 ? menu.children : [menu],
  );
}

/** The rows of the role editor: the catalogue above. */
export function permissionModules(
  menus: readonly MenuNode[],
): readonly PermissionModule[] {
  const byId = new Map<string, PermissionModule>();

  for (const entry of MENU_CATALOGUE) {
    byId.set(entry.id, entry);
  }

  for (const page of pagesOf(menus)) {
    byId.set(page.id, {
      id: page.id,
      code: page.code,
      label: page.name,
      icon: page.icon,
    });
  }

  return [...byId.values()];
}

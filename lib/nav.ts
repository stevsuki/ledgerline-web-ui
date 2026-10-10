import type { IconKey } from "@/lib/icon-choice";

export type NavItem = {
  readonly href: string;
  readonly label: string;
  readonly icon: IconKey;
  /** The screen is still the design fixture, and the rail says so. */
  readonly isPreview: boolean;
};

export type NavGroup = {
  readonly id: string;
  readonly label: string;
  readonly items: readonly NavItem[];
};

export type PageMeta = {
  readonly title: string;
  readonly subtitle: string;
};

/**
 * The heading each screen opens with.
 *
 * A subtitle here is a description, never a figure: a screen that can count its
 * own rows states them from the API instead (`/dashboard`, `/transactions`,
 * `/budgets`, `/recurring`). The artboard's numbers used to be copied into
 * this map, which printed "184 entries this month" over an account that had
 * none.
 */
export const PAGE_META = {
  dashboard: {
    title: "Dashboard",
    subtitle: "This month at a glance",
  },
  transactions: {
    title: "Transactions",
    subtitle: "Every entry in this workspace, newest first",
  },
  budgets: {
    title: "Budgets",
    subtitle: "What each category is allowed to spend",
  },
  wallets: {
    title: "Wallets",
    subtitle: "Accounts and balances you keep by hand",
  },
  categories: {
    title: "Categories",
    subtitle: "The master list every transaction is filed under",
  },
  goals: {
    title: "Goals",
    subtitle: "Targets you are putting money aside for",
  },
  recurring: {
    title: "Recurring",
    subtitle: "Payments that come round on a schedule",
  },
  insights: { title: "Insights", subtitle: "Patterns read out of your ledger" },
  shared: {
    title: "Shared budget",
    subtitle: "Budgets you keep together with someone else",
  },
  reminders: {
    title: "Reminders",
    subtitle: "Bills coming due and budgets near their limit",
  },
  settings: {
    title: "Settings",
    subtitle: "Profile, security, integrations, export",
  },
  mobile: { title: "Mobile", subtitle: "PWA screens at 330 × 660" },
  users: {
    title: "User management",
    subtitle: "People with access to this workspace",
  },
  roles: {
    title: "Role management",
    subtitle: "Roles and the permissions attached to them",
  },
  audit: {
    title: "Audit log",
    subtitle: "Every action taken in this workspace, newest first",
  },
  roleNew: {
    title: "Role management / Add new role",
    subtitle: "Pick the menus this role can reach and what it may do there",
  },
  roleEdit: {
    title: "Role management / Edit role",
    subtitle: "Pick the menus this role can reach and what it may do there",
  },
} as const satisfies Record<string, PageMeta>;

/** The app shell and the rail inside it, addressed by id. */
export const SHELL_ID = "app-shell";
export const NAV_ID = "app-nav";

export const WORKSPACE = {
  brand: "Ledgerline",
  initial: "L",
  currency: "IDR",
  signedInAs: "Rangga Aditama",
  signedInInitials: "RA",
  signedInEmail: "rangga@studioaksa.id",
  tagline: "Every rupiah, in one ledger.",
  today: "Wednesday, 27 August 2026",
} as const;

/**
 * The rail's footer card.
 *
 * It used to congratulate every account on a seven-month saving streak, which
 * an account ten seconds old had not earned. Nothing measures a streak yet, so
 * the card states what the app is for instead — true on the first day and on
 * the thousandth.
 */
export const RAIL_CARD = {
  kicker: "Ledgerline",
  body: WORKSPACE.tagline,
} as const;

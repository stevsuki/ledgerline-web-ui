import type { IconName } from "@/components/ui/icon-sprite";

export type NavItem = {
  readonly href: string;
  readonly label: string;
  readonly icon: IconName;
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

/** Copied verbatim from the artboard's `titles` map (lines ~1949-1967). */
export const PAGE_META = {
  dashboard: {
    title: "Dashboard",
    subtitle: "August 2026 · 4 days left in the cycle",
  },
  transactions: {
    title: "Transactions",
    subtitle: "184 entries this month across 5 wallets",
  },
  budgets: {
    title: "Budgets",
    subtitle: "6 category budgets · alerts on at 80%",
  },
  wallets: {
    title: "Wallets",
    subtitle: "Accounts and balances you keep by hand",
  },
  goals: { title: "Goals", subtitle: "3 active goals · Rp206.400.000 saved" },
  recurring: {
    title: "Recurring",
    subtitle: "7 scheduled items · Rp5.891.000 per month",
  },
  insights: { title: "Insights", subtitle: "Generated 27 August, 06:00" },
  shared: {
    title: "Shared budget",
    subtitle: "Household with Sari · you are the owner",
  },
  reminders: {
    title: "Reminders",
    subtitle: "6 bills upcoming · 2 budget alerts",
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

export const STREAK_CARD = {
  kicker: "7-month streak",
  body: "Saved above target every month since February.",
} as const;

import type { IconName } from "@/components/ui/icon-sprite";
import { fetchCategoryOptions, listCategories } from "@/lib/api/categories";
import {
  listTransactions,
  type TransactionGroupRecord,
  type TransactionItemRecord,
  type TransactionSummaryRecord,
} from "@/lib/api/transactions";
import { fetchWalletOptions } from "@/lib/api/wallets";
import { requireAccessToken } from "@/lib/auth/session";
import { FALLBACK_MASTER_ID } from "@/lib/category-fields";
import { CATEGORIES } from "@/lib/data/categories";
import {
  addDays,
  formatDayHeading,
  isoDayOf,
  parseIsoDate,
  startOfMonth,
  todayInJakarta,
  toIsoDate,
} from "@/lib/dates";
import { pagedFromTotal, type Paged } from "@/lib/pagination";
import {
  BASE_CURRENCY,
  formatMoney,
  formatSignedMoney,
  formatSignedSums,
  formatSums,
} from "@/lib/format";
import type {
  CategoryKey,
  CategoryKind,
  CurrencyCode,
  LedgerDay,
  LedgerItem,
  MiniStat,
  MoneySum,
  RecentEntry,
  Transaction,
  WalletName,
} from "@/types/ledger";

/** The day the artboard is set on — the slide-over dates itself 27 Aug 2026. */
export const TODAY = "2026-08-27";

/**
 * The ledger, and the only place a money figure is typed in this app.
 *
 * Every number the dashboard, the budgets screen and the insights screen print
 * is summed out of these rows — see `lib/data/ledger.ts`. The artboard hand-wrote
 * its aggregates beside its rows and the two disagreed: its fourteen rows total
 * Rp6.958.000 against a headline of Rp12.780.000. So the aggregates were
 * deleted and the month was written out instead. August 2026 is complete here
 * up to `TODAY`, and the totals it adds up to are the artboard's own.
 *
 * `day` and `walletIcon` are not stored: both are functions of a field that is,
 * and a hand-typed weekday is exactly the kind of thing that drifts. The
 * artboard's rows had every weekday one day out — 27 August 2026 is a Thursday,
 * not the Wednesday it printed.
 *
 * Two rows are in USD, on the Wise account that is kept in it. They are here
 * because a `Wise USD` wallet that only ever received rupiah was a currency
 * model nothing exercised: the overview added dollars to rupiah and printed the
 * answer with an "Rp" in front. Nothing downstream moves because of them —
 * `lib/data/ledger.ts` reduces the base currency alone, so the month's totals
 * are still the fifty-four rupiah rows and still the artboard's own.
 */
type LedgerEntry = {
  readonly id: string;
  readonly date: string;
  readonly name: string;
  readonly note: string;
  readonly category: CategoryKey;
  readonly wallet: WalletName;
  /** Negative is money out. */
  readonly amount: number;
  /**
   * Omitted on a rupiah row, which is almost all of them. It is written out
   * only where the row really is in something else, so the fifty-four rows the
   * month was balanced on are untouched by the field existing.
   */
  readonly currency?: CurrencyCode;
};

const ENTRIES: readonly LedgerEntry[] = [
  // week 4 · 22-28 August — the artboard's own fourteen rows, plus two
  { id: "tx-01", date: "2026-08-27", name: "Kopi Tuku", note: "Tebet · morning", category: "food", wallet: "GoPay", amount: -62000 },
  { id: "tx-02", date: "2026-08-27", name: "Gojek ride", note: "Kuningan to Tebet", category: "transport", wallet: "GoPay", amount: -38000 },
  { id: "tx-03", date: "2026-08-27", name: "Figma Professional", note: "Annual seat, monthly billing", category: "subs", wallet: "BCA Card", amount: -180000 },
  { id: "tx-04", date: "2026-08-26", name: "Invoice #2026-114 — Kalium Labs", note: "Retainer, August sprint", category: "income", wallet: "BCA Payroll", amount: 6800000 },
  { id: "tx-05", date: "2026-08-26", name: "Superindo groceries", note: "Weekly shop", category: "food", wallet: "BCA Card", amount: -427000 },
  { id: "tx-06", date: "2026-08-26", name: "Biznet Home", note: "Internet, 100 Mbps", category: "utilities", wallet: "BCA Payroll", amount: -425000 },
  { id: "tx-07", date: "2026-08-25", name: "Apotek K-24", note: "Prescription refill", category: "health", wallet: "Cash", amount: -164000 },
  { id: "tx-08", date: "2026-08-25", name: "Warung Tegal", note: "Lunch with Sari", category: "food", wallet: "Cash", amount: -54000 },
  { id: "tx-09", date: "2026-08-25", name: "MRT top-up", note: "Kartu Jelajah", category: "transport", wallet: "GoPay", amount: -150000 },
  { id: "tx-10", date: "2026-08-24", name: "August rent", note: "Kost Tebet Barat", category: "housing", wallet: "BCA Payroll", amount: -4500000 },
  { id: "tx-11", date: "2026-08-24", name: "Invoice #2026-113 — Nusatek", note: "Design system audit", category: "income", wallet: "Wise USD", amount: 4650000 },
  { id: "tx-12", date: "2026-08-24", name: "GitHub Copilot", note: "Individual plan", category: "subs", wallet: "BCA Card", amount: -160000 },
  { id: "tx-13", date: "2026-08-23", name: "Uniqlo", note: "Two shirts", category: "other", wallet: "BCA Card", amount: -598000 },
  { id: "tx-14", date: "2026-08-23", name: "PLN token", note: "Electricity, 200k", category: "utilities", wallet: "GoPay", amount: -200000 },
  { id: "tx-15", date: "2026-08-22", name: "Gojek ride", note: "Tebet to Blok M", category: "transport", wallet: "GoPay", amount: -40000 },
  { id: "tx-16", date: "2026-08-22", name: "Tebet Eco Park class", note: "Drop-in session", category: "health", wallet: "GoPay", amount: -100000 },

  // week 3 · 15-21 August
  { id: "tx-17", date: "2026-08-21", name: "Kembang Goela", note: "Client dinner, Nusatek", category: "food", wallet: "BCA Card", amount: -478000 },
  { id: "tx-18", date: "2026-08-21", name: "Ace Hardware", note: "Lampu dan kabel ekstensi", category: "other", wallet: "BCA Card", amount: -180000 },
  { id: "tx-19", date: "2026-08-21", name: "Parkir dan tol", note: "SCBD, pitch day", category: "transport", wallet: "Cash", amount: -75000 },
  { id: "tx-20", date: "2026-08-20", name: "Kantin Tebet", note: "Lunch with Sari", category: "food", wallet: "Cash", amount: -56000 },
  { id: "tx-21", date: "2026-08-20", name: "BPJS Kesehatan", note: "Class I, August", category: "health", wallet: "BCA Payroll", amount: -150000 },
  { id: "tx-22", date: "2026-08-19", name: "Grab ride", note: "Menteng to Tebet", category: "transport", wallet: "GoPay", amount: -47000 },
  { id: "tx-55", date: "2026-08-19", name: "Invoice #2026-115 — Halcyon Studio", note: "Retainer, billed in USD", category: "income", wallet: "Wise USD", amount: 1180, currency: "USD" },
  { id: "tx-23", date: "2026-08-18", name: "Kopi Tuku", note: "Tebet · morning", category: "food", wallet: "GoPay", amount: -62000 },
  { id: "tx-24", date: "2026-08-18", name: "Telkomsel Halo", note: "Postpaid, 25 GB", category: "utilities", wallet: "BCA Card", amount: -127000 },
  { id: "tx-25", date: "2026-08-17", name: "Invoice #2026-112 — Pijar Retail", note: "Landing page revamp", category: "income", wallet: "BCA Payroll", amount: 4200000 },
  { id: "tx-26", date: "2026-08-17", name: "Gojek ride", note: "Tebet to Soekarno-Hatta", category: "transport", wallet: "GoPay", amount: -185000 },
  { id: "tx-27", date: "2026-08-16", name: "Superindo groceries", note: "Weekly shop", category: "food", wallet: "BCA Card", amount: -398000 },
  { id: "tx-28", date: "2026-08-16", name: "Laundry Kiloan Tebet", note: "8 kg, monthly", category: "other", wallet: "Cash", amount: -84000 },
  { id: "tx-29", date: "2026-08-15", name: "MRT top-up", note: "Kartu Jelajah", category: "transport", wallet: "GoPay", amount: -150000 },
  { id: "tx-30", date: "2026-08-15", name: "Canva Pro", note: "Individual plan", category: "subs", wallet: "BCA Card", amount: -138000 },

  // week 2 · 8-14 August
  { id: "tx-31", date: "2026-08-14", name: "AHASS Tebet", note: "Motor service, 12.000 km", category: "transport", wallet: "Cash", amount: -310000 },
  { id: "tx-32", date: "2026-08-13", name: "GoFood — Sate Khas Senayan", note: "Dinner in", category: "food", wallet: "GoPay", amount: -134000 },
  { id: "tx-33", date: "2026-08-12", name: "Notion Plus", note: "One workspace seat", category: "subs", wallet: "BCA Card", amount: -160000 },
  { id: "tx-34", date: "2026-08-12", name: "Gojek ride", note: "Tebet to Kuningan", category: "transport", wallet: "GoPay", amount: -38000 },
  { id: "tx-56", date: "2026-08-12", name: "Vercel Pro", note: "One seat, charged in USD", category: "subs", wallet: "Wise USD", amount: -20, currency: "USD" },
  { id: "tx-35", date: "2026-08-11", name: "Kopi Tuku", note: "Tebet · morning", category: "food", wallet: "GoPay", amount: -62000 },
  { id: "tx-36", date: "2026-08-11", name: "Apotek K-24", note: "Vitamin D3 dan omega", category: "health", wallet: "Cash", amount: -141000 },
  { id: "tx-37", date: "2026-08-10", name: "Pertamina Pertamax", note: "Motor, full tank", category: "transport", wallet: "Cash", amount: -100000 },
  { id: "tx-38", date: "2026-08-10", name: "iCloud+ 200GB", note: "Storage plan", category: "subs", wallet: "BCA Card", amount: -45000 },
  { id: "tx-39", date: "2026-08-09", name: "Superindo groceries", note: "Weekly shop", category: "food", wallet: "BCA Card", amount: -412000 },
  { id: "tx-40", date: "2026-08-09", name: "Kado ulang tahun Sari", note: "Tokopedia", category: "other", wallet: "BCA Card", amount: -320000 },
  { id: "tx-41", date: "2026-08-08", name: "Klinik Pratama Tebet", note: "GP consult", category: "health", wallet: "Cash", amount: -185000 },
  { id: "tx-42", date: "2026-08-08", name: "Grab ride", note: "Kuningan to Tebet", category: "transport", wallet: "GoPay", amount: -55000 },

  // week 1 · 1-7 August
  { id: "tx-43", date: "2026-08-07", name: "PDAM Aetra", note: "Water, August", category: "utilities", wallet: "BCA Payroll", amount: -128000 },
  { id: "tx-44", date: "2026-08-06", name: "Invoice #2026-111 — Kalium Labs", note: "Retainer, July sprint", category: "income", wallet: "BCA Payroll", amount: 5800000 },
  { id: "tx-45", date: "2026-08-06", name: "Warung Tegal", note: "Lunch", category: "food", wallet: "Cash", amount: -48000 },
  { id: "tx-46", date: "2026-08-05", name: "Adobe Creative Cloud", note: "Photography plan", category: "subs", wallet: "BCA Card", amount: -290000 },
  { id: "tx-47", date: "2026-08-05", name: "Gojek ride", note: "Tebet to SCBD", category: "transport", wallet: "GoPay", amount: -42000 },
  { id: "tx-48", date: "2026-08-04", name: "Kopi Tuku", note: "Tebet · morning", category: "food", wallet: "GoPay", amount: -62000 },
  { id: "tx-49", date: "2026-08-04", name: "Gramedia", note: "Two books", category: "other", wallet: "Cash", amount: -178000 },
  { id: "tx-50", date: "2026-08-03", name: "MRT top-up", note: "Kartu Jelajah", category: "transport", wallet: "GoPay", amount: -150000 },
  { id: "tx-51", date: "2026-08-03", name: "PLN token", note: "Electricity, 100k", category: "utilities", wallet: "GoPay", amount: -100000 },
  { id: "tx-52", date: "2026-08-02", name: "Superindo groceries", note: "Weekly shop", category: "food", wallet: "BCA Card", amount: -385000 },
  { id: "tx-53", date: "2026-08-02", name: "Netflix Standard", note: "Two screens", category: "subs", wallet: "BCA Card", amount: -120000 },
  { id: "tx-54", date: "2026-08-01", name: "Spotify Premium Family", note: "Six seats", category: "subs", wallet: "BCA Card", amount: -87000 },
];

/** Which tile a wallet wears in a ledger row. One per wallet, not one per row. */
const WALLET_ICON: Readonly<Record<WalletName, IconName>> = {
  "BCA Payroll": "bank",
  "BCA Card": "card",
  GoPay: "phone",
  Cash: "cash",
  "Wise USD": "globe",
};

/** The ledger as every screen reads it: newest first, headings resolved. */
export const TRANSACTIONS: readonly Transaction[] = ENTRIES.map((entry) => ({
  ...entry,
  day: formatDayHeading(entry.date),
  walletIcon: WALLET_ICON[entry.wallet],
  currency: entry.currency ?? BASE_CURRENCY,
}));

export const RANGE_FILTER_OPTIONS = [
  "This month",
  "Last 90 days",
  "Year to date",
] as const;

export type RangeFilter = (typeof RANGE_FILTER_OPTIONS)[number];

/**
 * The type filter, replacing the artboard's amount buckets: the backend filters
 * by direction (`income` | `expense`), and "" is every type. The value is the
 * one the API takes; the label is what the select shows.
 */
export const TYPE_FILTER_OPTIONS: readonly {
  readonly value: string;
  readonly label: string;
}[] = [
  { value: "", label: "Any type" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

export type TypeFilter = "" | "income" | "expense";

export const TYPE_FILTER_VALUES: readonly TypeFilter[] = ["", "income", "expense"];

export const TRANSACTION_PAGE_SIZES = [10, 25, 50] as const;

export const WALLET_NAMES: readonly WalletName[] = [
  "BCA Payroll",
  "BCA Card",
  "GoPay",
  "Cash",
  "Wise USD",
];

/* ── the filter dropdowns, read live from the API ──────────────────────── */

export type FilterOption = { readonly value: string; readonly label: string };

export type TransactionFilterOptions = {
  readonly categories: readonly FilterOption[];
  readonly wallets: readonly FilterOption[];
};

/** The sentinel row every dropdown opens on: no filter at all. */
const ALL_CATEGORIES: FilterOption = { value: "", label: "All categories" };
const ALL_WALLETS: FilterOption = { value: "", label: "All wallets" };

function toFilterOption(option: {
  readonly id: string;
  readonly name: string;
}): FilterOption {
  return { value: option.id, label: option.name };
}

/**
 * The category and wallet options the filter bar offers, each posting an id.
 * Read from the same endpoints the rest of the app uses — `?slug=filter` for
 * categories, `/wallets/options` for wallets — so a category or wallet added
 * elsewhere is filterable at once. Either failing degrades to just its "All"
 * row rather than emptying the bar.
 */
export async function getTransactionFilterOptions(): Promise<TransactionFilterOptions> {
  const accessToken = await requireAccessToken();
  const [categories, wallets] = await Promise.all([
    fetchCategoryOptions(accessToken, "filter"),
    fetchWalletOptions(accessToken),
  ]);

  return {
    categories: [
      ALL_CATEGORIES,
      ...(categories.ok ? categories.data.map(toFilterOption) : []),
    ],
    wallets: [ALL_WALLETS, ...(wallets.ok ? wallets.data.map(toFilterOption) : [])],
  };
}

/* ── the add-transaction sheet's selects ───────────────────────────────── */

export type ComposerOption = { readonly id: string; readonly name: string };

export type TransactionComposer = {
  readonly categories: readonly ComposerOption[];
  readonly wallets: readonly ComposerOption[];
  /** The "Other" bucket, which the sheet offers to name instead of file under. */
  readonly fallbackCategoryId: string;
  readonly fallbackCategoryName: string;
};

/**
 * The categories and wallets the add-transaction sheet posts by id. Categories
 * are read whole rather than as options, so the sheet can tell which row is the
 * fallback — the one it offers to name — from its master link.
 */
export async function getTransactionComposer(): Promise<TransactionComposer> {
  const accessToken = await requireAccessToken();
  const [categories, wallets] = await Promise.all([
    listCategories(accessToken),
    fetchWalletOptions(accessToken),
  ]);

  const rows = categories.ok ? categories.data : [];
  const fallback = rows.find((row) => row.masterId === FALLBACK_MASTER_ID);

  return {
    categories: rows.map((row) => ({ id: row.id, name: row.name })),
    wallets: wallets.ok ? wallets.data.map((w) => ({ id: w.id, name: w.name })) : [],
    fallbackCategoryId: fallback?.id ?? "",
    fallbackCategoryName: fallback?.name ?? "",
  };
}

/* ── the query the screen runs ─────────────────────────────────────────── */

export type TransactionFilters = {
  readonly query: string;
  /** A category id, or "" for every category. */
  readonly category: string;
  readonly wallet: string;
  readonly type: TypeFilter;
  readonly range: RangeFilter;
  readonly page: number;
  readonly size: number;
};

/** The workspace keeps Jakarta time, so a range is bounded in Jakarta's zone. */
const JAKARTA_OFFSET = "+07:00";
const YEAR_START_SUFFIX = "-01-01";
/** "Last 90 days" is today and the 89 days before it, inclusive. */
const LAST_90_LOOKBACK = 89;

/** A preset range, resolved to the RFC3339 bounds the backend filters on. */
function rangeBounds(range: RangeFilter): {
  readonly from: string;
  readonly to: string;
} {
  const today = todayInJakarta();
  const parsed = parseIsoDate(today);
  if (!parsed) {
    return { from: "", to: "" };
  }

  let fromDay: string;
  if (range === "This month") {
    fromDay = toIsoDate(startOfMonth(parsed));
  } else if (range === "Year to date") {
    fromDay = `${today.slice(0, 4)}${YEAR_START_SUFFIX}`;
  } else {
    fromDay = toIsoDate(addDays(parsed, -LAST_90_LOOKBACK));
  }

  return {
    from: `${fromDay}T00:00:00${JAKARTA_OFFSET}`,
    to: `${today}T23:59:59${JAKARTA_OFFSET}`,
  };
}

/* ── resolving a row's icons from its live names ────────────────────────── */

/**
 * A live category name to the tile the artboard drew it with, when the account
 * is still on one of the seven seeded names; otherwise its direction's tile.
 * The list endpoint states the name, not the icon, so the icon is resolved here.
 */
const CATEGORY_ICON_BY_LABEL: Readonly<Record<string, IconName>> =
  Object.fromEntries(
    Object.values(CATEGORIES).map((category): [string, IconName] => [
      category.label.toLowerCase(),
      category.icon,
    ]),
  );

const INCOME_ICON: IconName = "bank";
const EXPENSE_ICON: IconName = "bag";

function categoryIconFor(name: string, type: CategoryKind): IconName {
  return (
    CATEGORY_ICON_BY_LABEL[name.toLowerCase()] ??
    (type === "income" ? INCOME_ICON : EXPENSE_ICON)
  );
}

/** The fixture's wallet tiles, by name; anything else gets the generic wallet. */
const WALLET_ICON_BY_NAME: Readonly<Record<string, IconName>> = WALLET_ICON;
const FALLBACK_WALLET_ICON: IconName = "wallet";

function walletIconFor(name: string): IconName {
  return WALLET_ICON_BY_NAME[name] ?? FALLBACK_WALLET_ICON;
}

function toItem(record: TransactionItemRecord): LedgerItem {
  return {
    id: record.id,
    name: record.name,
    note: record.note,
    categoryName: record.categoryName,
    categoryIcon: categoryIconFor(record.categoryName, record.type),
    walletName: record.walletName,
    walletIcon: walletIconFor(record.walletName),
    amount: record.amount,
    currency: record.currency,
  };
}

/** A day's net per currency, folded from its own rows, base currency first. */
function netOf(items: readonly TransactionItemRecord[]): readonly MoneySum[] {
  const byCurrency = new Map<CurrencyCode, number>();
  for (const item of items) {
    byCurrency.set(item.currency, (byCurrency.get(item.currency) ?? 0) + item.amount);
  }

  const sums: MoneySum[] = [...byCurrency].map(([currency, amount]) => ({
    currency,
    amount,
  }));
  return [
    ...sums.filter((sum) => sum.currency === BASE_CURRENCY),
    ...sums.filter((sum) => sum.currency !== BASE_CURRENCY),
  ];
}

function toDay(group: TransactionGroupRecord): LedgerDay {
  return {
    day: formatDayHeading(isoDayOf(group.occurredAt)),
    net: netOf(group.items),
    items: group.items.map(toItem),
  };
}

/* ── the stats strip, from the backend's summary ───────────────────────── */

const UNCONVERTED = "unconverted";

/** Only the currencies the headline cannot state reach the summary's list. */
function unsignedNote(sums: readonly MoneySum[]): string | undefined {
  return sums.length === 0
    ? undefined
    : `Plus ${formatSums(sums)}, ${UNCONVERTED}`;
}

function signedNote(sums: readonly MoneySum[]): string | undefined {
  return sums.length === 0
    ? undefined
    : `${formatSignedSums(sums)}, ${UNCONVERTED}`;
}

function shownNote(summary: TransactionSummaryRecord): string | undefined {
  return summary.otherEntries === 0
    ? undefined
    : `${summary.otherEntries} not in ${summary.baseCurrency}`;
}

function buildStats(
  summary: TransactionSummaryRecord,
  total: number,
): readonly MiniStat[] {
  const base = summary.baseCurrency;
  const moneyIn = summary.byCurrency.map((row) => ({
    currency: row.currency,
    amount: row.moneyIn,
  }));
  const moneyOut = summary.byCurrency.map((row) => ({
    currency: row.currency,
    amount: row.moneyOut,
  }));
  const net = summary.byCurrency.map((row) => ({
    currency: row.currency,
    amount: row.net,
  }));

  return [
    {
      id: "shown",
      label: "Shown",
      value: `${total} entries`,
      tone: "text",
      note: shownNote(summary),
    },
    {
      id: "in",
      label: "Money in",
      value: formatMoney(summary.moneyIn, base),
      tone: "income",
      note: unsignedNote(moneyIn),
    },
    {
      id: "out",
      label: "Money out",
      value: formatMoney(summary.moneyOut, base),
      tone: "expense",
      note: unsignedNote(moneyOut),
    },
    {
      id: "net",
      label: "Net",
      value: formatSignedMoney(summary.net, base),
      tone: summary.net >= 0 ? "income" : "expense",
      note: signedNote(net),
    },
  ];
}

/** The zeroed strip a screen shows when the API could not answer at all. */
function emptyStats(): readonly MiniStat[] {
  return buildStats(
    {
      baseCurrency: BASE_CURRENCY,
      moneyIn: 0,
      moneyOut: 0,
      net: 0,
      otherEntries: 0,
      byCurrency: [],
    },
    0,
  );
}

/* ── the screen ────────────────────────────────────────────────────────── */

export type LedgerScreen = {
  readonly groups: readonly LedgerDay[];
  readonly stats: readonly MiniStat[];
  readonly page: Paged<LedgerItem>;
  readonly isEmpty: boolean;
  /** Why the screen is empty, when the API could not answer at all. */
  readonly error: string;
};

/**
 * The transactions screen, served from `ledgerline-backend`. The list is
 * grouped and summed in SQL, so the rows, the day nets and the four stats are
 * all one read — nothing is re-derived here that the backend already stated.
 */
export async function getTransactions(
  filters: TransactionFilters,
): Promise<LedgerScreen> {
  const accessToken = await requireAccessToken();
  const bounds = rangeBounds(filters.range);
  const result = await listTransactions(accessToken, {
    search: filters.query,
    category: filters.category,
    wallet: filters.wallet,
    type: filters.type,
    occurredFrom: bounds.from,
    occurredTo: bounds.to,
    page: filters.page,
    perPage: filters.size,
  });

  if (!result.ok) {
    return {
      groups: [],
      stats: emptyStats(),
      page: pagedFromTotal<LedgerItem>([], filters.page, filters.size, 0),
      isEmpty: true,
      error: result.error.message,
    };
  }

  const total = result.meta?.totalItems ?? 0;
  const items = result.data.groups.flatMap((group) => group.items.map(toItem));

  return {
    groups: result.data.groups.map(toDay),
    stats: buildStats(result.data.summary, total),
    page: pagedFromTotal(items, filters.page, filters.size, total),
    isEmpty: total === 0,
    error: "",
  };
}

/* ── the dashboard's recent panel ──────────────────────────────────────── */

const RECENT_COUNT = 7;

export type RecentTransactions = {
  readonly items: readonly RecentEntry[];
  /** Why the panel is empty, when the API could not answer at all. */
  readonly error: string;
};

/** "Wednesday, 27 August" without the weekday — the row already has the month. */
function dayLabelOf(occurredAt: string): string {
  const [, label = ""] = formatDayHeading(isoDayOf(occurredAt)).split(", ");
  return label;
}

/**
 * The newest seven entries, unfiltered.
 *
 * No date bound is sent: the panel answers "what was recorded last", which an
 * account that has not spent this month still has an answer to. That also makes
 * an empty result mean exactly one thing — nothing has ever been recorded — so
 * the setup checklist can tick its last step from it.
 */
export async function getRecentTransactions(): Promise<RecentTransactions> {
  const accessToken = await requireAccessToken();
  const result = await listTransactions(accessToken, {
    search: "",
    category: "",
    wallet: "",
    type: "",
    occurredFrom: "",
    occurredTo: "",
    page: 1,
    perPage: RECENT_COUNT,
  });

  if (!result.ok) {
    return { items: [], error: result.error.message };
  }

  const items = result.data.groups.flatMap((group) =>
    group.items.map((item) => ({
      ...toItem(item),
      dayLabel: dayLabelOf(group.occurredAt),
    })),
  );
  return { items: items.slice(0, RECENT_COUNT), error: "" };
}

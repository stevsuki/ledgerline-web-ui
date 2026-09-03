import type { IconName } from "@/components/ui/icon-sprite";
import { CATEGORIES } from "@/lib/data/categories";
import { formatDayHeading } from "@/lib/dates";
import { paginate, type Paged } from "@/lib/pagination";
import { formatRupiah, formatSignedRupiah } from "@/lib/format";
import type {
  CategoryKey,
  MiniStat,
  Transaction,
  TransactionGroup,
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
}));

export const CATEGORY_FILTER_OPTIONS = [
  "All categories",
  ...Object.values(CATEGORIES).map((category) => category.label),
] as const;

export const WALLET_FILTER_OPTIONS = [
  "All wallets",
  "BCA Payroll",
  "BCA Card",
  "GoPay",
  "Cash",
  "Wise USD",
] as const;

export const RANGE_FILTER_OPTIONS = [
  "This month",
  "Last 90 days",
  "Year to date",
] as const;

export const AMOUNT_FILTER_OPTIONS = [
  "Any amount",
  "Under Rp100.000",
  "Rp100.000 – Rp1.000.000",
  "Over Rp1.000.000",
] as const;

export const TRANSACTION_PAGE_SIZES = [10, 25, 50] as const;

export const WALLET_NAMES: readonly WalletName[] = [
  "BCA Payroll",
  "BCA Card",
  "GoPay",
  "Cash",
  "Wise USD",
];

export type TransactionFilters = {
  readonly query: string;
  readonly category: (typeof CATEGORY_FILTER_OPTIONS)[number];
  readonly wallet: (typeof WALLET_FILTER_OPTIONS)[number];
  readonly range: (typeof RANGE_FILTER_OPTIONS)[number];
  readonly amount: (typeof AMOUNT_FILTER_OPTIONS)[number];
  readonly page: number;
  readonly size: number;
};

const AMOUNT_BOUNDS: Readonly<
  Record<(typeof AMOUNT_FILTER_OPTIONS)[number], { min: number; max: number }>
> = {
  "Any amount": { min: 0, max: Number.POSITIVE_INFINITY },
  "Under Rp100.000": { min: 0, max: 100_000 },
  "Rp100.000 – Rp1.000.000": { min: 100_000, max: 1_000_000 },
  "Over Rp1.000.000": { min: 1_000_000, max: Number.POSITIVE_INFINITY },
};

const RANGE_DAYS: Readonly<
  Record<(typeof RANGE_FILTER_OPTIONS)[number], number>
> = {
  "This month": 31,
  "Last 90 days": 90,
  "Year to date": 365,
};

const MS_PER_DAY = 86_400_000;

function matchesAmount(
  amount: number,
  option: (typeof AMOUNT_FILTER_OPTIONS)[number],
): boolean {
  const value = Math.abs(amount);
  const { min, max } = AMOUNT_BOUNDS[option];
  if (option === "Under Rp100.000") {
    return value < max;
  }
  if (option === "Over Rp1.000.000") {
    return value > min;
  }
  return value >= min && value <= max;
}

function matchesRange(
  date: string,
  option: (typeof RANGE_FILTER_OPTIONS)[number],
): boolean {
  const days = (Date.parse(TODAY) - Date.parse(date)) / MS_PER_DAY;
  return days >= 0 && days <= RANGE_DAYS[option];
}

function matchesQuery(transaction: Transaction, query: string): boolean {
  if (!query) {
    return true;
  }
  const haystack = `${transaction.name} ${transaction.note}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function matchesCategory(
  transaction: Transaction,
  option: (typeof CATEGORY_FILTER_OPTIONS)[number],
): boolean {
  return (
    option === "All categories" ||
    CATEGORIES[transaction.category].label === option
  );
}

/** Rows carry their own day heading, so grouping is a stable single pass. */
function groupByDay(items: readonly Transaction[]): TransactionGroup[] {
  const groups: TransactionGroup[] = [];

  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.day === item.day) {
      groups[groups.length - 1] = {
        day: last.day,
        net: last.net + item.amount,
        items: [...last.items, item],
      };
      continue;
    }
    groups.push({ day: item.day, net: item.amount, items: [item] });
  }

  return groups;
}

function buildStats(matches: readonly Transaction[]): MiniStat[] {
  const moneyIn = matches
    .filter((item) => item.amount > 0)
    .reduce((total, item) => total + item.amount, 0);
  const moneyOut = matches
    .filter((item) => item.amount < 0)
    .reduce((total, item) => total - item.amount, 0);
  const net = moneyIn - moneyOut;

  return [
    { id: "shown", label: "Shown", value: `${matches.length} entries`, tone: "text" },
    { id: "in", label: "Money in", value: formatRupiah(moneyIn), tone: "income" },
    { id: "out", label: "Money out", value: formatRupiah(moneyOut), tone: "expense" },
    {
      id: "net",
      label: "Net",
      value: formatSignedRupiah(net),
      tone: net >= 0 ? "income" : "expense",
    },
  ];
}

export type TransactionsResult = {
  readonly groups: readonly TransactionGroup[];
  readonly stats: readonly MiniStat[];
  readonly page: Paged<Transaction>;
  readonly isEmpty: boolean;
};

export async function getTransactions(
  filters: TransactionFilters,
): Promise<TransactionsResult> {
  const matches = TRANSACTIONS.filter(
    (transaction) =>
      matchesQuery(transaction, filters.query) &&
      matchesCategory(transaction, filters.category) &&
      (filters.wallet === "All wallets" || transaction.wallet === filters.wallet) &&
      matchesRange(transaction.date, filters.range) &&
      matchesAmount(transaction.amount, filters.amount),
  );

  const page = paginate(matches, filters.page, filters.size);

  return {
    groups: groupByDay(page.items),
    stats: buildStats(matches),
    page,
    isEmpty: matches.length === 0,
  };
}

/** The dashboard's "Recent transactions" panel shows the newest seven. */
export async function getRecentTransactions(): Promise<readonly Transaction[]> {
  return TRANSACTIONS.slice(0, 7);
}

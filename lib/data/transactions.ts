import { CATEGORIES } from "@/lib/data/categories";
import { paginate, type Paged } from "@/lib/pagination";
import { formatRupiah, formatSignedRupiah } from "@/lib/format";
import type {
  MiniStat,
  Transaction,
  TransactionGroup,
  WalletName,
} from "@/types/ledger";

/** The day the artboard is set on — the slide-over dates itself 27 Aug 2026. */
export const TODAY = "2026-08-27";

/** The artboard's `TX` fixture (Finance App.dc.html, lines ~1505-1522). */
const TRANSACTIONS: readonly Transaction[] = [
  { id: "tx-01", date: "2026-08-27", day: "Wednesday, 27 August", name: "Kopi Tuku", note: "Tebet · morning", category: "food", wallet: "GoPay", walletIcon: "phone", amount: -62000 },
  { id: "tx-02", date: "2026-08-27", day: "Wednesday, 27 August", name: "Gojek ride", note: "Kuningan → Tebet", category: "transport", wallet: "GoPay", walletIcon: "phone", amount: -38000 },
  { id: "tx-03", date: "2026-08-27", day: "Wednesday, 27 August", name: "Figma Professional", note: "Annual seat, monthly billing", category: "subs", wallet: "BCA Card", walletIcon: "card", amount: -180000 },
  { id: "tx-04", date: "2026-08-26", day: "Tuesday, 26 August", name: "Invoice #2026-114 — Kalium Labs", note: "Retainer, August sprint", category: "income", wallet: "BCA Payroll", walletIcon: "bank", amount: 6800000 },
  { id: "tx-05", date: "2026-08-26", day: "Tuesday, 26 August", name: "Superindo groceries", note: "Weekly shop", category: "food", wallet: "BCA Card", walletIcon: "card", amount: -427000 },
  { id: "tx-06", date: "2026-08-26", day: "Tuesday, 26 August", name: "Biznet Home", note: "Internet, 100 Mbps", category: "utilities", wallet: "BCA Payroll", walletIcon: "bank", amount: -425000 },
  { id: "tx-07", date: "2026-08-25", day: "Monday, 25 August", name: "Apotek K-24", note: "Prescription refill", category: "health", wallet: "Cash", walletIcon: "cash", amount: -164000 },
  { id: "tx-08", date: "2026-08-25", day: "Monday, 25 August", name: "Warung Tegal", note: "Lunch with Sari", category: "food", wallet: "Cash", walletIcon: "cash", amount: -54000 },
  { id: "tx-09", date: "2026-08-25", day: "Monday, 25 August", name: "MRT top-up", note: "Kartu Jelajah", category: "transport", wallet: "GoPay", walletIcon: "phone", amount: -150000 },
  { id: "tx-10", date: "2026-08-24", day: "Sunday, 24 August", name: "August rent", note: "Kost Tebet Barat", category: "housing", wallet: "BCA Payroll", walletIcon: "bank", amount: -4500000 },
  { id: "tx-11", date: "2026-08-24", day: "Sunday, 24 August", name: "Invoice #2026-113 — Nusatek", note: "Design system audit", category: "income", wallet: "Wise USD", walletIcon: "globe", amount: 4650000 },
  { id: "tx-12", date: "2026-08-24", day: "Sunday, 24 August", name: "GitHub Copilot", note: "Individual plan", category: "subs", wallet: "BCA Card", walletIcon: "card", amount: -160000 },
  { id: "tx-13", date: "2026-08-23", day: "Saturday, 23 August", name: "Uniqlo", note: "Two shirts", category: "other", wallet: "BCA Card", walletIcon: "card", amount: -598000 },
  { id: "tx-14", date: "2026-08-23", day: "Saturday, 23 August", name: "PLN token", note: "Electricity, 200k", category: "utilities", wallet: "GoPay", walletIcon: "phone", amount: -200000 },
];

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

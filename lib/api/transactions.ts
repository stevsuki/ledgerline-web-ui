import {
  apiRequest,
  withParsed,
  withQuery,
  withoutData,
} from "@/lib/api/client";
import { isRecord, readEnum, readNumber, readString } from "@/lib/api/parse";
import { CURRENCY_ORDER } from "@/lib/wallet-fields";
import type { ApiResult } from "@/types/api";
import type { CategoryKind, CurrencyCode } from "@/types/ledger";

/**
 * The `/transactions` endpoints.
 *
 * The list is already grouped by day and summed per currency by the backend, so
 * this layer states what the API states and nothing more — how a row prints is
 * decided in `lib/data/transactions.ts`. A transaction carries a `type`
 * (`income` | `expense`), and its amount is signed to match: income is
 * positive, expense negative, which the backend enforces on write.
 */

const TRANSACTIONS = "/transactions";

/** The two directions a transaction runs; the same pair a category is. */
const TX_TYPE_ORDER: readonly CategoryKind[] = ["expense", "income"];

/* ── the shapes the API states ─────────────────────────────────────────── */

export type TransactionItemRecord = {
  readonly id: string;
  readonly categoryId: string;
  readonly walletId: string;
  readonly categoryName: string;
  readonly walletName: string;
  readonly name: string;
  readonly note: string;
  readonly type: CategoryKind;
  /** Negative is money out; the sign already agrees with `type`. */
  readonly amount: number;
  readonly currency: CurrencyCode;
  readonly occurredAt: string;
};

export type TransactionGroupRecord = {
  readonly occurredAt: string;
  readonly items: readonly TransactionItemRecord[];
};

/** One currency's totals — only the currencies the headline cannot state. */
export type CurrencyTotalRecord = {
  readonly currency: CurrencyCode;
  readonly moneyIn: number;
  readonly moneyOut: number;
  readonly net: number;
  readonly entries: number;
};

export type TransactionSummaryRecord = {
  readonly baseCurrency: CurrencyCode;
  readonly moneyIn: number;
  /** Negative, the way the backend sums expense. */
  readonly moneyOut: number;
  readonly net: number;
  readonly otherEntries: number;
  readonly byCurrency: readonly CurrencyTotalRecord[];
};

export type TransactionListRecord = {
  readonly summary: TransactionSummaryRecord;
  readonly groups: readonly TransactionGroupRecord[];
};

/* ── parsing ───────────────────────────────────────────────────────────── */

function parseItem(raw: unknown): TransactionItemRecord | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = readString(raw, "id");
  if (!id) {
    return null;
  }

  return {
    id,
    categoryId: readString(raw, "category_id") ?? "",
    walletId: readString(raw, "wallet_id") ?? "",
    categoryName: readString(raw, "category_name") ?? "",
    walletName: readString(raw, "wallet_name") ?? "",
    name: readString(raw, "name") ?? "",
    note: readString(raw, "note") ?? "",
    type: readEnum(raw, "type", TX_TYPE_ORDER, "expense"),
    amount: readNumber(raw, "amount") ?? 0,
    currency: readEnum(raw, "currency", CURRENCY_ORDER, "IDR"),
    occurredAt: readString(raw, "occurred_at") ?? "",
  };
}

function parseItems(raw: unknown): readonly TransactionItemRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const items: TransactionItemRecord[] = [];
  for (const entry of raw) {
    const item = parseItem(entry);
    if (item) {
      items.push(item);
    }
  }
  return items;
}

function parseGroups(raw: unknown): readonly TransactionGroupRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const groups: TransactionGroupRecord[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) {
      continue;
    }
    groups.push({
      occurredAt: readString(entry, "occurred_at") ?? "",
      items: parseItems(entry.items),
    });
  }
  return groups;
}

function parseCurrencyTotals(raw: unknown): readonly CurrencyTotalRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const totals: CurrencyTotalRecord[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) {
      continue;
    }
    totals.push({
      currency: readEnum(entry, "currency", CURRENCY_ORDER, "IDR"),
      moneyIn: readNumber(entry, "money_in") ?? 0,
      moneyOut: readNumber(entry, "money_out") ?? 0,
      net: readNumber(entry, "net") ?? 0,
      entries: readNumber(entry, "entries") ?? 0,
    });
  }
  return totals;
}

function parseSummary(raw: unknown): TransactionSummaryRecord {
  if (!isRecord(raw)) {
    return EMPTY_SUMMARY;
  }

  return {
    baseCurrency: readEnum(raw, "base_currency", CURRENCY_ORDER, "IDR"),
    moneyIn: readNumber(raw, "money_in") ?? 0,
    moneyOut: readNumber(raw, "money_out") ?? 0,
    net: readNumber(raw, "net") ?? 0,
    otherEntries: readNumber(raw, "other_entries") ?? 0,
    byCurrency: parseCurrencyTotals(raw.by_currency),
  };
}

const EMPTY_SUMMARY: TransactionSummaryRecord = {
  baseCurrency: "IDR",
  moneyIn: 0,
  moneyOut: 0,
  net: 0,
  otherEntries: 0,
  byCurrency: [],
};

/** Always an object: an empty ledger is `{ summary, groups: [] }`, not null. */
function parseList(raw: unknown): TransactionListRecord {
  if (!isRecord(raw)) {
    return { summary: EMPTY_SUMMARY, groups: [] };
  }
  return {
    summary: parseSummary(raw.summary),
    groups: parseGroups(raw.groups),
  };
}

/* ── reads ─────────────────────────────────────────────────────────────── */

export type TransactionListQuery = {
  readonly search: string;
  /** A category id, or "" for every category. */
  readonly category: string;
  readonly wallet: string;
  /** "income" | "expense", or "" for both. */
  readonly type: string;
  /** RFC3339, or "" for no bound. */
  readonly occurredFrom: string;
  readonly occurredTo: string;
  readonly page: number;
  readonly perPage: number;
};

/**
 * GET /transactions — the day-grouped list and its summary, paged. The meta
 * rides on the result, as it does for every other paged endpoint.
 */
export async function listTransactions(
  accessToken: string,
  query: TransactionListQuery,
): Promise<ApiResult<TransactionListRecord>> {
  const result = await apiRequest({
    path: withQuery(TRANSACTIONS, {
      search: query.search,
      category: query.category,
      wallet: query.wallet,
      type: query.type,
      occurred_from: query.occurredFrom,
      occurred_to: query.occurredTo,
      page: query.page,
      per_page: query.perPage,
    }),
    method: "GET",
    accessToken,
  });
  return result.ok ? { ...result, data: parseList(result.data) } : result;
}

/* ── writes ────────────────────────────────────────────────────────────── */

export type TransactionInput = {
  readonly categoryId: string;
  readonly walletId: string;
  readonly name: string;
  readonly note: string;
  readonly type: CategoryKind;
  /** Signed to match `type`: the backend rejects a mismatch, and zero. */
  readonly amount: number;
  readonly currency: CurrencyCode;
  /** RFC3339. */
  readonly occurredAt: string;
};

function transactionBody(input: TransactionInput): Record<string, unknown> {
  return {
    category_id: input.categoryId,
    wallet_id: input.walletId,
    name: input.name,
    note: input.note,
    type: input.type,
    amount: input.amount,
    currency: input.currency,
    occurred_at: input.occurredAt,
  };
}

/** POST /transactions */
export async function createTransaction(
  accessToken: string,
  input: TransactionInput,
): Promise<ApiResult<null>> {
  return withoutData(
    await apiRequest({
      path: TRANSACTIONS,
      method: "POST",
      accessToken,
      body: transactionBody(input),
    }),
  );
}

/* ── the dashboard's two reads ─────────────────────────────────────────── */

const OVERVIEW = `${TRANSACTIONS}/overview`;
const TREND = `${TRANSACTIONS}/trend`;

/** One category's spend inside a period, stated positive by the backend. */
export type CategorySpendRecord = {
  readonly categoryId: string;
  readonly name: string;
  /** "" when the category has no tile of its own; the reader resolves it. */
  readonly icon: string;
  readonly color: string;
  readonly spent: number;
};

/**
 * One period's totals. `moneyOut` is negative, as the rows are stored, so `net`
 * is the two added rather than a subtraction invented on this side.
 */
export type TransactionPeriodRecord = {
  readonly moneyIn: number;
  readonly moneyOut: number;
  readonly net: number;
  readonly incomeEntries: number;
  readonly expenseEntries: number;
  readonly byCategory: readonly CategorySpendRecord[];
};

/**
 * The reported month beside the month its deltas are measured against.
 *
 * Both periods are counted the same way, which is the only reason a ratio of the
 * two means anything. Deciding what to print when `previous` is empty is this
 * app's job, not the API's — see `lib/data/analytics.ts`.
 */
export type TransactionOverviewRecord = {
  readonly baseCurrency: CurrencyCode;
  /** "2026-09" — the month the figures belong to. */
  readonly month: string;
  readonly current: TransactionPeriodRecord;
  readonly previous: TransactionPeriodRecord;
  /** Rows outside the base currency, counted but never added in. */
  readonly otherEntries: number;
};

/** One bar. The backend sends the period it starts on; the label is written here. */
export type TrendPointRecord = {
  readonly start: string;
  readonly moneyIn: number;
  readonly moneyOut: number;
};

export type TransactionTrendRange = "weekly" | "monthly";

export type TransactionTrendRecord = {
  readonly baseCurrency: CurrencyCode;
  readonly range: TransactionTrendRange;
  readonly points: readonly TrendPointRecord[];
};

/** A figure the API stated, or 0 when it stated none. */
function figure(raw: Record<string, unknown>, key: string): number {
  return readNumber(raw, key) ?? 0;
}

function parseCategorySpend(raw: unknown): CategorySpendRecord | null {
  if (!isRecord(raw)) {
    return null;
  }

  const categoryId = readString(raw, "category_id");
  if (!categoryId) {
    return null;
  }

  return {
    categoryId,
    name: readString(raw, "name") ?? "",
    icon: readString(raw, "icon") ?? "",
    color: readString(raw, "color") ?? "",
    spent: figure(raw, "spent"),
  };
}

function parseCategorySpends(raw: unknown): readonly CategorySpendRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const entries: CategorySpendRecord[] = [];
  for (const entry of raw) {
    const parsed = parseCategorySpend(entry);
    if (parsed) {
      entries.push(parsed);
    }
  }
  return entries;
}

const EMPTY_PERIOD: TransactionPeriodRecord = {
  moneyIn: 0,
  moneyOut: 0,
  net: 0,
  incomeEntries: 0,
  expenseEntries: 0,
  byCategory: [],
};

function parsePeriod(raw: unknown): TransactionPeriodRecord {
  if (!isRecord(raw)) {
    return EMPTY_PERIOD;
  }

  return {
    moneyIn: figure(raw, "money_in"),
    moneyOut: figure(raw, "money_out"),
    net: figure(raw, "net"),
    incomeEntries: figure(raw, "income_entries"),
    expenseEntries: figure(raw, "expense_entries"),
    byCategory: parseCategorySpends(raw.by_category),
  };
}

function parseOverview(raw: unknown): TransactionOverviewRecord | null {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    baseCurrency: readEnum(raw, "base_currency", CURRENCY_ORDER, "IDR"),
    month: readString(raw, "month") ?? "",
    current: parsePeriod(raw.current),
    previous: parsePeriod(raw.previous),
    otherEntries: figure(raw, "other_entries"),
  };
}

const TREND_RANGES: readonly TransactionTrendRange[] = ["weekly", "monthly"];

function parseTrendPoint(raw: unknown): TrendPointRecord | null {
  if (!isRecord(raw)) {
    return null;
  }

  const start = readString(raw, "start");
  if (!start) {
    return null;
  }

  return {
    start,
    moneyIn: figure(raw, "money_in"),
    moneyOut: figure(raw, "money_out"),
  };
}

function parseTrend(raw: unknown): TransactionTrendRecord | null {
  if (!isRecord(raw)) {
    return null;
  }

  const points: TrendPointRecord[] = [];
  if (Array.isArray(raw.points)) {
    for (const entry of raw.points) {
      const point = parseTrendPoint(entry);
      if (point) {
        points.push(point);
      }
    }
  }

  return {
    baseCurrency: readEnum(raw, "base_currency", CURRENCY_ORDER, "IDR"),
    range: readEnum(raw, "range", TREND_RANGES, "weekly"),
    points,
  };
}

/**
 * GET /transactions/overview — the dashboard's month and the one before it.
 *
 * One call for both periods on purpose: every delta on the screen divides one by
 * the other, and two calls could read the ledger a transaction apart.
 */
export async function fetchTransactionOverview(
  accessToken: string,
): Promise<ApiResult<TransactionOverviewRecord>> {
  return withParsed(
    await apiRequest({ path: OVERVIEW, method: "GET", accessToken }),
    parseOverview,
  );
}

/** GET /transactions/trend — one point per period, empty periods included. */
export async function fetchTransactionTrend(
  accessToken: string,
  range: TransactionTrendRange,
): Promise<ApiResult<TransactionTrendRecord>> {
  return withParsed(
    await apiRequest({
      path: withQuery(TREND, { range }),
      method: "GET",
      accessToken,
    }),
    parseTrend,
  );
}

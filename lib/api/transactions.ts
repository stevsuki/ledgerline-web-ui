import {
  apiRequest,
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

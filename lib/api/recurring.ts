import { apiRequest, withParsed, withQuery, withoutData } from "@/lib/api/client";
import { knownIconOrBlank } from "@/lib/api/icon-key";
import {
  isRecord,
  readBoolean,
  readEnum,
  readNumber,
  readString,
} from "@/lib/api/parse";
import type { IconKey } from "@/lib/icon-choice";
import {
  RECURRING_FREQUENCIES,
  type RecurringFrequency,
} from "@/lib/recurring-fields";
import { CURRENCY_ORDER } from "@/lib/wallet-fields";
import type { ApiResult } from "@/types/api";
import type { CurrencyCode } from "@/types/ledger";

/** The `/recurring` endpoints. */

const RECURRING = "/recurring";
const OVERVIEW = `${RECURRING}/overview`;

export type RecurringRecord = {
  readonly id: string;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly walletId: string;
  readonly walletName: string;
  /** The category's tile, or "" when it has none. */
  readonly icon: IconKey | "";
  readonly name: string;
  readonly amount: number;
  readonly currency: CurrencyCode;
  readonly frequency: RecurringFrequency;
  /** An ISO day. */
  readonly nextDueDate: string;
  readonly isPaused: boolean;
};

export type RecurringOverviewRecord = {
  readonly currency: CurrencyCode;
  readonly monthlyCommitment: number;
  readonly dueSoonTotal: number;
  readonly dueSoonCount: number;
  readonly dueSoonDays: number;
  readonly overdueCount: number;
  readonly activeCount: number;
  readonly pausedCount: number;
  /** Active items kept in another currency, which the totals leave out. */
  readonly uncountedItems: number;
};

function readCount(raw: Record<string, unknown>, key: string): number {
  return readNumber(raw, key) ?? 0;
}

function parseRecurring(raw: unknown): RecurringRecord | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = readString(raw, "id");
  const nextDueDate = readString(raw, "next_due_date");
  if (!id || !nextDueDate) {
    return null;
  }

  return {
    id,
    categoryId: readString(raw, "category_id") ?? "",
    categoryName: readString(raw, "category_name") ?? "",
    walletId: readString(raw, "wallet_id") ?? "",
    walletName: readString(raw, "wallet_name") ?? "",
    icon: knownIconOrBlank(readString(raw, "icon") ?? ""),
    name: readString(raw, "name") ?? "",
    amount: readCount(raw, "amount"),
    currency: readEnum(raw, "currency", CURRENCY_ORDER, "IDR"),
    frequency: readEnum(raw, "frequency", RECURRING_FREQUENCIES, "monthly"),
    nextDueDate,
    isPaused: readBoolean(raw, "is_paused"),
  };
}

function parseRecurringList(raw: unknown): readonly RecurringRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const items: RecurringRecord[] = [];
  for (const entry of raw) {
    const item = parseRecurring(entry);
    if (item) {
      items.push(item);
    }
  }
  return items;
}

function parseOverview(raw: unknown): RecurringOverviewRecord | null {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    currency: readEnum(raw, "currency", CURRENCY_ORDER, "IDR"),
    monthlyCommitment: readCount(raw, "monthly_commitment"),
    dueSoonTotal: readCount(raw, "due_soon_total"),
    dueSoonCount: readCount(raw, "due_soon_count"),
    dueSoonDays: readCount(raw, "due_soon_days"),
    overdueCount: readCount(raw, "overdue_count"),
    activeCount: readCount(raw, "active_count"),
    pausedCount: readCount(raw, "paused_count"),
    uncountedItems: readCount(raw, "uncounted_items"),
  };
}

/** GET /recurring — the whole schedule; it does not page. */
export async function listRecurring(
  accessToken: string,
): Promise<ApiResult<readonly RecurringRecord[]>> {
  const result = await apiRequest({
    path: RECURRING,
    method: "GET",
    accessToken,
  });
  return result.ok
    ? { ...result, data: parseRecurringList(result.data) }
    : result;
}

/** GET /recurring/overview?date= — measured against the caller's own day. */
export async function fetchRecurringOverview(
  accessToken: string,
  today: string,
): Promise<ApiResult<RecurringOverviewRecord>> {
  return withParsed(
    await apiRequest({
      path: withQuery(OVERVIEW, { date: today }),
      method: "GET",
      accessToken,
    }),
    parseOverview,
  );
}

export type RecurringInput = {
  readonly categoryId: string;
  readonly walletId: string;
  readonly name: string;
  readonly amount: number;
  readonly frequency: RecurringFrequency;
  readonly nextDueDate: string;
  readonly isPaused: boolean;
};

function recurringBody(input: RecurringInput): Record<string, unknown> {
  return {
    category_id: input.categoryId,
    wallet_id: input.walletId,
    name: input.name,
    amount: input.amount,
    frequency: input.frequency,
    next_due_date: input.nextDueDate,
    is_paused: input.isPaused,
  };
}

/** POST /recurring */
export async function createRecurring(
  accessToken: string,
  input: RecurringInput,
): Promise<ApiResult<RecurringRecord>> {
  return withParsed(
    await apiRequest({
      path: RECURRING,
      method: "POST",
      accessToken,
      body: recurringBody(input),
    }),
    parseRecurring,
  );
}

/** PATCH /recurring/{id} */
export async function updateRecurring(
  accessToken: string,
  id: string,
  input: RecurringInput,
): Promise<ApiResult<RecurringRecord>> {
  return withParsed(
    await apiRequest({
      path: `${RECURRING}/${id}`,
      method: "PATCH",
      accessToken,
      body: recurringBody(input),
    }),
    parseRecurring,
  );
}

/** DELETE /recurring/{id} */
export async function deleteRecurring(
  accessToken: string,
  id: string,
): Promise<ApiResult<null>> {
  return withoutData(
    await apiRequest({
      path: `${RECURRING}/${id}`,
      method: "DELETE",
      accessToken,
    }),
  );
}

export type RecurringPayment = {
  readonly amount: number;
  /** RFC3339, stamped in Jakarta's zone. */
  readonly occurredAt: string;
  readonly note: string;
};

/** POST /recurring/{id}/confirm — records the payment and moves the due date on. */
export async function confirmRecurring(
  accessToken: string,
  id: string,
  payment: RecurringPayment,
): Promise<ApiResult<RecurringRecord>> {
  return withParsed(
    await apiRequest({
      path: `${RECURRING}/${id}/confirm`,
      method: "POST",
      accessToken,
      body: {
        amount: payment.amount,
        occurred_at: payment.occurredAt,
        note: payment.note,
      },
    }),
    parseRecurring,
  );
}

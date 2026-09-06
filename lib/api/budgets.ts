import { ICON_NAMES, type IconName } from "@/components/ui/icon-sprite";
import { apiRequest, withParsed, withoutData } from "@/lib/api/client";
import { isRecord, readBoolean, readNumber, readString } from "@/lib/api/parse";
import { RAMP_STEPS } from "@/lib/category-fields";
import { CURRENCY_ORDER } from "@/lib/wallet-fields";
import type { ApiResult } from "@/types/api";
import type { CurrencyCode, RampStep } from "@/types/ledger";

/**
 * The `/budgets` endpoints.
 *
 * A budget is a limit somebody chose against one of their own expense
 * categories — `budgets` in the database (migration 000027), one row per
 * category enforced by `budgets_user_category_unique_idx`. What it has *spent*
 * is never stored: the backend sums it per cycle and hands it back beside the
 * limit, so the two can never drift apart.
 *
 * This layer states what the API states and nothing more. Every percentage
 * here is the backend's own whole number rather than a ratio re-derived on the
 * way in — `used_percent` is what decides both a card's colour and whether the
 * row appears in the attention list, and rounding it twice is exactly how the
 * two would come to disagree.
 */

const BUDGETS = "/budgets";
const OVERVIEW = `${BUDGETS}/overview`;

/** Both writes send this; the overview counts only budgets kept in it. */
export const BUDGET_BASE_CURRENCY: CurrencyCode = "IDR";

export type BudgetRecord = {
  readonly id: string;
  readonly categoryId: string;
  readonly categoryName: string;
  /** The category's own tile, or "" when it has none; the reader resolves it. */
  readonly icon: IconName | "";
  readonly color: RampStep | "";
  readonly currency: CurrencyCode;
  readonly monthlyLimit: number;
  readonly spent: number;
  /** Negative once the limit is passed. */
  readonly remaining: number;
  /** A whole percentage, rounded by the backend. */
  readonly usedPercent: number;
  readonly isOver: boolean;
  readonly alertThresholdPercent: number;
  readonly isFixed: boolean;
  readonly rollover: boolean;
};

/** One slice of the allocation bar, as the backend apportioned it. */
export type BudgetShareRecord = {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly color: RampStep | "";
  readonly percent: number;
};

/**
 * A budget past its threshold or over its limit. Figures only — the wording is
 * written on this side, so a copy change never needs a backend release.
 */
export type BudgetAttentionRecord = {
  readonly budgetId: string;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly icon: IconName | "";
  readonly color: RampStep | "";
  readonly monthlyLimit: number;
  readonly spent: number;
  readonly remaining: number;
  readonly usedPercent: number;
  readonly alertThresholdPercent: number;
  readonly isFixed: boolean;
  readonly isOver: boolean;
};

export type BudgetOverviewRecord = {
  readonly currency: CurrencyCode;
  readonly totalAllocated: number;
  readonly totalSpent: number;
  /** Negative once the allocation is passed. */
  readonly totalLeft: number;
  readonly categoryCount: number;
  /** Budgets kept in another currency, which the totals cannot absorb. */
  readonly uncountedBudgets: number;
  readonly usedPercent: number;
  readonly isOver: boolean;
  readonly daysLeft: number;
  readonly cycleElapsedPercent: number;
  readonly shares: readonly BudgetShareRecord[];
  readonly attention: readonly BudgetAttentionRecord[];
};

/* ── parsing ───────────────────────────────────────────────────────────── */

/** Anything this sprite cannot draw is no icon at all, exactly as "" is. */
function readIcon(raw: Record<string, unknown>): IconName | "" {
  const name = readString(raw, "icon");
  return ICON_NAMES.find((icon) => icon === name) ?? "";
}

function readColor(raw: Record<string, unknown>): RampStep | "" {
  const value = readString(raw, "color");
  return RAMP_STEPS.find((step) => step === value) ?? "";
}

function readCurrency(raw: Record<string, unknown>): CurrencyCode {
  const value = readString(raw, "currency");
  return CURRENCY_ORDER.find((code) => code === value) ?? BUDGET_BASE_CURRENCY;
}

function readCount(raw: Record<string, unknown>, key: string): number {
  return readNumber(raw, key) ?? 0;
}

function parseBudget(raw: unknown): BudgetRecord | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = readString(raw, "id");
  const categoryId = readString(raw, "category_id");
  if (!id || !categoryId) {
    return null;
  }

  return {
    id,
    categoryId,
    categoryName: readString(raw, "category_name") ?? "",
    icon: readIcon(raw),
    color: readColor(raw),
    currency: readCurrency(raw),
    monthlyLimit: readCount(raw, "monthly_limit"),
    spent: readCount(raw, "spent"),
    remaining: readCount(raw, "remaining"),
    usedPercent: readCount(raw, "used_percent"),
    isOver: readBoolean(raw, "is_over"),
    alertThresholdPercent: readCount(raw, "alert_threshold_percent"),
    isFixed: readBoolean(raw, "is_fixed"),
    rollover: readBoolean(raw, "rollover"),
  };
}

function parseBudgets(raw: unknown): readonly BudgetRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const budgets: BudgetRecord[] = [];
  for (const entry of raw) {
    const budget = parseBudget(entry);
    if (budget) {
      budgets.push(budget);
    }
  }
  return budgets;
}

function parseShare(raw: unknown): BudgetShareRecord | null {
  if (!isRecord(raw)) {
    return null;
  }

  const categoryId = readString(raw, "category_id");
  if (!categoryId) {
    return null;
  }

  return {
    categoryId,
    categoryName: readString(raw, "category_name") ?? "",
    color: readColor(raw),
    percent: readCount(raw, "percent"),
  };
}

function parseShares(raw: unknown): readonly BudgetShareRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const shares: BudgetShareRecord[] = [];
  for (const entry of raw) {
    const share = parseShare(entry);
    if (share) {
      shares.push(share);
    }
  }
  return shares;
}

function parseAttention(raw: unknown): BudgetAttentionRecord | null {
  if (!isRecord(raw)) {
    return null;
  }

  const budgetId = readString(raw, "budget_id");
  if (!budgetId) {
    return null;
  }

  return {
    budgetId,
    categoryId: readString(raw, "category_id") ?? "",
    categoryName: readString(raw, "category_name") ?? "",
    icon: readIcon(raw),
    color: readColor(raw),
    monthlyLimit: readCount(raw, "monthly_limit"),
    spent: readCount(raw, "spent"),
    remaining: readCount(raw, "remaining"),
    usedPercent: readCount(raw, "used_percent"),
    alertThresholdPercent: readCount(raw, "alert_threshold_percent"),
    isFixed: readBoolean(raw, "is_fixed"),
    isOver: readBoolean(raw, "is_over"),
  };
}

function parseAttentionList(raw: unknown): readonly BudgetAttentionRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const items: BudgetAttentionRecord[] = [];
  for (const entry of raw) {
    const item = parseAttention(entry);
    if (item) {
      items.push(item);
    }
  }
  return items;
}

function parseOverview(raw: unknown): BudgetOverviewRecord | null {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    currency: readCurrency(raw),
    totalAllocated: readCount(raw, "total_budget_allocated"),
    totalSpent: readCount(raw, "total_budget_spent"),
    totalLeft: readCount(raw, "total_budget_left"),
    categoryCount: readCount(raw, "across_category"),
    uncountedBudgets: readCount(raw, "uncounted_budgets"),
    usedPercent: readCount(raw, "used_percent"),
    isOver: readBoolean(raw, "is_over"),
    daysLeft: readCount(raw, "days_left"),
    cycleElapsedPercent: readCount(raw, "cycle_elapsed_percent"),
    shares: parseShares(raw.shares),
    // The backend calls it `alert`; here it is what the panel is called.
    attention: parseAttentionList(raw.alert),
  };
}

/* ── reads ─────────────────────────────────────────────────────────────── */

/**
 * GET /budgets — every budget the signed-in user keeps.
 *
 * It does not page: a household keeps one budget per spending category. The
 * array is taken off the result rather than through `withParsed`, which would
 * read a first, empty workspace as an unreadable answer.
 */
export async function listBudgets(
  accessToken: string,
): Promise<ApiResult<readonly BudgetRecord[]>> {
  const result = await apiRequest({
    path: BUDGETS,
    method: "GET",
    accessToken,
  });
  return result.ok ? { ...result, data: parseBudgets(result.data) } : result;
}

/** GET /budgets/overview — the summary panel, for the current cycle. */
export async function fetchBudgetOverview(
  accessToken: string,
): Promise<ApiResult<BudgetOverviewRecord>> {
  return withParsed(
    await apiRequest({ path: OVERVIEW, method: "GET", accessToken }),
    parseOverview,
  );
}

/* ── writes ────────────────────────────────────────────────────────────── */

/** What the editor saves. The threshold is a whole percentage, as stored. */
export type BudgetInput = {
  readonly categoryId: string;
  readonly monthlyLimit: number;
  readonly alertThresholdPercent: number;
  readonly isFixed: boolean;
  readonly rollover: boolean;
};

/**
 * The body both writes send.
 *
 * `category_id` is left out of a patch: a budget *is* the pairing of a category
 * with a limit, so the sheet never offers to move one, and sending the field
 * unchanged would only give the backend a category check to fail on.
 */
function budgetBody(
  input: BudgetInput,
  isEdit: boolean,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    currency: BUDGET_BASE_CURRENCY,
    monthly_limit: input.monthlyLimit,
    alert_threshold_percent: input.alertThresholdPercent,
    is_fixed: input.isFixed,
    rollover: input.rollover,
  };

  if (!isEdit) {
    body.category_id = input.categoryId;
  }
  return body;
}

/** POST /budgets */
export async function createBudget(
  accessToken: string,
  input: BudgetInput,
): Promise<ApiResult<BudgetRecord>> {
  return withParsed(
    await apiRequest({
      path: BUDGETS,
      method: "POST",
      accessToken,
      body: budgetBody(input, false),
    }),
    parseBudget,
  );
}

/** PATCH /budgets/{id} */
export async function updateBudget(
  accessToken: string,
  id: string,
  input: BudgetInput,
): Promise<ApiResult<BudgetRecord>> {
  return withParsed(
    await apiRequest({
      path: `${BUDGETS}/${id}`,
      method: "PATCH",
      accessToken,
      body: budgetBody(input, true),
    }),
    parseBudget,
  );
}

/** DELETE /budgets/{id} — a soft delete, server-side. */
export async function deleteBudget(
  accessToken: string,
  id: string,
): Promise<ApiResult<null>> {
  return withoutData(
    await apiRequest({
      path: `${BUDGETS}/${id}`,
      method: "DELETE",
      accessToken,
    }),
  );
}

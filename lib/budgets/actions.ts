"use server";

import { revalidatePath } from "next/cache";

import {
  BUDGET_FIELD,
  CUSTOM_THRESHOLD,
  isSpendCategory,
} from "@/lib/budget-fields";
import {
  localFailureState,
  noticeState,
  type AuthFormState,
} from "@/lib/auth/form-state";
import { requireProfile } from "@/lib/auth/session";
import {
  deleteBudgetLimit,
  findBudgetLimit,
  saveBudgetLimit,
} from "@/lib/data/budget-store";
import { CATEGORIES } from "@/lib/data/categories";
import { iconNameOrBlank } from "@/lib/icon-choice";
import { PERCENT_MAX, PERCENT_MIN, parseFigure, parsePercent } from "@/lib/format";
import type { CategoryKey } from "@/types/ledger";

/**
 * The budgets screen's mutations.
 *
 * There is no `/budgets` endpoint yet, so these write to the in-memory store in
 * `lib/data/budget-store.ts` rather than to the API. The shape is the shape the
 * call will take — read the form, validate what the backend could not phrase
 * better, hand back a `AuthFormState` keyed by the input's own `name` — so
 * swapping the two `saveBudgetLimit` lines for a fetch is the whole change.
 */

/** The two screens a budget is read on. */
const BUDGETS_PATH = "/budgets";
const DASHBOARD_PATH = "/dashboard";

const LIMIT_ERROR = "Enter the monthly limit as a number above zero.";
const THRESHOLD_ERROR = `Enter a whole percentage between ${PERCENT_MIN} and ${PERCENT_MAX}.`;
const CATEGORY_ERROR = "Pick a category a transaction can be filed under.";
const TAKEN_ERROR = "That category already has a budget. Edit that one instead.";
const CHECK_FIELDS = "Check the highlighted fields and try again.";

/** A fixed commitment only ever reports when it goes past its whole limit. */
const FIXED_THRESHOLD = 1;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** An unticked checkbox posts nothing at all, which is what "off" looks like. */
function checked(formData: FormData, key: string): boolean {
  return formData.get(key) !== null;
}

/**
 * What the person typed, kept as they typed it. A rejected save re-renders the
 * form, and a figure it refused has to come back looking the same or they
 * cannot see what to correct.
 */
function submittedValues(formData: FormData): Readonly<Record<string, string>> {
  return {
    [BUDGET_FIELD.id]: text(formData, BUDGET_FIELD.id),
    [BUDGET_FIELD.category]: text(formData, BUDGET_FIELD.category),
    [BUDGET_FIELD.limit]: text(formData, BUDGET_FIELD.limit),
    [BUDGET_FIELD.thresholdCustom]: text(formData, BUDGET_FIELD.thresholdCustom),
  };
}

/**
 * The threshold, from whichever field carries it.
 *
 * A preset posts its own whole percentage; Custom posts a sentinel and puts the
 * figure in the second field. Reading them in one place is what keeps the two
 * from ever both being believed.
 */
function readThreshold(formData: FormData): number | null {
  const posted = text(formData, BUDGET_FIELD.threshold);
  const raw =
    posted === CUSTOM_THRESHOLD
      ? text(formData, BUDGET_FIELD.thresholdCustom)
      : posted;

  return parsePercent(raw);
}

/** Which field an unreadable threshold belongs to, so the error lands on it. */
function thresholdField(formData: FormData): string {
  return text(formData, BUDGET_FIELD.threshold) === CUSTOM_THRESHOLD
    ? BUDGET_FIELD.thresholdCustom
    : BUDGET_FIELD.threshold;
}

type ReadResult =
  | {
      readonly ok: true;
      readonly category: CategoryKey;
      readonly limit: number;
      readonly threshold: number;
      readonly icon: string;
      readonly rollover: boolean;
      readonly isFixed: boolean;
    }
  | { readonly ok: false; readonly fieldErrors: Readonly<Record<string, string>> };

function readInput(formData: FormData, isEdit: boolean): ReadResult {
  const fieldErrors: Record<string, string> = {};

  const category = text(formData, BUDGET_FIELD.category);
  if (!isSpendCategory(category)) {
    return { ok: false, fieldErrors: { [BUDGET_FIELD.category]: CATEGORY_ERROR } };
  }
  if (!isEdit && findBudgetLimit(category)) {
    return { ok: false, fieldErrors: { [BUDGET_FIELD.category]: TAKEN_ERROR } };
  }

  // A limit of 0 is not a budget, it is a ban — and it would divide by zero.
  const limit = parseFigure(text(formData, BUDGET_FIELD.limit), "IDR");
  if (limit === null || limit <= 0) {
    fieldErrors[BUDGET_FIELD.limit] = LIMIT_ERROR;
  }

  // A fixed commitment hides the threshold control, so there is nothing to
  // read and nothing to reject: only going over its limit means anything.
  const isFixed = checked(formData, BUDGET_FIELD.isFixed);
  const threshold = isFixed ? FIXED_THRESHOLD : readThreshold(formData);
  if (threshold === null) {
    fieldErrors[thresholdField(formData)] = THRESHOLD_ERROR;
  }

  if (limit === null || limit <= 0 || threshold === null) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    category,
    limit,
    threshold,
    icon: text(formData, BUDGET_FIELD.icon),
    rollover: checked(formData, BUDGET_FIELD.rollover),
    isFixed,
  };
}

function revalidateBudgets(): void {
  revalidatePath(BUDGETS_PATH);
  // The dashboard prints the first five of the same rows.
  revalidatePath(DASHBOARD_PATH);
}

/**
 * One action behind both the "New budget" panel and every row's pencil. Add and
 * edit are one form on purpose: split in two they drift, which is exactly what
 * happened to the artboard's own panel — it offered three thresholds, none of
 * which was the 75% one of its budgets was already set to.
 */
export async function saveBudgetAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  await requireProfile();

  const isEdit = text(formData, BUDGET_FIELD.id) !== "";
  const values = submittedValues(formData);

  const read = readInput(formData, isEdit);
  if (!read.ok) {
    return localFailureState(CHECK_FIELDS, read.fieldErrors, values);
  }

  saveBudgetLimit({
    category: read.category,
    limit: read.limit,
    threshold: read.threshold,
    // "" keeps the budget on its category's tile, which is the column's default.
    icon: iconNameOrBlank(read.icon),
    rollover: read.rollover,
    isFixed: read.isFixed,
  });

  revalidateBudgets();
  const label = CATEGORIES[read.category].label;
  return noticeState(`${label} budget ${isEdit ? "updated" : "created"}.`);
}

/**
 * Removal is a handler rather than a form: the button only exists inside a
 * slide-over that JavaScript opened, so there is no no-script path to protect.
 * "" means it went through.
 */
export async function deleteBudgetAction(category: string): Promise<string> {
  await requireProfile();

  if (!isSpendCategory(category)) {
    return CATEGORY_ERROR;
  }

  deleteBudgetLimit(category);
  revalidateBudgets();
  return "";
}

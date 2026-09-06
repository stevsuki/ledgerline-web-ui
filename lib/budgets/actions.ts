"use server";

import { revalidatePath } from "next/cache";

import {
  createBudget,
  deleteBudget,
  updateBudget,
  type BudgetInput,
} from "@/lib/api/budgets";
import {
  failureState,
  localFailureState,
  noticeState,
  type AuthFormState,
} from "@/lib/auth/form-state";
import { requireAccessToken } from "@/lib/auth/session";
import {
  BUDGET_FIELD,
  CUSTOM_THRESHOLD,
  FIXED_THRESHOLD_PERCENT,
} from "@/lib/budget-fields";
import {
  PERCENT_MAX,
  PERCENT_MIN,
  parseFigure,
  parsePercent,
  toWholePercent,
} from "@/lib/format";

/**
 * The budgets screen's mutations, over the live `/budgets` endpoints.
 *
 * Only two figures are read before the call, because the backend cannot phrase
 * their failure better than the sheet can: a limit and a threshold both arrive
 * as text someone typed, and `parseFigure` / `parsePercent` answer `null`
 * rather than 0 so an unreadable one stops the save instead of quietly saving a
 * budget of nothing. Everything else is the API's answer, keyed by the field it
 * names — which is why the form posts the backend's own json tags.
 */

/** The two screens a budget is read on. */
const BUDGETS_PATH = "/budgets";
const DASHBOARD_PATH = "/dashboard";

const LIMIT_ERROR = "Enter the monthly limit as a number above zero.";
const THRESHOLD_ERROR = `Enter a whole percentage between ${PERCENT_MIN} and ${PERCENT_MAX}.`;
const CATEGORY_ERROR = "Pick a category a transaction can be filed under.";
const CHECK_FIELDS = "Check the highlighted fields and try again.";

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
    // The id rides along so the sheet can tell whether an error it is holding
    // belongs to the budget now on screen, or to the one opened before it.
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

  const ratio = parsePercent(raw);
  return ratio === null ? null : toWholePercent(ratio);
}

/** Which field an unreadable threshold belongs to, so the error lands on it. */
function thresholdField(formData: FormData): string {
  return text(formData, BUDGET_FIELD.threshold) === CUSTOM_THRESHOLD
    ? BUDGET_FIELD.thresholdCustom
    : BUDGET_FIELD.threshold;
}

type ReadResult =
  | { readonly ok: true; readonly input: BudgetInput }
  | {
      readonly ok: false;
      readonly fieldErrors: Readonly<Record<string, string>>;
    };

function readInput(formData: FormData): ReadResult {
  const categoryId = text(formData, BUDGET_FIELD.category);
  // On an edit the field is a hidden echo of the budget's own category, so an
  // empty one means the form was tampered with rather than mis-filled.
  if (!categoryId) {
    return {
      ok: false,
      fieldErrors: { [BUDGET_FIELD.category]: CATEGORY_ERROR },
    };
  }

  const fieldErrors: Record<string, string> = {};

  // A limit of 0 is not a budget, it is a ban — and every percentage on the
  // screen would be dividing by it.
  const limit = parseFigure(text(formData, BUDGET_FIELD.limit), "IDR");
  if (limit === null || limit <= 0) {
    fieldErrors[BUDGET_FIELD.limit] = LIMIT_ERROR;
  }

  // A fixed commitment hides the threshold control, and the table refuses any
  // value but 100 on one, so the editor states that rather than posting none.
  const isFixed = checked(formData, BUDGET_FIELD.isFixed);
  const threshold = isFixed ? FIXED_THRESHOLD_PERCENT : readThreshold(formData);
  if (threshold === null) {
    fieldErrors[thresholdField(formData)] = THRESHOLD_ERROR;
  }

  if (limit === null || limit <= 0 || threshold === null) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    input: {
      categoryId,
      monthlyLimit: limit,
      alertThresholdPercent: threshold,
      isFixed,
      rollover: checked(formData, BUDGET_FIELD.rollover),
    },
  };
}

function revalidateBudgets(): void {
  revalidatePath(BUDGETS_PATH);
  // The dashboard prints the first five of the same rows, and the app shell
  // reads them for the add-transaction sheet's impact line.
  revalidatePath(DASHBOARD_PATH);
  revalidatePath("/", "layout");
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
  const id = text(formData, BUDGET_FIELD.id);
  const values = submittedValues(formData);

  const read = readInput(formData);
  if (!read.ok) {
    return localFailureState(CHECK_FIELDS, read.fieldErrors, values);
  }

  const accessToken = await requireAccessToken();
  const result = id
    ? await updateBudget(accessToken, id, read.input)
    : await createBudget(accessToken, read.input);

  if (!result.ok) {
    return failureState(result.error, values);
  }

  revalidateBudgets();
  return noticeState(
    `${result.data.categoryName} budget ${id ? "updated" : "created"}.`,
  );
}

/**
 * Removal is a handler rather than a form: the button only exists inside a
 * slide-over that JavaScript opened, so there is no no-script path to protect.
 * "" means it went through.
 */
export async function deleteBudgetAction(id: string): Promise<string> {
  if (!id) {
    return "";
  }

  const accessToken = await requireAccessToken();
  const result = await deleteBudget(accessToken, id);
  if (!result.ok) {
    return failureState(result.error).error;
  }

  revalidateBudgets();
  return "";
}

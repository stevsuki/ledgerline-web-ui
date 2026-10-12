"use server";

import { revalidatePath } from "next/cache";

import {
  confirmRecurring,
  createRecurring,
  deleteRecurring,
  updateRecurring,
} from "@/lib/api/recurring";
import {
  failureState,
  localFailureState,
  noticeState,
  type AuthFormState,
} from "@/lib/auth/form-state";
import { requireAccessToken } from "@/lib/auth/session";
import { parseIsoDate } from "@/lib/dates";
import { parseFigure } from "@/lib/format";
import { RECURRING_FIELD, parseFrequency } from "@/lib/recurring-fields";
import { parseCurrency } from "@/lib/wallet-fields";

/** The recurring screen's mutations, over the live `/recurring` endpoints. */

const RECURRING_PATH = "/recurring";
/** A recorded payment is a transaction, so everything that reads one goes stale. */
const PAYMENT_PATHS = ["/transactions", "/dashboard", "/wallets", "/budgets"];

const JAKARTA_OFFSET = "+07:00";
const PAYMENT_TIME = "00:00";

const CHECK_FIELDS = "Check the highlighted fields and try again.";
const NAME_ERROR = "Give this item a name.";
const AMOUNT_ERROR = "Enter the amount as a number above zero.";
const DUE_ERROR = "Pick the date this is next due.";
const PAID_ON_ERROR = "Pick the date this was paid.";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readAmount(formData: FormData): number | null {
  const currency = parseCurrency(text(formData, RECURRING_FIELD.currency));
  const amount = parseFigure(text(formData, RECURRING_FIELD.amount), currency);
  return amount !== null && amount > 0 ? amount : null;
}

export async function saveRecurringAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const id = text(formData, RECURRING_FIELD.id);
  const name = text(formData, RECURRING_FIELD.name);
  const nextDueDate = text(formData, RECURRING_FIELD.nextDueDate);
  const values = {
    [RECURRING_FIELD.id]: id,
    [RECURRING_FIELD.name]: name,
    [RECURRING_FIELD.amount]: text(formData, RECURRING_FIELD.amount),
  };

  const amount = readAmount(formData);
  const fieldErrors: Record<string, string> = {};
  if (name === "") {
    fieldErrors[RECURRING_FIELD.name] = NAME_ERROR;
  }
  if (amount === null) {
    fieldErrors[RECURRING_FIELD.amount] = AMOUNT_ERROR;
  }
  if (!parseIsoDate(nextDueDate)) {
    fieldErrors[RECURRING_FIELD.nextDueDate] = DUE_ERROR;
  }
  if (amount === null || Object.keys(fieldErrors).length > 0) {
    return localFailureState(CHECK_FIELDS, fieldErrors, values);
  }

  const input = {
    categoryId: text(formData, RECURRING_FIELD.category),
    walletId: text(formData, RECURRING_FIELD.wallet),
    name,
    amount,
    frequency: parseFrequency(text(formData, RECURRING_FIELD.frequency)),
    nextDueDate,
    isPaused: formData.get(RECURRING_FIELD.isPaused) !== null,
  };

  const accessToken = await requireAccessToken();
  const result = id
    ? await updateRecurring(accessToken, id, input)
    : await createRecurring(accessToken, input);
  if (!result.ok) {
    return failureState(result.error, values);
  }

  revalidatePath(RECURRING_PATH);
  return noticeState(`${result.data.name} ${id ? "updated" : "scheduled"}.`);
}

/** "" means it went through. */
export async function deleteRecurringAction(id: string): Promise<string> {
  if (!id) {
    return "";
  }

  const accessToken = await requireAccessToken();
  const result = await deleteRecurring(accessToken, id);
  if (!result.ok) {
    return failureState(result.error).error;
  }

  revalidatePath(RECURRING_PATH);
  return "";
}

/** Records this cycle's payment as a transaction and moves the due date on. */
export async function confirmRecurringAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const id = text(formData, RECURRING_FIELD.id);
  const paidOn = text(formData, RECURRING_FIELD.paidOn);
  const values = {
    [RECURRING_FIELD.id]: id,
    [RECURRING_FIELD.amount]: text(formData, RECURRING_FIELD.amount),
  };

  const amount = readAmount(formData);
  const fieldErrors: Record<string, string> = {};
  if (amount === null) {
    fieldErrors[RECURRING_FIELD.amount] = AMOUNT_ERROR;
  }
  if (!parseIsoDate(paidOn)) {
    fieldErrors[RECURRING_FIELD.paidOn] = PAID_ON_ERROR;
  }
  if (amount === null || Object.keys(fieldErrors).length > 0) {
    return localFailureState(CHECK_FIELDS, fieldErrors, values);
  }

  const accessToken = await requireAccessToken();
  const result = await confirmRecurring(accessToken, id, {
    amount,
    occurredAt: `${paidOn}T${PAYMENT_TIME}:00${JAKARTA_OFFSET}`,
    note: text(formData, RECURRING_FIELD.note),
  });
  if (!result.ok) {
    return failureState(result.error, values);
  }

  revalidatePath(RECURRING_PATH);
  for (const path of PAYMENT_PATHS) {
    revalidatePath(path);
  }
  revalidatePath("/", "layout");
  return noticeState(`${result.data.name} recorded.`);
}

"use server";

import { revalidatePath } from "next/cache";

import { createCategory } from "@/lib/api/categories";
import {
  createTransaction,
  type TransactionInput,
} from "@/lib/api/transactions";
import {
  failureState,
  localFailureState,
  noticeState,
  type AuthFormState,
} from "@/lib/auth/form-state";
import { requireAccessToken } from "@/lib/auth/session";
import { parseFigure } from "@/lib/format";
import type { CategoryKind, CurrencyCode } from "@/types/ledger";

/** The one mutation the add-transaction sheet performs. */

const TRANSACTIONS_PATH = "/transactions";
const CHECK_FIELDS = "Check the highlighted fields and try again.";

/** The sheet is rupiah-only, as the artboard drew it. */
const SHEET_CURRENCY: CurrencyCode = "IDR";
/** The workspace keeps Jakarta time, so a stamp is written in its zone. */
const JAKARTA_OFFSET = "+07:00";
const DEFAULT_TIME = "00:00";

const AMOUNT_ERROR = "Enter the amount as a number above zero.";
const DATE_ERROR = "Pick the date this happened.";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function transactionType(raw: string): CategoryKind {
  return raw === "income" ? "income" : "expense";
}

/** Signed to match the direction: income adds, expense takes away. */
function signedAmount(magnitude: number, type: CategoryKind): number {
  return type === "income" ? magnitude : -magnitude;
}

function occurredAt(date: string, time: string): string {
  return `${date}T${time || DEFAULT_TIME}:00${JAKARTA_OFFSET}`;
}

type CategoryResolution =
  | { readonly ok: true; readonly id: string }
  | { readonly ok: false; readonly state: AuthFormState };

/**
 * The category the transaction files under. Picking "Other" and naming it is
 * the same act as adding a category on the categories screen, so a typed name
 * is created first and the new id is what the transaction carries.
 */
async function resolveCategory(
  accessToken: string,
  formData: FormData,
  type: CategoryKind,
  values: Readonly<Record<string, string>>,
): Promise<CategoryResolution> {
  const newName = text(formData, "new_category");
  if (newName === "") {
    return { ok: true, id: text(formData, "category_id") };
  }

  const created = await createCategory(accessToken, {
    name: newName,
    kind: type,
    icon: "",
    color: "",
    masterId: "",
  });
  if (!created.ok) {
    return { ok: false, state: failureState(created.error, values) };
  }
  return { ok: true, id: created.data.id };
}

export async function saveTransactionAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const type = transactionType(text(formData, "type"));
  const name = text(formData, "name");
  const note = text(formData, "note");
  const date = text(formData, "date");
  const values = { name, note };

  // Only what the backend cannot phrase better is checked here: a figure that
  // is not a number, or zero, comes back as an unhelpful bind error otherwise.
  const magnitude = parseFigure(text(formData, "amount"), SHEET_CURRENCY);
  const fieldErrors: Record<string, string> = {};
  if (magnitude === null || magnitude === 0) {
    fieldErrors.amount = AMOUNT_ERROR;
  }
  if (date === "") {
    fieldErrors.date = DATE_ERROR;
  }
  if (magnitude === null || magnitude === 0 || date === "") {
    return localFailureState(CHECK_FIELDS, fieldErrors, values);
  }

  const accessToken = await requireAccessToken();

  const category = await resolveCategory(accessToken, formData, type, values);
  if (!category.ok) {
    return category.state;
  }

  const input: TransactionInput = {
    categoryId: category.id,
    walletId: text(formData, "wallet_id"),
    name,
    note,
    type,
    amount: signedAmount(magnitude, type),
    currency: SHEET_CURRENCY,
    occurredAt: occurredAt(date, text(formData, "time")),
  };

  const result = await createTransaction(accessToken, input);
  if (!result.ok) {
    return failureState(result.error, values);
  }

  revalidatePath(TRANSACTIONS_PATH);
  return noticeState("Transaction saved");
}

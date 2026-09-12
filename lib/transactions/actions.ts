"use server";

import { revalidatePath } from "next/cache";

import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
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
import { parseCurrency } from "@/lib/wallet-fields";
import type { CategoryKind } from "@/types/ledger";

/** Every mutation the add/edit transaction sheet performs. */

const TRANSACTIONS_PATH = "/transactions";
/** The dashboard reads the same entries, so both screens go stale together. */
const DASHBOARD_PATH = "/dashboard";
const CHECK_FIELDS = "Check the highlighted fields and try again.";
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

/**
 * One action behind the "New" button and every pencil.
 *
 * Add and edit are one form on purpose: split in two they drift, and every
 * field the sheet shows is a field an entry recorded in a hurry gets wrong.
 */
export async function saveTransactionAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const id = text(formData, "id");
  const type = transactionType(text(formData, "type"));
  const name = text(formData, "name");
  const note = text(formData, "note");
  const date = text(formData, "date");
  // The id rides along so the sheet can tell whether an error it is holding
  // belongs to the entry now on screen, or to the one opened before it.
  const values = { id, name, note };

  // New entries are typed in rupiah; an existing one keeps what it arrived in,
  // so editing the note of a dollar row cannot redenominate its amount.
  const currency = parseCurrency(text(formData, "currency"));

  // Only what the backend cannot phrase better is checked here: a figure that
  // is not a number, or zero, comes back as an unhelpful bind error otherwise.
  const magnitude = parseFigure(text(formData, "amount"), currency);
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

  // The sheet used to let "Other" be renamed into a category of its own, which
  // created it here — before the transaction was saved. A save that then failed
  // for any other reason left the category behind, and the retry could neither
  // create it again (the name was taken) nor pick it (the sheet's list is read
  // by the layout, which a failed action does not re-render). Categories are
  // made on their own screen now, and this one only files against them.
  const input: TransactionInput = {
    categoryId: text(formData, "category_id"),
    walletId: text(formData, "wallet_id"),
    name,
    note,
    type,
    amount: signedAmount(magnitude, type),
    currency,
    occurredAt: occurredAt(date, text(formData, "time")),
  };

  const result = id
    ? await updateTransaction(accessToken, id, input)
    : await createTransaction(accessToken, input);
  if (!result.ok) {
    return failureState(result.error, values);
  }

  revalidatePath(TRANSACTIONS_PATH);
  revalidatePath(DASHBOARD_PATH);
  return noticeState(id ? "Transaction updated" : "Transaction saved");
}

/**
 * Removal is a handler rather than a form, as it is on the wallets screen: the
 * button only exists inside a slide-over that JavaScript opened, so there is no
 * no-script path for it to protect. "" means it went through.
 */
export async function deleteTransactionAction(
  transactionId: string,
): Promise<string> {
  if (!transactionId) {
    return "";
  }

  const accessToken = await requireAccessToken();
  const result = await deleteTransaction(accessToken, transactionId);
  if (!result.ok) {
    return failureState(result.error).error;
  }

  revalidatePath(TRANSACTIONS_PATH);
  revalidatePath(DASHBOARD_PATH);
  return "";
}

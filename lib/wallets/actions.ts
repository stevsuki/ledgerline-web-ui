"use server";

import { revalidatePath } from "next/cache";

import {
  createWallet,
  deleteWallet,
  updateWallet,
  type WalletInput,
} from "@/lib/api/wallets";
import {
  failureState,
  localFailureState,
  noticeState,
  type AuthFormState,
} from "@/lib/auth/form-state";
import { requireAccessToken } from "@/lib/auth/session";
import { parseFigure } from "@/lib/format";
import {
  CARD_KIND,
  DUE_DAY_MAX,
  DUE_DAY_MIN,
  WALLET_FIELD,
  parseCurrency,
  parseWalletKind,
} from "@/lib/wallet-fields";
import type { CurrencyCode, WalletKind } from "@/types/ledger";

/** Every mutation the wallets screen performs. */

/** The one screen a wallet is read on. */
const WALLETS_PATH = "/wallets";

const BALANCE_ERROR = "Enter the balance as a number, or 0.";
const LIMIT_ERROR = "Enter the credit limit as a number, or leave it blank.";
const DUE_DAY_ERROR = `Enter a day between ${DUE_DAY_MIN} and ${DUE_DAY_MAX}.`;
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
 * sheet, and a figure the backend refused has to come back looking the same or
 * they cannot see what to correct.
 */
function submittedValues(
  formData: FormData,
): Readonly<Record<string, string>> {
  return {
    // The id rides along so the sheet can tell whether an error it is holding
    // belongs to the wallet now on screen, or to the one opened before it.
    [WALLET_FIELD.id]: text(formData, WALLET_FIELD.id),
    [WALLET_FIELD.name]: text(formData, WALLET_FIELD.name),
    [WALLET_FIELD.reference]: text(formData, WALLET_FIELD.reference),
    [WALLET_FIELD.balance]: text(formData, WALLET_FIELD.balance),
    [WALLET_FIELD.creditLimit]: text(formData, WALLET_FIELD.creditLimit),
    [WALLET_FIELD.dueDay]: text(formData, WALLET_FIELD.dueDay),
  };
}

/* ── reading the figures back ──────────────────────────────────────────── */

/** A day of the month, or `null` for "not given"; anything else is an error. */
function readDueDay(raw: string): number | null | "invalid" {
  if (raw === "") {
    return null;
  }

  const day = Number(raw);
  if (!Number.isInteger(day) || day < DUE_DAY_MIN || day > DUE_DAY_MAX) {
    return "invalid";
  }
  return day;
}

type CardFigures = {
  readonly creditLimit: number | null;
  readonly dueDay: number | null;
  readonly fieldErrors: Readonly<Record<string, string>>;
};

/** Only a card has these two, so on any other kind they are not even read. */
function readCardFigures(
  formData: FormData,
  kind: WalletKind,
  currency: CurrencyCode,
): CardFigures {
  if (kind !== CARD_KIND) {
    return { creditLimit: null, dueDay: null, fieldErrors: {} };
  }

  const fieldErrors: Record<string, string> = {};
  const limitText = text(formData, WALLET_FIELD.creditLimit);
  const creditLimit = limitText === "" ? null : parseFigure(limitText, currency);
  if (creditLimit === null && limitText !== "") {
    fieldErrors[WALLET_FIELD.creditLimit] = LIMIT_ERROR;
  }

  const dueDay = readDueDay(text(formData, WALLET_FIELD.dueDay));
  if (dueDay === "invalid") {
    fieldErrors[WALLET_FIELD.dueDay] = DUE_DAY_ERROR;
  }

  return {
    creditLimit,
    dueDay: dueDay === "invalid" ? null : dueDay,
    fieldErrors,
  };
}

type ReadResult =
  | { readonly ok: true; readonly input: WalletInput }
  | { readonly ok: false; readonly fieldErrors: Readonly<Record<string, string>> };

/**
 * The sheet, as the API takes it. Only the things the backend cannot say
 * better are checked here: a figure that is not a number never reaches it,
 * because "balance: NaN" comes back as an unhelpful bind error.
 */
function readInput(formData: FormData): ReadResult {
  const kind = parseWalletKind(text(formData, WALLET_FIELD.kind));
  const currency = parseCurrency(text(formData, WALLET_FIELD.currency));
  const balance = parseFigure(text(formData, WALLET_FIELD.balance), currency);
  const card = readCardFigures(formData, kind, currency);

  const fieldErrors = { ...card.fieldErrors };
  if (balance === null) {
    fieldErrors[WALLET_FIELD.balance] = BALANCE_ERROR;
  }

  if (balance === null || Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    input: {
      name: text(formData, WALLET_FIELD.name),
      kind,
      currency,
      reference: text(formData, WALLET_FIELD.reference),
      balance,
      includeInTotal: checked(formData, WALLET_FIELD.includeInTotal),
      creditLimit: card.creditLimit,
      dueDay: card.dueDay,
    },
  };
}

/* ── the mutations ─────────────────────────────────────────────────────── */

/**
 * One action behind both the dashed "Add wallet" card and every pencil. Add and
 * edit are one form on purpose: split in two they drift, and the inline panel
 * this replaced could not set a reference or a credit limit at all.
 */
export async function saveWalletAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const id = text(formData, WALLET_FIELD.id);
  const values = submittedValues(formData);

  const read = readInput(formData);
  if (!read.ok) {
    return localFailureState(CHECK_FIELDS, read.fieldErrors, values);
  }

  const accessToken = await requireAccessToken();
  const result = id
    ? await updateWallet(accessToken, id, read.input)
    : await createWallet(accessToken, read.input);

  if (!result.ok) {
    return failureState(result.error, values);
  }

  revalidatePath(WALLETS_PATH);
  return noticeState(`${result.data.name} ${id ? "updated" : "added"}.`);
}

/**
 * Removal is a handler rather than a form, unlike the users table: this button
 * only exists inside a slide-over that JavaScript opened, so there is no
 * no-script path for it to protect. "" means it went through.
 */
export async function deleteWalletAction(walletId: string): Promise<string> {
  if (!walletId) {
    return "";
  }

  const accessToken = await requireAccessToken();
  const result = await deleteWallet(accessToken, walletId);
  if (!result.ok) {
    return failureState(result.error).error;
  }

  revalidatePath(WALLETS_PATH);
  return "";
}

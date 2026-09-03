import type { IconName } from "@/components/ui/icon-sprite";
import type { CurrencyCode, WalletKind } from "@/types/ledger";

/**
 * What a wallet's `reference` is called, per kind — the one field whose meaning
 * changes with the type. A bank account has a number, an e-wallet is registered
 * to a phone, and cash has nothing at all: `null` is the whole point of this
 * table, not an oversight.
 *
 * It lives outside `lib/data/` because the editor is a client component and
 * reads it as the Type select changes, which `lib/data/` may never be imported
 * for. The Server Action reads the same table, so the form and the payload can
 * never disagree about what a kind carries.
 */

export type ReferenceHint = {
  readonly label: string;
  readonly placeholder: string;
};

export const REFERENCE_HINT: Readonly<
  Record<WalletKind, ReferenceHint | null>
> = {
  bank: { label: "Account number", placeholder: "••4192" },
  ewallet: { label: "Registered number", placeholder: "0812••4471" },
  card: { label: "Card number", placeholder: "••7702" },
  cash: null,
};

/** Said once under whichever of those fields is showing. */
export const REFERENCE_NOTE =
  "Only the tail you want shown — the card prints it after the type.";

/** Cash has no number to print, so its card says how it is kept instead. */
export const CASH_META = "Counted by hand";

/** Cards are the only kind with a ceiling and a statement day. */
export const CARD_KIND: WalletKind = "card";

/** The kinds in the order the Type select offers them. */
export const WALLET_KIND_ORDER: readonly WalletKind[] = [
  "bank",
  "ewallet",
  "card",
  "cash",
];

/** The currencies the backend's `oneof` accepts, in the order they are offered. */
export const CURRENCY_ORDER: readonly CurrencyCode[] = ["IDR", "USD", "SGD"];

/**
 * The editor has no icon picker, so a wallet's tile follows its kind. A row
 * saved with something else keeps it — `parseWalletIcon` only falls back here.
 */
export const ICON_BY_KIND: Readonly<Record<WalletKind, IconName>> = {
  bank: "bank",
  ewallet: "phone",
  card: "card",
  cash: "cash",
};

/* ── the form's names ──────────────────────────────────────────────────── */

/**
 * Deliberately the backend's own json tags: a field error comes back keyed by
 * the tag, and `failureState` keys its map by the input's `name`, so the two
 * line up without a translation table in between.
 */
export const WALLET_FIELD = {
  id: "id",
  name: "name",
  kind: "type",
  currency: "currency",
  reference: "reference",
  balance: "balance",
  creditLimit: "credit_limit",
  dueDay: "due_day",
  includeInTotal: "include_in_total",
} as const;

/** `binding:"required,min=2,max=100"` on a wallet name. */
export const WALLET_NAME_MIN_LENGTH = 2;
export const WALLET_NAME_MAX_LENGTH = 100;

/** `binding:"omitempty,max=50"` on a reference. */
export const REFERENCE_MAX_LENGTH = 50;

/** `binding:"omitempty,min=1,max=31"`, and the table's own CHECK. */
export const DUE_DAY_MIN = 1;
export const DUE_DAY_MAX = 31;

/* ── reading a select back ─────────────────────────────────────────────── */

/** A `<select>` hands back a string; this is how it becomes a `WalletKind`. */
export function parseWalletKind(value: string): WalletKind {
  return WALLET_KIND_ORDER.find((kind) => kind === value) ?? "bank";
}

export function parseCurrency(value: string): CurrencyCode {
  return CURRENCY_ORDER.find((code) => code === value) ?? "IDR";
}

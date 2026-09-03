import type { IconName } from "@/components/ui/icon-sprite";
import { withCurrent } from "@/lib/icon-choice";
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
 * What a wallet of each kind is drawn with when it has none of its own. The
 * picker starts here and follows the Type select until someone chooses
 * otherwise — most wallets want their kind's tile, and the ones that do not are
 * exactly the ones worth a deliberate pick.
 */
export const ICON_BY_KIND: Readonly<Record<WalletKind, IconName>> = {
  bank: "bank",
  ewallet: "phone",
  card: "card",
  cash: "cash",
};

/**
 * The tiles the wallet picker offers. Every kind's default is here, plus the
 * few that say something the kind cannot: a globe for money held abroad, a lock
 * for a deposit left alone, a gift card that is not a credit card.
 */
export const WALLET_ICON_CHOICES: readonly IconName[] = [
  "bank",
  "phone",
  "card",
  "cash",
  "wallet",
  "globe",
  "lock",
  "gift",
];

/** The shortlist, plus whatever this wallet is already wearing. */
export function walletIconChoices(current: IconName): readonly IconName[] {
  return withCurrent(WALLET_ICON_CHOICES, current);
}

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
  icon: "icon",
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

import { ICON_NAMES, type IconName } from "@/components/ui/icon-sprite";
import { apiRequest, withParsed, withoutData } from "@/lib/api/client";
import {
  isRecord,
  readBoolean,
  readEnum,
  readNumber,
  readString,
} from "@/lib/api/parse";
import {
  CARD_KIND,
  CURRENCY_ORDER,
  ICON_BY_KIND,
  WALLET_KIND_ORDER,
} from "@/lib/wallet-fields";
import type { ApiResult } from "@/types/api";
import type { CurrencyCode, WalletKind } from "@/types/ledger";

/** The `/wallets` endpoints: the list, the balance summary, and the editor's writes. */

const WALLETS = "/wallets";
const OVERVIEW = `${WALLETS}/overview`;

/**
 * A wallet exactly as the API states it: raw figures in the wallet's own
 * currency, never formatted money. What a card prints is decided in
 * `lib/data/wallets.ts`, so this layer stays free of the design.
 */
export type WalletRecord = {
  readonly id: string;
  readonly name: string;
  readonly kind: WalletKind;
  readonly icon: IconName;
  readonly currency: CurrencyCode;
  readonly reference: string;
  /** Negative on a card is money owed. */
  readonly balance: number;
  /** When the figure itself was last typed, which is not when the row changed. */
  readonly balanceUpdatedAt: string;
  readonly includeInTotal: boolean;
  /** Cards only; `null` on every other kind. */
  readonly creditLimit: number | null;
  readonly dueDay: number | null;
};

export type CurrencyAmount = {
  readonly currency: CurrencyCode;
  readonly amount: number;
};

/**
 * The summary, summed in the database. Only base-currency wallets reach
 * `totalHeld`; card debt and any other currency stay on their own lines,
 * because nothing here has an exchange rate to fold them in with.
 */
export type WalletOverviewRecord = {
  readonly baseCurrency: CurrencyCode;
  readonly totalHeld: number;
  readonly countedWallets: number;
  /** Negative, or 0 when nothing is owed. */
  readonly owedOnCards: number;
  readonly heldByCurrency: readonly CurrencyAmount[];
};

/* ── parsing ───────────────────────────────────────────────────────────── */

/** A wallet with no icon of its own — or one this sprite cannot draw — follows its kind. */
function readWalletIcon(
  raw: Record<string, unknown>,
  kind: WalletKind,
): IconName {
  const name = readString(raw, "icon");
  return ICON_NAMES.find((icon) => icon === name) ?? ICON_BY_KIND[kind];
}

/** A card-only field: absent, null, or on another kind, all read as none. */
function readCardField(
  raw: Record<string, unknown>,
  key: string,
  kind: WalletKind,
): number | null {
  return kind === CARD_KIND ? readNumber(raw, key) : null;
}

function parseWallet(raw: unknown): WalletRecord | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = readString(raw, "id");
  const name = readString(raw, "name");
  if (!id || !name) {
    return null;
  }

  const kind = readEnum(raw, "type", WALLET_KIND_ORDER, "bank");

  return {
    id,
    name,
    kind,
    icon: readWalletIcon(raw, kind),
    currency: readEnum(raw, "currency", CURRENCY_ORDER, "IDR"),
    reference: readString(raw, "reference") ?? "",
    balance: readNumber(raw, "balance") ?? 0,
    balanceUpdatedAt: readString(raw, "balance_updated_at") ?? "",
    includeInTotal: readBoolean(raw, "include_in_total"),
    creditLimit: readCardField(raw, "credit_limit", kind),
    dueDay: readCardField(raw, "due_day", kind),
  };
}

function parseWallets(raw: unknown): readonly WalletRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const wallets: WalletRecord[] = [];
  for (const entry of raw) {
    const wallet = parseWallet(entry);
    if (wallet) {
      wallets.push(wallet);
    }
  }
  return wallets;
}

function parseCurrencyAmounts(raw: unknown): readonly CurrencyAmount[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const amounts: CurrencyAmount[] = [];
  for (const entry of raw) {
    if (isRecord(entry)) {
      amounts.push({
        currency: readEnum(entry, "currency", CURRENCY_ORDER, "IDR"),
        amount: readNumber(entry, "amount") ?? 0,
      });
    }
  }
  return amounts;
}

function parseOverview(raw: unknown): WalletOverviewRecord | null {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    baseCurrency: readEnum(raw, "base_currency", CURRENCY_ORDER, "IDR"),
    totalHeld: readNumber(raw, "total_held") ?? 0,
    countedWallets: readNumber(raw, "counted_wallets") ?? 0,
    owedOnCards: readNumber(raw, "owed_on_cards") ?? 0,
    heldByCurrency: parseCurrencyAmounts(raw.held_by_currency),
  };
}

/* ── reads ─────────────────────────────────────────────────────────────── */

/**
 * GET /wallets — every wallet the signed-in user owns, newest first. This
 * endpoint does not page: a person keeps a handful of wallets, and the summary
 * bar colours them by their position in this one list.
 *
 * The array is taken straight off the result rather than through `withParsed`,
 * which would read a first, empty workspace as an unreadable answer.
 */
export async function listWallets(
  accessToken: string,
): Promise<ApiResult<readonly WalletRecord[]>> {
  const result = await apiRequest({
    path: WALLETS,
    method: "GET",
    accessToken,
  });
  return result.ok ? { ...result, data: parseWallets(result.data) } : result;
}

/** GET /wallets/overview */
export async function fetchWalletOverview(
  accessToken: string,
): Promise<ApiResult<WalletOverviewRecord>> {
  return withParsed(
    await apiRequest({ path: OVERVIEW, method: "GET", accessToken }),
    parseOverview,
  );
}

/* ── writes ────────────────────────────────────────────────────────────── */

/** What the editor saves, in the wallet's own currency. */
export type WalletInput = {
  readonly name: string;
  readonly kind: WalletKind;
  /** An icon key from this app's sprite; "" leaves the wallet on its kind's. */
  readonly icon: string;
  readonly currency: CurrencyCode;
  readonly reference: string;
  readonly balance: number;
  readonly includeInTotal: boolean;
  /** Cards only, and never sent on another kind — the backend rejects that. */
  readonly creditLimit: number | null;
  readonly dueDay: number | null;
};

/**
 * The card-only pair. Left out entirely unless the wallet is a card: the
 * backend rejects either field on any other kind, and on a card it reads an
 * absent one as "leave the stored value alone".
 */
function cardFields(input: WalletInput): Record<string, unknown> {
  if (input.kind !== CARD_KIND) {
    return {};
  }

  const fields: Record<string, unknown> = {};
  if (input.creditLimit !== null) {
    fields.credit_limit = input.creditLimit;
  }
  if (input.dueDay !== null) {
    fields.due_day = input.dueDay;
  }
  return fields;
}

function walletBody(input: WalletInput): Record<string, unknown> {
  return {
    name: input.name,
    type: input.kind,
    currency: input.currency,
    reference: input.reference,
    icon: input.icon,
    balance: input.balance,
    include_in_total: input.includeInTotal,
    ...cardFields(input),
  };
}

/** POST /wallets */
export async function createWallet(
  accessToken: string,
  input: WalletInput,
): Promise<ApiResult<WalletRecord>> {
  const result = await apiRequest({
    path: WALLETS,
    method: "POST",
    accessToken,
    body: walletBody(input),
  });
  return withParsed(result, parseWallet);
}

/**
 * PATCH /wallets/{id}. The sheet shows every field it can change, so every one
 * of them is sent — a partial save would let the form and the row disagree.
 */
export async function updateWallet(
  accessToken: string,
  id: string,
  input: WalletInput,
): Promise<ApiResult<WalletRecord>> {
  const result = await apiRequest({
    path: `${WALLETS}/${id}`,
    method: "PATCH",
    accessToken,
    body: walletBody(input),
  });
  return withParsed(result, parseWallet);
}

/** DELETE /wallets/{id} */
export async function deleteWallet(
  accessToken: string,
  id: string,
): Promise<ApiResult<null>> {
  return withoutData(
    await apiRequest({
      path: `${WALLETS}/${id}`,
      method: "DELETE",
      accessToken,
    }),
  );
}

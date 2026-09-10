import {
  fetchWalletOverview,
  listWallets,
  type WalletOverviewRecord,
  type WalletRecord,
} from "@/lib/api/wallets";
import { requireAccessToken } from "@/lib/auth/session";
import {
  formatDayMonth,
  formatSince,
  isoDayOf,
  nextDueDate,
  todayInJakarta,
} from "@/lib/dates";
import { formatBalance, formatFigure, formatMoney } from "@/lib/format";
import {
  CASH_META,
  CURRENCY_ORDER,
  WALLET_KIND_ORDER,
} from "@/lib/wallet-fields";
import type {
  CurrencyCode,
  RampStep,
  WalletCard,
  WalletDraft,
  WalletKind,
  WalletShare,
  WalletSummary,
  WalletSummaryRow,
} from "@/types/ledger";

/**
 * The wallets screen, served from `ledgerline-backend`.
 *
 * Nothing connects to a bank — there is no free way to reach one from Indonesia —
 * so a balance starts as a figure its owner typed. It does not stay one: the
 * backend adds every transaction filed since that figure was stated, and
 * `currentBalance` is what the cards print. The typed figure is the point the
 * counting starts from, and restating it is what a reconciliation *is*.
 *
 * So `balance` and `currentBalance` are two different claims and never
 * interchangeable. The age is still measured against the real day in Jakarta
 * rather than a fixture's frozen `TODAY`, and it now reads as how long ago the
 * wallet was last reconciled.
 */

/* ── how a wallet prints ───────────────────────────────────────────────── */

const KIND_LABEL: Readonly<Record<WalletKind, string>> = {
  bank: "Bank account",
  ewallet: "E-wallet",
  card: "Credit card",
  cash: "Cash",
};

function walletMeta(wallet: WalletRecord): string {
  if (wallet.reference) {
    return `${KIND_LABEL[wallet.kind]} · ${wallet.reference}`;
  }
  return wallet.kind === "cash" ? CASH_META : KIND_LABEL[wallet.kind];
}

/** The day the balance was last stated, as a Jakarta calendar day. */
function updatedOn(wallet: WalletRecord): string {
  return isoDayOf(wallet.balanceUpdatedAt);
}

/**
 * A card reports its headroom and its statement day; everything else says where
 * its figure came from.
 *
 * Once transactions have moved a wallet, the headline no longer matches anything
 * anybody typed, so the line names the figure it started from — "from Rp100.000
 * stated 7 days ago" — rather than calling the result an update. A wallet nothing
 * has touched since says only its age, because there is no second figure to name.
 */
function walletSub(wallet: WalletRecord, today: string): string {
  if (wallet.creditLimit !== null && wallet.dueDay !== null) {
    const free = wallet.creditLimit - Math.abs(wallet.currentBalance);
    const due = formatDayMonth(nextDueDate(wallet.dueDay, today));
    return `${formatMoney(free, wallet.currency)} of limit free · due ${due}`;
  }

  const since = formatSince(updatedOn(wallet), today);
  if (wallet.currentBalance === wallet.balance) {
    return `Updated ${since}`;
  }
  return `From ${formatMoney(wallet.balance, wallet.currency)} stated ${since}`;
}

/** Cards carry two fields nothing else does; blank rather than "0" on the rest. */
function optionalFigure(value: number | null, currency: CurrencyCode): string {
  return value === null ? "" : formatFigure(value, currency);
}

/**
 * What the edit slide-over opens with.
 *
 * The balance field holds the *stated* figure, never the running one. Filling it
 * with the running balance would turn merely opening the sheet and saving into a
 * reconciliation: the figure would be restated as of now, and every transaction
 * behind it would stop counting even though it is already baked into the number.
 */
function toDraft(wallet: WalletRecord, today: string): WalletDraft {
  return {
    id: wallet.id,
    name: wallet.name,
    kind: wallet.kind,
    icon: wallet.icon,
    currency: wallet.currency,
    reference: wallet.reference,
    balance: formatFigure(wallet.balance, wallet.currency),
    creditLimit: optionalFigure(wallet.creditLimit, wallet.currency),
    dueDay: wallet.dueDay === null ? "" : String(wallet.dueDay),
    includeInTotal: wallet.includeInTotal,
    updatedSince: formatSince(updatedOn(wallet), today),
  };
}

function toCard(wallet: WalletRecord, today: string): WalletCard {
  return {
    id: wallet.id,
    name: wallet.name,
    icon: wallet.icon,
    currency: wallet.currency,
    meta: walletMeta(wallet),
    balance: formatBalance(wallet.currentBalance, wallet.currency),
    sub: walletSub(wallet, today),
    isNegative: wallet.currentBalance < 0,
    draft: toDraft(wallet, today),
  };
}

/* ── the summary panel ─────────────────────────────────────────────────── */

/** The categorical ramp, in order. Wallets take a step by position. */
const RAMP_STEPS: readonly RampStep[] = [
  "c1",
  "c2",
  "c3",
  "c4",
  "c5",
  "c6",
  "c7",
];

const FULL_PERCENT = 100;

/**
 * Shares are rounded to whole percents, so the last one takes whatever the
 * rounding left behind — otherwise the bar stops a pixel or two short.
 */
function toShares(
  assets: readonly WalletRecord[],
  held: number,
): readonly WalletShare[] {
  if (held === 0) {
    return [];
  }

  let claimed = 0;
  return assets.map((wallet, index) => {
    const isLast = index === assets.length - 1;
    const percent = isLast
      ? FULL_PERCENT - claimed
      : Math.round((wallet.currentBalance / held) * FULL_PERCENT);
    claimed += percent;

    return {
      id: wallet.id,
      label: wallet.name,
      width: `${percent}%`,
      step: RAMP_STEPS[index % RAMP_STEPS.length],
    };
  });
}

/**
 * What is owed on cards, and what is held in a currency the headline cannot
 * state. Both come off `/wallets/overview`, which sums them in the database —
 * one grouped read cannot disagree with itself the way two sums here could.
 */
function toRows(overview: WalletOverviewRecord): readonly WalletSummaryRow[] {
  const rows: WalletSummaryRow[] = [];

  if (overview.owedOnCards !== 0) {
    rows.push({
      id: "row-owed",
      label: "Owed on cards",
      value: formatBalance(overview.owedOnCards, overview.baseCurrency),
      tone: "expense",
    });
  }

  // Its own line, not folded into the one above: spending past what a bank account
  // holds is a different thing from owing on a card, and it is the kind of thing
  // somebody wants to see the moment it happens.
  if (overview.overdrawn !== 0) {
    rows.push({
      id: "row-overdrawn",
      label: overdrawnLabel(overview.overdrawnWallets),
      value: formatBalance(overview.overdrawn, overview.baseCurrency),
      tone: "expense",
    });
  }

  for (const held of overview.heldByCurrency) {
    rows.push({
      id: `row-held-${held.currency}`,
      label: `Held in ${held.currency}`,
      value: formatBalance(held.amount, held.currency),
      tone: "text",
    });
  }

  return rows;
}

/** "Overdrawn" / "Overdrawn on 2 wallets" — the count only earns its words past one. */
function overdrawnLabel(count: number): string {
  return count > 1 ? `Overdrawn on ${count} wallets` : "Overdrawn";
}

function accountsLine(count: number, base: CurrencyCode): string {
  if (count === 0) {
    return `Nothing counted towards a ${base} total yet`;
  }
  const noun = count === 1 ? "account" : "accounts";
  return `Across ${count} ${base} ${noun}`;
}

/** Which wallets the bar is drawn from: what the headline total is made of. */
function countedAssets(
  wallets: readonly WalletRecord[],
  base: CurrencyCode,
): readonly WalletRecord[] {
  return wallets.filter(
    (wallet) =>
      wallet.includeInTotal &&
      wallet.currency === base &&
      wallet.currentBalance >= 0,
  );
}

function toSummary(
  wallets: readonly WalletRecord[],
  overview: WalletOverviewRecord,
): WalletSummary {
  const base = overview.baseCurrency;

  return {
    total: formatMoney(overview.totalHeld, base),
    meta: accountsLine(overview.countedWallets, base),
    shares: toShares(countedAssets(wallets, base), overview.totalHeld),
    rows: toRows(overview),
  };
}

/* ── the selects ───────────────────────────────────────────────────────── */

/** The type select. The value is the stored `kind`; the label is what prints. */
export const WALLET_KIND_OPTIONS: readonly {
  readonly value: WalletKind;
  readonly label: string;
}[] = WALLET_KIND_ORDER.map((kind) => ({
  value: kind,
  label: KIND_LABEL[kind],
}));

const CURRENCY_LABEL: Readonly<Record<CurrencyCode, string>> = {
  IDR: "IDR — Rupiah",
  USD: "USD — US Dollar",
  SGD: "SGD — Singapore Dollar",
};

export const WALLET_CURRENCY_OPTIONS: readonly {
  readonly value: CurrencyCode;
  readonly label: string;
}[] = CURRENCY_ORDER.map((code) => ({
  value: code,
  label: CURRENCY_LABEL[code],
}));

/* ── the query ─────────────────────────────────────────────────────────── */

export type WalletsScreen = {
  readonly wallets: readonly WalletCard[];
  readonly summary: WalletSummary;
  /** Why the screen is empty, when the API could not answer at all. */
  readonly error: string;
};

/** The headline a screen shows when it has nothing to state a total from. */
const EMPTY_OVERVIEW: WalletOverviewRecord = {
  baseCurrency: "IDR",
  totalHeld: 0,
  countedWallets: 0,
  owedOnCards: 0,
  overdrawn: 0,
  overdrawnWallets: 0,
  heldByCurrency: [],
};

function emptyScreen(error: string): WalletsScreen {
  return {
    wallets: [],
    summary: toSummary([], EMPTY_OVERVIEW),
    error,
  };
}

/**
 * The cards and the summary in one call. The list and the overview are fetched
 * together because the bar is a split of the very cards printed under it: they
 * have to be read from the same moment or the legend names a wallet the total
 * does not count.
 */
export async function getWalletsScreen(): Promise<WalletsScreen> {
  const accessToken = await requireAccessToken();
  const [listed, overview] = await Promise.all([
    listWallets(accessToken),
    fetchWalletOverview(accessToken),
  ]);

  if (!listed.ok) {
    return emptyScreen(listed.error.message);
  }
  if (!overview.ok) {
    return emptyScreen(overview.error.message);
  }

  const today = todayInJakarta();
  return {
    wallets: listed.data.map((wallet) => toCard(wallet, today)),
    summary: toSummary(listed.data, overview.data),
    error: "",
  };
}

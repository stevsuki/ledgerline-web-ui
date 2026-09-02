import { TODAY } from "@/lib/data/transactions";
import { formatDayMonth, formatSince, nextDueDate } from "@/lib/dates";
import { formatBalance, formatMoney } from "@/lib/format";
import type {
  CurrencyCode,
  RampStep,
  Wallet,
  WalletCard,
  WalletKind,
  WalletShare,
  WalletSummary,
  WalletSummaryRow,
} from "@/types/ledger";

/**
 * The artboard's `wallets` list (Finance App.dc.html, lines ~2146-2152), taken
 * apart into the fields it printed as sentences. Nothing connects to a bank —
 * there is no free way to reach one from Indonesia — so every balance here is
 * a figure its owner typed, and the cards say when they last did.
 */
const WALLETS: readonly Wallet[] = [
  {
    id: "wal-bca-payroll",
    name: "BCA Payroll",
    kind: "bank",
    icon: "bank",
    reference: "••4192",
    currency: "IDR",
    balance: 41_200_000,
    creditLimit: null,
    dueDay: null,
    updatedOn: "2026-08-26",
    includeInTotal: true,
  },
  {
    id: "wal-wise",
    name: "Wise USD",
    kind: "bank",
    icon: "globe",
    reference: "••8830",
    currency: "USD",
    balance: 1_480,
    creditLimit: null,
    dueDay: null,
    updatedOn: "2026-08-22",
    includeInTotal: true,
  },
  {
    id: "wal-gopay",
    name: "GoPay",
    kind: "ewallet",
    icon: "phone",
    reference: "0812••4471",
    currency: "IDR",
    balance: 1_860_000,
    creditLimit: null,
    dueDay: null,
    updatedOn: "2026-08-27",
    includeInTotal: true,
  },
  {
    id: "wal-bca-card",
    name: "BCA Card",
    kind: "card",
    icon: "card",
    reference: "••7702",
    currency: "IDR",
    balance: -3_240_000,
    creditLimit: 25_000_000,
    dueDay: 18,
    updatedOn: "2026-08-25",
    includeInTotal: true,
  },
  {
    id: "wal-cash",
    name: "Cash",
    kind: "cash",
    icon: "cash",
    reference: "",
    currency: "IDR",
    balance: 620_000,
    creditLimit: null,
    dueDay: null,
    updatedOn: "2026-08-25",
    includeInTotal: true,
  },
];

/* ── how a wallet prints ───────────────────────────────────────────────── */

const KIND_LABEL: Readonly<Record<WalletKind, string>> = {
  bank: "Bank account",
  ewallet: "E-wallet",
  card: "Credit card",
  cash: "Cash",
};

/** Cash has no account number to print, so it says how it is kept instead. */
const CASH_META = "Counted by hand";

function walletMeta(wallet: Wallet): string {
  if (wallet.reference) {
    return `${KIND_LABEL[wallet.kind]} · ${wallet.reference}`;
  }
  return wallet.kind === "cash" ? CASH_META : KIND_LABEL[wallet.kind];
}

/** A card reports its headroom and its statement day; everything else, its age. */
function walletSub(wallet: Wallet): string {
  if (wallet.creditLimit !== null && wallet.dueDay !== null) {
    const free = wallet.creditLimit - Math.abs(wallet.balance);
    const due = formatDayMonth(nextDueDate(wallet.dueDay, TODAY));
    return `${formatMoney(free, wallet.currency)} of limit free · due ${due}`;
  }
  return `Updated ${formatSince(wallet.updatedOn, TODAY)}`;
}

function toCard(wallet: Wallet): WalletCard {
  return {
    id: wallet.id,
    name: wallet.name,
    icon: wallet.icon,
    currency: wallet.currency,
    meta: walletMeta(wallet),
    balance: formatBalance(wallet.balance, wallet.currency),
    sub: walletSub(wallet),
    isNegative: wallet.balance < 0,
  };
}

/* ── the summary panel ─────────────────────────────────────────────────── */

/** The currency the workspace states its headline total in. */
const BASE_CURRENCY: CurrencyCode = "IDR";

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

function totalOf(wallets: readonly Wallet[]): number {
  return wallets.reduce((running, wallet) => running + wallet.balance, 0);
}

const FULL_PERCENT = 100;

/**
 * Shares are rounded to whole percents, so the last one takes whatever the
 * rounding left behind — otherwise the bar stops a pixel or two short.
 */
function toShares(
  assets: readonly Wallet[],
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
      : Math.round((wallet.balance / held) * FULL_PERCENT);
    claimed += percent;

    return {
      id: wallet.id,
      label: wallet.name,
      width: `${percent}%`,
      step: RAMP_STEPS[index % RAMP_STEPS.length],
    };
  });
}

/** What is owed on cards, and what is held in a currency the total cannot state. */
function toRows(
  counted: readonly Wallet[],
  owed: readonly Wallet[],
): readonly WalletSummaryRow[] {
  const rows: WalletSummaryRow[] = [];

  if (owed.length > 0) {
    rows.push({
      id: "row-owed",
      label: "Owed on cards",
      value: formatBalance(totalOf(owed), BASE_CURRENCY),
      tone: "expense",
    });
  }

  for (const currency of otherCurrencies(counted)) {
    const held = counted.filter((wallet) => wallet.currency === currency);
    rows.push({
      id: `row-held-${currency}`,
      label: `Held in ${currency}`,
      value: formatBalance(totalOf(held), currency),
      tone: "text",
    });
  }

  return rows;
}

/** Every currency but the base one, in the order the wallets were added. */
function otherCurrencies(
  counted: readonly Wallet[],
): readonly CurrencyCode[] {
  const seen = new Set<CurrencyCode>();
  for (const wallet of counted) {
    if (wallet.currency !== BASE_CURRENCY) {
      seen.add(wallet.currency);
    }
  }
  return [...seen];
}

function accountsLine(count: number): string {
  const noun = count === 1 ? "account" : "accounts";
  return `Across ${count} ${BASE_CURRENCY} ${noun}`;
}

/* ── queries ───────────────────────────────────────────────────────────── */

export const WALLET_KINDS = [
  "Bank account",
  "E-wallet",
  "Credit card",
  "Cash",
] as const;

export const WALLET_CURRENCIES = [
  "IDR — Rupiah",
  "USD — US Dollar",
  "SGD — Singapore Dollar",
] as const;

export async function getWallets(): Promise<readonly WalletCard[]> {
  return WALLETS.map(toCard);
}

/**
 * Money held, split by wallet. Card debt and any non-base currency sit under the
 * split as their own lines: with no exchange rate to hand, a single figure that
 * mixed them would be a guess.
 */
export async function getWalletSummary(): Promise<WalletSummary> {
  const counted = WALLETS.filter((wallet) => wallet.includeInTotal);
  const base = counted.filter((wallet) => wallet.currency === BASE_CURRENCY);
  const assets = base.filter((wallet) => wallet.balance >= 0);
  const owed = base.filter((wallet) => wallet.balance < 0);
  const held = totalOf(assets);

  return {
    total: formatMoney(held, BASE_CURRENCY),
    meta: accountsLine(assets.length),
    shares: toShares(assets, held),
    rows: toRows(counted, owed),
  };
}

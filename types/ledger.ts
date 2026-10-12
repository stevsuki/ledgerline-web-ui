import type { IconKey } from "@/lib/icon-choice";

/** Semantic colour roles from the artboard, resolved to a token by `toneClass`. */
export type Tone = "text" | "muted" | "income" | "expense" | "warn" | "accent";

/** The seven-step categorical ramp, in category order. */
export type RampStep = "c1" | "c2" | "c3" | "c4" | "c5" | "c6" | "c7";

/** A colour somebody chose for themselves, as `#rrggbb`. */
export type HexColor = `#${string}`;

/**
 * What a record is painted with: a step of the theme's ramp, or a colour of
 * its own. A step follows the theme; a hex is the same in light and dark.
 */
export type ColorKey = RampStep | HexColor;

export type CategoryKey =
  | "housing"
  | "food"
  | "transport"
  | "subs"
  | "utilities"
  | "health"
  | "other"
  | "income";

export type Category = {
  readonly key: CategoryKey;
  readonly label: string;
  readonly icon: IconKey;
};

/**
 * Which way a category runs. It is not cosmetic: only a spending category can
 * be budgeted, and only a spending category takes a step of the seven-colour
 * ramp — income is where money comes from, not somewhere it goes.
 */
export type CategoryKind = "expense" | "income";

export type WalletName =
  | "BCA Payroll"
  | "BCA Card"
  | "GoPay"
  | "Cash"
  | "Wise USD";

export type Transaction = {
  readonly id: string;
  /** ISO date, so the range filter is a real comparison rather than a stub. */
  readonly date: string;
  /** The artboard's long-form day heading, e.g. "Wednesday, 27 August". */
  readonly day: string;
  readonly name: string;
  readonly note: string;
  readonly category: CategoryKey;
  readonly wallet: WalletName;
  readonly walletIcon: IconKey;
  /** Negative is money out. */
  readonly amount: number;
  /**
   * What `amount` is denominated in. A row carries this rather than inheriting
   * it from its wallet because a wallet can hold more than one — Wise is built
   * that way — and because nothing here fetches a rate, so an amount that does
   * not say what it is cannot be added to anything.
   */
  readonly currency: CurrencyCode;
};

/**
 * A total in one currency. Anywhere several rows are summed, the answer is a
 * list of these rather than a single number: with no exchange rate to hand,
 * adding across currencies is a guess, which is the same reason the wallets
 * summary states its headline in one currency and lists the rest beneath.
 */
export type MoneySum = {
  readonly currency: CurrencyCode;
  readonly amount: number;
};

/*
 * A budget is no longer a type here: its limit lives in `lib/data/budgets.ts`
 * and what it has spent is a question for the ledger, so nothing shared needs
 * to name the pair. The donut slice went the same way — `CategorySpend` in
 * `lib/data/ledger.ts` is the one shape a category total is carried in.
 */

export type TransactionGroup = {
  readonly day: string;
  /** One net per currency the day carries — usually just the one. */
  readonly net: readonly MoneySum[];
  readonly items: readonly Transaction[];
};

/**
 * A ledger row as the transactions screen renders it, resolved from the API.
 *
 * Unlike `Transaction`, the category and wallet are the free-form names the
 * account actually holds, not the fixture's fixed keys — the transactions
 * screen reads them live, while the dashboard and the aggregates still read the
 * fixture through `Transaction`. Each carries its own resolved icon so the row
 * never has to reach back into a fixed lookup that a live name may not be in.
 */
/**
 * A row as the add/edit sheet holds it: ids rather than names, and the figure
 * and the stamp already split into the fields that edit them.
 *
 * The list prints names because a name is what a reader recognises; the sheet
 * posts ids because an id is what the backend takes. Carrying both off one read
 * is what lets the pencil open a filled-in form without fetching the row again.
 */
export type TransactionDraft = {
  readonly id: string;
  readonly categoryId: string;
  readonly walletId: string;
  readonly type: CategoryKind;
  /** The magnitude as the amount field holds it: grouped, and never signed. */
  readonly amount: string;
  /**
   * What the row is denominated in. The sheet only types rupiah, but an entry
   * that arrived in another currency keeps it: an edit to the note of a dollar
   * row must not quietly redenominate the amount.
   */
  readonly currency: CurrencyCode;
  readonly name: string;
  readonly note: string;
  /** The Jakarta day, and the Jakarta clock time on it. */
  readonly date: string;
  readonly time: string;
};

export type LedgerItem = {
  readonly id: string;
  readonly name: string;
  readonly note: string;
  readonly categoryName: string;
  readonly categoryIcon: IconKey;
  readonly walletName: string;
  readonly walletIcon: IconKey;
  /** Negative is money out. */
  readonly amount: number;
  readonly currency: CurrencyCode;
  /** The same row, as the sheet would edit it. */
  readonly draft: TransactionDraft;
};

/**
 * A row of the dashboard's "Recent transactions": a ledger row, plus the day it
 * fell on. The panel lists across days, so each row carries its own.
 */
export type RecentEntry = LedgerItem & { readonly dayLabel: string };

/** One day of the live ledger: the API's group, resolved for print. */
export type LedgerDay = {
  readonly day: string;
  readonly net: readonly MoneySum[];
  readonly items: readonly LedgerItem[];
};

/** What kind of thing the wallet is. Drives its label, and the card-only fields. */
export type WalletKind = "bank" | "ewallet" | "card" | "cash";

/**
 * Currencies a wallet may be kept in. Nothing here fetches an exchange rate, so
 * a total never crosses one — each currency is summed on its own.
 */
export type CurrencyCode = "IDR" | "USD" | "SGD";

/*
 * A wallet as it is stored has no type here any more: it is `WalletRecord` in
 * `lib/api/wallets.ts`, narrowed straight off the API. What stays below is what
 * the screen renders — figures already formatted for print.
 */

/** One choice in a select: a stored code, and the words shown for it. */
export type SelectChoice = {
  readonly value: string;
  readonly label: string;
};

/**
 * A wallet as the editor edits it: every figure is a string, because that is
 * what a text field holds. Nothing syncs, so this is also the only way a
 * balance ever changes.
 */
export type WalletDraft = {
  readonly id: string;
  readonly name: string;
  readonly kind: WalletKind;
  readonly icon: IconKey;
  readonly currency: CurrencyCode;
  readonly reference: string;
  /** Grouped the Indonesian way, with a plain hyphen so it can be typed over. */
  readonly balance: string;
  /** Cards only. Blank on everything else. */
  readonly creditLimit: string;
  /** Cards only, as a day of the month. Blank on everything else. */
  readonly dueDay: string;
  readonly includeInTotal: boolean;
  /** "6 days ago" — how stale the figure is, since nothing refreshes it. */
  readonly updatedSince: string;
};

/** One wallet card, with every figure already formatted for print. */
export type WalletCard = {
  readonly id: string;
  readonly name: string;
  readonly icon: IconKey;
  readonly currency: CurrencyCode;
  readonly meta: string;
  readonly balance: string;
  readonly sub: string;
  readonly isNegative: boolean;
  /** What the edit slide-over opens with. */
  readonly draft: WalletDraft;
};

/** One wallet's share of the money held in a single currency. */
export type WalletShare = {
  readonly id: string;
  readonly label: string;
  readonly width: string;
  readonly step: RampStep;
};

/** A line under the split: card debt, or a balance held in another currency. */
export type WalletSummaryRow = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly tone: Tone;
};

export type WalletSummary = {
  /** The headline total, in the one currency it can honestly be stated in. */
  readonly total: string;
  readonly meta: string;
  readonly shares: readonly WalletShare[];
  readonly rows: readonly WalletSummaryRow[];
};

export type Goal = {
  readonly id: string;
  readonly name: string;
  readonly deadline: string;
  readonly icon: IconKey;
  readonly percent: string;
  readonly saved: string;
  readonly target: string;
  readonly monthly: string;
  readonly eta: string;
};

export type Insight = {
  readonly id: string;
  readonly kicker: string;
  readonly icon: IconKey;
  readonly tone: Tone;
  readonly title: string;
  readonly body: string;
};

export type CategoryRank = {
  readonly rank: string;
  readonly label: string;
  readonly value: string;
  readonly delta: string;
  readonly deltaTone: Tone;
};

export type TrendPoint = {
  readonly label: string;
  readonly income: number;
  readonly expense: number;
};

export type TrendMode = "weekly" | "monthly";

export type SummaryStat = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly icon: IconKey;
  readonly iconTone: Tone;
  readonly valueTone: Tone;
  readonly delta: string;
  readonly deltaTone: Tone;
  readonly deltaNote: string;
};

/** The compact three/four-up stat strip used by five different screens. */
export type MiniStat = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly tone: Tone;
  readonly note?: string;
};

export type SharedCategory = {
  readonly id: string;
  readonly label: string;
  readonly spent: string;
  readonly limit: string;
  readonly width: string;
  readonly tone: Tone;
};

export type SharedMember = {
  readonly id: string;
  readonly name: string;
  readonly contribution: string;
  readonly role: string;
  readonly isOwner: boolean;
};

export type Bill = {
  readonly id: string;
  readonly month: string;
  readonly day: string;
  readonly name: string;
  readonly meta: string;
  readonly state: string;
  readonly amount: string;
  readonly isImminent: boolean;
};

export type BudgetAlert = {
  readonly id: string;
  readonly icon: IconKey;
  readonly tone: Tone;
  readonly title: string;
  readonly meta: string;
};

export type Reminder = {
  readonly id: string;
  readonly icon: IconKey;
  readonly tone: Tone;
  readonly title: string;
  readonly meta: string;
};

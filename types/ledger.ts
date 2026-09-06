import type { IconName } from "@/components/ui/icon-sprite";

/** Semantic colour roles from the artboard, resolved to a token by `toneClass`. */
export type Tone = "text" | "muted" | "income" | "expense" | "warn" | "accent";

/** The seven-step categorical ramp, in category order. */
export type RampStep = "c1" | "c2" | "c3" | "c4" | "c5" | "c6" | "c7";

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
  readonly icon: IconName;
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
  readonly walletIcon: IconName;
  /** Negative is money out. */
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
  readonly net: number;
  readonly items: readonly Transaction[];
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
  readonly icon: IconName;
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
  readonly icon: IconName;
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
  readonly icon: IconName;
  readonly percent: string;
  readonly saved: string;
  readonly target: string;
  readonly monthly: string;
  readonly eta: string;
};

export type RecurringItem = {
  readonly id: string;
  readonly name: string;
  readonly wallet: string;
  readonly icon: IconName;
  readonly frequency: string;
  readonly due: string;
  readonly amount: string;
  readonly isDueSoon: boolean;
  readonly isPaused: boolean;
};

export type Insight = {
  readonly id: string;
  readonly kicker: string;
  readonly icon: IconName;
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
  readonly icon: IconName;
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
  readonly icon: IconName;
  readonly tone: Tone;
  readonly title: string;
  readonly meta: string;
};

export type Reminder = {
  readonly id: string;
  readonly icon: IconName;
  readonly tone: Tone;
  readonly title: string;
  readonly meta: string;
};

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

export type TransactionGroup = {
  readonly day: string;
  readonly net: number;
  readonly items: readonly Transaction[];
};

export type Budget = {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  readonly spent: number;
  readonly limit: number;
  readonly threshold: string;
};

export type BudgetView = Budget & {
  readonly ratio: number;
  readonly isOver: boolean;
  readonly isNear: boolean;
};

/** What kind of thing the wallet is. Drives its label, and the card-only fields. */
export type WalletKind = "bank" | "ewallet" | "card" | "cash";

/**
 * Currencies a wallet may be kept in. Nothing here fetches an exchange rate, so
 * a total never crosses one — each currency is summed on its own.
 */
export type CurrencyCode = "IDR" | "USD" | "SGD";

/** A wallet as it is stored: figures are numbers, never formatted strings. */
export type Wallet = {
  readonly id: string;
  readonly name: string;
  readonly kind: WalletKind;
  readonly icon: IconName;
  /** The tail printed after the kind — "••4192", "0812••4471". Blank for cash. */
  readonly reference: string;
  readonly currency: CurrencyCode;
  /** In the wallet's own currency. Negative on a card is money owed. */
  readonly balance: number;
  /** Cards only: the ceiling the balance is drawn against. */
  readonly creditLimit: number | null;
  /** Cards only: day of the month the statement falls due. */
  readonly dueDay: number | null;
  /** ISO day the owner last touched the balance. Nothing syncs it for them. */
  readonly updatedOn: string;
  readonly includeInTotal: boolean;
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

export type DonutSlice = {
  readonly label: string;
  readonly value: number;
  readonly step: RampStep;
};

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

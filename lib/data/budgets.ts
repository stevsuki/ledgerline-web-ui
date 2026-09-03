import type { IconName } from "@/components/ui/icon-sprite";
import { ICON_BY_CATEGORY, isPreset } from "@/lib/budget-fields";
import {
  listBudgetLimits,
  type BudgetLimit,
} from "@/lib/data/budget-store";
import { CATEGORIES, RAMP_BY_CATEGORY_LABEL } from "@/lib/data/categories";
import {
  categorySpend,
  cycleElapsed,
  daysLeftInCycle,
  shareOf,
} from "@/lib/data/ledger";
import {
  formatPercent,
  formatFigure,
  formatRupiah,
  toTrackWidth,
  toWholePercent,
} from "@/lib/format";
import type { CategoryKey, RampStep, Tone } from "@/types/ledger";

/**
 * The budgets screen: limits from the store, spending from the ledger, and
 * nothing in between that could disagree with either.
 */

/** A budget wears its category's tile unless it was given one of its own. */
function iconOf(budget: BudgetLimit): IconName {
  return budget.icon === "" ? ICON_BY_CATEGORY[budget.category] : budget.icon;
}

function labelOf(budget: BudgetLimit): string {
  return CATEGORIES[budget.category].label;
}

/** What the editor opens with. Every figure is a string, as a field holds one. */
export type BudgetDraft = {
  readonly category: CategoryKey;
  readonly label: string;
  readonly icon: IconName;
  readonly limit: string;
  /** A whole percentage, e.g. "80". */
  readonly threshold: string;
  /** Whether the threshold needs the Custom field to be reachable at all. */
  readonly isCustomThreshold: boolean;
  readonly rollover: boolean;
  readonly isFixed: boolean;
  /** Blank for a budget that does not exist yet. */
  readonly id: string;
};

export type BudgetRow = {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  /** "Alerts at 80% of limit · rolls over" */
  readonly meta: string;
  readonly tone: Tone;
  readonly isOver: boolean;
  readonly ratio: number;
  readonly width: string;
  /** Where the alert threshold sits on the track; "" when there is none. */
  readonly thresholdWidth: string;
  readonly spent: string;
  readonly limit: string;
  readonly remaining: string;
  readonly status: string;
  readonly draft: BudgetDraft;
};

/**
 * Amber is the budget's own alert threshold rather than one flat number for
 * every row — a budget that says "alerts at 75%" and stays grey at 82% is
 * telling you two different things at once.
 */
function toneFor(budget: BudgetLimit, ratio: number): Tone {
  if (ratio > 1) {
    return "expense";
  }
  // A fixed commitment has no approach to warn about — it lands on its whole
  // limit in one payment, so amber here would fire every month and mean nothing.
  // Once it has landed it is settled rather than merely unremarkable, and greys
  // out: the eye should pass over what is done and stop on what is not.
  if (budget.isFixed) {
    return ratio >= 1 ? "muted" : "text";
  }
  return ratio >= budget.threshold ? "warn" : "text";
}

/** A fixed payment is paid or it is not; a percentage of one says nothing. */
function statusOf(budget: BudgetLimit, ratio: number, isOver: boolean): string {
  if (isOver) {
    return "Over limit";
  }
  if (budget.isFixed && ratio >= 1) {
    return "Paid";
  }
  return formatPercent(ratio);
}

function metaOf(budget: BudgetLimit): string {
  const alerts = budget.isFixed
    ? "Fixed commitment · alerts only if it changes"
    : `Alerts at ${formatPercent(budget.threshold)} of limit`;
  return budget.rollover ? `${alerts} · rolls over` : alerts;
}

function toDraft(budget: BudgetLimit): BudgetDraft {
  return {
    id: budget.category,
    category: budget.category,
    label: labelOf(budget),
    icon: iconOf(budget),
    limit: formatFigure(budget.limit, "IDR"),
    threshold: String(toWholePercent(budget.threshold)),
    isCustomThreshold: !isPreset(budget.threshold),
    rollover: budget.rollover,
    isFixed: budget.isFixed,
  };
}

function toRow(budget: BudgetLimit): BudgetRow {
  const spent = categorySpend(budget.category).value;
  const ratio = shareOf(spent, budget.limit);
  const isOver = spent > budget.limit;
  const difference = spent - budget.limit;

  return {
    id: `bud-${budget.category}`,
    label: labelOf(budget),
    icon: iconOf(budget),
    meta: metaOf(budget),
    tone: toneFor(budget, ratio),
    isOver,
    ratio,
    width: toTrackWidth(ratio),
    thresholdWidth: budget.isFixed ? "" : toTrackWidth(budget.threshold),
    spent: formatRupiah(spent),
    limit: formatRupiah(budget.limit),
    remaining: isOver
      ? `${formatRupiah(difference)} over`
      : `${formatRupiah(-difference)} left`,
    status: statusOf(budget, ratio, isOver),
    draft: toDraft(budget),
  };
}

function budgetRows(): readonly BudgetRow[] {
  return listBudgetLimits().map(toRow);
}

export async function getBudgets(): Promise<readonly BudgetRow[]> {
  return budgetRows();
}

/** The dashboard's Budgets panel shows the first five. */
const DASHBOARD_BUDGET_COUNT = 5;

export async function getBudgetsPreview(): Promise<readonly BudgetRow[]> {
  return budgetRows().slice(0, DASHBOARD_BUDGET_COUNT);
}

/* ── what a new budget can be ──────────────────────────────────────────── */

/**
 * The categories a budget can still be created for.
 *
 * Only the seven spending categories: a budget for anything else could never
 * be measured, because no transaction can be filed under it. The artboard
 * offered Education, Travel and Gifts & donations here — none of which a
 * transaction can carry, so each would have shown Rp0 spent for ever.
 */
export type BudgetCategoryChoice = {
  readonly value: CategoryKey;
  readonly label: string;
};

export function budgetableCategories(): readonly BudgetCategoryChoice[] {
  const taken = new Set(listBudgetLimits().map((budget) => budget.category));

  return Object.values(CATEGORIES)
    .filter((category) => category.key !== "income" && !taken.has(category.key))
    .map((category) => ({ value: category.key, label: category.label }));
}

/** A budget that does not exist yet, for the category offered first. */
export function blankDraft(): BudgetDraft | null {
  const [first] = budgetableCategories();
  if (!first) {
    return null;
  }

  return {
    id: "",
    category: first.value,
    label: first.label,
    icon: ICON_BY_CATEGORY[first.value],
    limit: "",
    threshold: "80",
    isCustomThreshold: false,
    rollover: false,
    isFixed: false,
  };
}

/* ── the allocation panel ──────────────────────────────────────────────── */

function totalAllocated(): number {
  return listBudgetLimits().reduce((total, budget) => total + budget.limit, 0);
}

function totalSpent(): number {
  return listBudgetLimits().reduce(
    (total, budget) => total + categorySpend(budget.category).value,
    0,
  );
}

export type Allocation = {
  readonly total: string;
  readonly categoryCount: string;
  /** The figure the panel is really consulted for. */
  readonly spent: string;
  readonly percentLabel: string;
  readonly remainingNote: string;
  readonly cycleNote: string;
  /** Whether that spend is early or late for the day of the month. */
  readonly paceNote: string;
  readonly paceTone: Tone;
  readonly isOver: boolean;
};

const PACE_OVER = "Over the allocation";
const PACE_AHEAD = "Ahead of the cycle's pace";
const PACE_WITHIN = "Within the cycle's pace";

type Pace = { readonly note: string; readonly tone: Tone };

/**
 * A share of the allocation only means something next to how much of the cycle
 * has gone: 90% spent is alarming on the 12th and unremarkable on the 30th.
 *
 * Nothing here is ever `income` green — that colour means money coming in, and
 * spending on plan is not income.
 */
function paceOf(ratio: number, elapsed: number): Pace {
  if (ratio > 1) {
    return { note: PACE_OVER, tone: "expense" };
  }
  if (ratio > elapsed) {
    return { note: PACE_AHEAD, tone: "warn" };
  }
  return { note: PACE_WITHIN, tone: "muted" };
}

export function getBudgetAllocation(): Allocation {
  const allocated = totalAllocated();
  const spent = totalSpent();
  const ratio = shareOf(spent, allocated);
  const difference = spent - allocated;
  const isOver = difference > 0;
  const pace = paceOf(ratio, cycleElapsed());

  return {
    total: formatRupiah(allocated),
    categoryCount: `across ${listBudgetLimits().length} categories`,
    spent: formatRupiah(spent),
    percentLabel: `${formatPercent(ratio)} of allocation`,
    remainingNote: isOver
      ? `${formatRupiah(difference)} over`
      : `${formatRupiah(-difference)} unspent`,
    cycleNote: `${daysLeftInCycle()} days left in cycle`,
    paceNote: pace.note,
    paceTone: pace.tone,
    isOver,
  };
}

const FULL_PERCENT = 100;

export type AllocationShare = {
  readonly id: string;
  readonly step: RampStep;
  readonly width: string;
};

/**
 * The bar under "August allocated" — shares of the *limits*, not of the spend.
 *
 * The artboard drew the spending donut's shares here, under a heading naming
 * the allocation, so the two disagreed by whatever had not been spent yet.
 * Rounding leftovers go to the last share, the way the wallets bar does it, so
 * the ribbon always closes.
 */
export async function getAllocationShares(): Promise<
  readonly AllocationShare[]
> {
  const all = listBudgetLimits();
  const allocated = totalAllocated();
  let claimed = 0;

  return all.map((budget, index) => {
    const isLast = index === all.length - 1;
    const percent = isLast
      ? FULL_PERCENT - claimed
      : Math.round(shareOf(budget.limit, allocated) * FULL_PERCENT);
    claimed += percent;

    return {
      id: budget.category,
      step: RAMP_BY_CATEGORY_LABEL[labelOf(budget)],
      width: `${percent}%`,
    };
  });
}

/* ── needs attention ───────────────────────────────────────────────────── */

export type AttentionRun = {
  readonly text: string;
  readonly strong?: boolean;
};

export type AttentionItem = {
  readonly id: string;
  readonly tone: Tone;
  /** Split into runs so the emphasised figure stays inside the sentence. */
  readonly parts: readonly AttentionRun[];
};

function overLimitParts(row: BudgetRow): readonly AttentionRun[] {
  return [
    { text: `${row.label} is ` },
    { text: row.remaining, strong: true },
    { text: " its limit." },
  ];
}

function nearLimitParts(row: BudgetRow, days: number): readonly AttentionRun[] {
  return [
    {
      text: `${row.label} at ${formatPercent(row.ratio)} with ${days} days remaining.`,
    },
  ];
}

/**
 * Every budget that has reached its own alert threshold, worst first. Nothing
 * is truncated: a list called "needs attention" that hides an alert is worse
 * than a tall panel.
 */
export function getBudgetAttention(): readonly AttentionItem[] {
  const days = daysLeftInCycle();

  return budgetRows()
    .filter((row) => row.tone === "warn" || row.tone === "expense")
    .sort((a, b) => b.ratio - a.ratio)
    .map((row) => ({
      id: `attn-${row.id}`,
      tone: row.tone,
      parts: row.isOver ? overLimitParts(row) : nearLimitParts(row, days),
    }));
}

/** "6 category budgets · alerts from 75% of limit" — the screen's subtitle. */
export function budgetsSubtitle(): string {
  const all = listBudgetLimits();
  const alerting = all.filter((budget) => !budget.isFixed);
  if (alerting.length === 0) {
    return `${all.length} category budgets · no alert thresholds set`;
  }
  const lowest = Math.min(...alerting.map((budget) => budget.threshold));
  return `${all.length} category budgets · alerts from ${formatPercent(lowest)} of limit`;
}

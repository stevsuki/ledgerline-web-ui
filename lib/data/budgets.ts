import type { IconName } from "@/components/ui/icon-sprite";
import {
  fetchBudgetOverview,
  listBudgets,
  type BudgetAttentionRecord,
  type BudgetOverviewRecord,
  type BudgetRecord,
} from "@/lib/api/budgets";
import {
  fetchCategoryOptions,
  type CategoryOption,
} from "@/lib/api/categories";
import { requireAccessToken } from "@/lib/auth/session";
import { isPreset } from "@/lib/budget-fields";
import { ICON_BY_CATEGORY_KIND, RAMP_STEPS } from "@/lib/category-fields";
import { formatFigure, formatRupiah } from "@/lib/format";
import type { RampStep, Tone } from "@/types/ledger";

/**
 * The budgets screen, served from `ledgerline-backend`.
 *
 * Two calls answer it — `GET /budgets` for the cards and `GET /budgets/overview`
 * for the panel above them — and `getBudgetsScreen()` awaits them together for
 * the reason `getWalletsScreen()` does: the header states the sum of the very
 * cards printed under it, and read a moment apart the two could disagree in
 * front of someone who can add six figures themselves.
 *
 * Every percentage is the backend's whole number, used as it arrives. That is
 * what keeps a card's colour and its line in the attention list from ever
 * disagreeing: `budgetAttention` in the service and `toneFor` here compare the
 * same two integers, rather than each rounding a ratio of their own.
 */

/* ── how a budget prints ───────────────────────────────────────────────── */

/** A budget wears its category's tile; a category with none wears the kind's. */
function iconOf(record: { readonly icon: IconName | "" }): IconName {
  return record.icon === "" ? ICON_BY_CATEGORY_KIND.expense : record.icon;
}

/**
 * The ramp step a budget is drawn with.
 *
 * The colour is stored on the category, so adding a budget above another one
 * does not repaint the bar under it. Only a category that has never been given
 * one falls back to its position, and that step is the weak one: past seven,
 * two budgets share a colour and two slices cannot be told apart.
 */
function stepOf(color: RampStep | "", index: number): RampStep {
  return color === "" ? RAMP_STEPS[index % RAMP_STEPS.length] : color;
}

/**
 * Amber is the budget's own alert threshold rather than one flat number for
 * every row — a budget that says "alerts at 75%" and stays grey at 82% is
 * telling you two different things at once.
 *
 * The comparisons are the service's, integer for integer.
 */
function toneFor(record: BudgetRecord): Tone {
  if (record.isOver) {
    return "expense";
  }
  // A fixed commitment has no approach to warn about — it lands on its whole
  // limit in one payment, so amber here would fire every month and mean
  // nothing. Once it has landed it is settled rather than merely unremarkable,
  // and greys out: the eye should pass over what is done and stop on what is not.
  if (record.isFixed) {
    return record.usedPercent >= FULL_PERCENT ? "muted" : "text";
  }
  return record.usedPercent >= record.alertThresholdPercent ? "warn" : "text";
}

const FULL_PERCENT = 100;

/** A whole percentage as it prints. Never re-rounded — it arrived rounded. */
function percentLabel(percent: number): string {
  return `${percent}%`;
}

/** Clamped so an over-limit budget never overflows its track. */
function trackWidth(percent: number): string {
  return `${Math.min(FULL_PERCENT, percent)}%`;
}

/** A fixed payment is paid or it is not; a percentage of one says nothing. */
function statusOf(record: BudgetRecord): string {
  if (record.isOver) {
    return "Over limit";
  }
  if (record.isFixed && record.usedPercent >= FULL_PERCENT) {
    return "Paid";
  }
  return percentLabel(record.usedPercent);
}

function metaOf(record: BudgetRecord): string {
  const alerts = record.isFixed
    ? "Fixed commitment · alerts only if it changes"
    : `Alerts at ${percentLabel(record.alertThresholdPercent)} of limit`;
  return record.rollover ? `${alerts} · rolls over` : alerts;
}

/** "Rp180.000 over" / "Rp1.280.000 left", from the figure the backend signed. */
function remainingNote(remaining: number): string {
  return remaining < 0
    ? `${formatRupiah(-remaining)} over`
    : `${formatRupiah(remaining)} left`;
}

/* ── the row ───────────────────────────────────────────────────────────── */

/** What the editor opens with. Every figure is a string, as a field holds one. */
export type BudgetDraft = {
  /** The budget's id, or "" for one that does not exist yet. */
  readonly id: string;
  readonly categoryId: string;
  readonly label: string;
  readonly limit: string;
  /** A whole percentage, e.g. "80". */
  readonly threshold: string;
  /** Whether the threshold needs the Custom field to be reachable at all. */
  readonly isCustomThreshold: boolean;
  readonly rollover: boolean;
  readonly isFixed: boolean;
};

export type BudgetRow = {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  /** "Alerts at 80% of limit · rolls over" */
  readonly meta: string;
  readonly tone: Tone;
  readonly isOver: boolean;
  readonly width: string;
  /** Where the alert threshold sits on the track; "" when there is none. */
  readonly thresholdWidth: string;
  readonly spent: string;
  readonly limit: string;
  readonly remaining: string;
  readonly status: string;
  readonly draft: BudgetDraft;
};

function toDraft(record: BudgetRecord): BudgetDraft {
  return {
    id: record.id,
    categoryId: record.categoryId,
    label: record.categoryName,
    limit: formatFigure(record.monthlyLimit, record.currency),
    threshold: String(record.alertThresholdPercent),
    isCustomThreshold: !isPreset(record.alertThresholdPercent / FULL_PERCENT),
    rollover: record.rollover,
    isFixed: record.isFixed,
  };
}

function toRow(record: BudgetRecord): BudgetRow {
  return {
    id: record.id,
    label: record.categoryName,
    icon: iconOf(record),
    meta: metaOf(record),
    tone: toneFor(record),
    isOver: record.isOver,
    width: trackWidth(record.usedPercent),
    thresholdWidth: record.isFixed
      ? ""
      : trackWidth(record.alertThresholdPercent),
    spent: formatRupiah(record.spent),
    limit: formatRupiah(record.monthlyLimit),
    remaining: remainingNote(record.remaining),
    status: statusOf(record),
    draft: toDraft(record),
  };
}

/* ── the allocation panel ──────────────────────────────────────────────── */

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
  /** "2 budgets in another currency", or "" when every one is counted. */
  readonly uncountedNote: string;
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
function paceOf(usedPercent: number, elapsedPercent: number): Pace {
  if (usedPercent > FULL_PERCENT) {
    return { note: PACE_OVER, tone: "expense" };
  }
  if (usedPercent > elapsedPercent) {
    return { note: PACE_AHEAD, tone: "warn" };
  }
  return { note: PACE_WITHIN, tone: "muted" };
}

function plural(count: number, noun: string): string {
  return count === 1 ? `${count} ${noun}` : `${count} ${noun}s`;
}

/** The one noun in here whose plural is not an "s". */
function pluralCategory(count: number): string {
  return count === 1 ? "1 category" : `${count} categories`;
}

/**
 * Budgets the totals cannot honestly absorb, stated rather than dropped.
 *
 * The overview counts one currency, so a budget kept in another is left out of
 * every figure above — the same reason the wallets bar puts what it cannot add
 * up underneath it instead of folding it in at a guessed rate.
 */
function uncountedNote(overview: BudgetOverviewRecord): string {
  if (overview.uncountedBudgets === 0) {
    return "";
  }
  return `${plural(overview.uncountedBudgets, "budget")} in another currency, not counted here`;
}

function toAllocation(overview: BudgetOverviewRecord): Allocation {
  const pace = paceOf(overview.usedPercent, overview.cycleElapsedPercent);

  return {
    total: formatRupiah(overview.totalAllocated),
    categoryCount: `across ${pluralCategory(overview.categoryCount)}`,
    spent: formatRupiah(overview.totalSpent),
    percentLabel: `${percentLabel(overview.usedPercent)} of allocation`,
    remainingNote:
      overview.totalLeft < 0
        ? `${formatRupiah(-overview.totalLeft)} over`
        : `${formatRupiah(overview.totalLeft)} unspent`,
    cycleNote: `${plural(overview.daysLeft, "day")} left in cycle`,
    paceNote: pace.note,
    paceTone: pace.tone,
    isOver: overview.isOver,
    uncountedNote: uncountedNote(overview),
  };
}

export type AllocationShare = {
  readonly id: string;
  readonly step: RampStep;
  readonly width: string;
};

/**
 * The bar under "August allocated" — shares of the *limits*, not of the spend.
 *
 * Apportioned by the backend, leftovers already given to the last share, so the
 * ribbon always closes. The artboard drew the spending donut's shares here,
 * under a heading naming the allocation, so the two disagreed by whatever had
 * not been spent yet.
 */
function toShares(
  overview: BudgetOverviewRecord,
): readonly AllocationShare[] {
  return overview.shares.map((share, index) => ({
    id: share.categoryId,
    step: stepOf(share.color, index),
    width: `${share.percent}%`,
  }));
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

function overLimitParts(
  item: BudgetAttentionRecord,
): readonly AttentionRun[] {
  return [
    { text: `${item.categoryName} is ` },
    { text: `${formatRupiah(-item.remaining)} over`, strong: true },
    { text: " its limit." },
  ];
}

function nearLimitParts(
  item: BudgetAttentionRecord,
  daysLeft: number,
): readonly AttentionRun[] {
  return [
    {
      text: `${item.categoryName} at ${percentLabel(item.usedPercent)} with ${plural(daysLeft, "day")} remaining.`,
    },
  ];
}

/**
 * Every budget that has reached its own alert threshold, worst first — sorted
 * and filtered by the service, wording added here.
 *
 * Nothing is truncated: a list called "needs attention" that hides an alert is
 * worse than a tall panel.
 */
function toAttention(
  overview: BudgetOverviewRecord,
): readonly AttentionItem[] {
  return overview.attention.map((item) => ({
    id: `attn-${item.budgetId}`,
    tone: item.isOver ? "expense" : "warn",
    parts: item.isOver
      ? overLimitParts(item)
      : nearLimitParts(item, overview.daysLeft),
  }));
}

/* ── what a new budget can be ──────────────────────────────────────────── */

export type BudgetCategoryChoice = {
  readonly value: string;
  readonly label: string;
};

const DEFAULT_THRESHOLD = "80";

/**
 * The categories a budget can still be created for.
 *
 * `slug=budget` has already dropped every income category — that narrowing is
 * the backend's, and repeating it here would be a second copy of the rule. All
 * this removes is the ones already spoken for, which the options endpoint has
 * no way to know.
 */
function toChoices(
  options: readonly CategoryOption[],
  budgets: readonly BudgetRecord[],
): readonly BudgetCategoryChoice[] {
  const taken = new Set(budgets.map((budget) => budget.categoryId));

  return options
    .filter((option) => !taken.has(option.id))
    .map((option) => ({ value: option.id, label: option.name }));
}

/** A budget that does not exist yet, for the category offered first. */
function blankDraft(
  choices: readonly BudgetCategoryChoice[],
): BudgetDraft | null {
  const [first] = choices;
  if (!first) {
    return null;
  }

  return {
    id: "",
    categoryId: first.value,
    label: first.label,
    limit: "",
    threshold: DEFAULT_THRESHOLD,
    isCustomThreshold: false,
    rollover: false,
    isFixed: false,
  };
}

/* ── the screen ────────────────────────────────────────────────────────── */

export type BudgetsScreen = {
  readonly rows: readonly BudgetRow[];
  readonly allocation: Allocation;
  readonly shares: readonly AllocationShare[];
  readonly attention: readonly AttentionItem[];
  readonly categories: readonly BudgetCategoryChoice[];
  /** Null when there is no free category to start one against. */
  readonly draft: BudgetDraft | null;
  /** Why the "New budget" panel is offering nothing, when it is offering nothing. */
  readonly emptyNote: string;
  readonly subtitle: string;
  /** What went wrong, when the API could not answer at all. */
  readonly error: string;
};

const EMPTY_ALLOCATION: Allocation = {
  total: formatRupiah(0),
  categoryCount: "across no categories yet",
  spent: formatRupiah(0),
  percentLabel: "0% of allocation",
  remainingNote: `${formatRupiah(0)} unspent`,
  cycleNote: "",
  paceNote: "",
  paceTone: "muted",
  isOver: false,
  uncountedNote: "",
};

const ALL_TAKEN_NOTE =
  "Every category a transaction can be filed under already has a budget.";
const OPTIONS_UNREADABLE_NOTE =
  "The category list could not be read, so a new budget cannot be started right now.";

function emptyScreen(error: string): BudgetsScreen {
  return {
    rows: [],
    allocation: EMPTY_ALLOCATION,
    shares: [],
    attention: [],
    categories: [],
    draft: null,
    emptyNote: OPTIONS_UNREADABLE_NOTE,
    subtitle: "No budgets could be read",
    error,
  };
}

/** "6 category budgets · alerts from 75% of limit" — the screen's subtitle. */
function subtitleOf(budgets: readonly BudgetRecord[]): string {
  const count = `${pluralCategory(budgets.length)} budgeted`;
  const alerting = budgets.filter((budget) => !budget.isFixed);
  if (alerting.length === 0) {
    return `${count} · no alert thresholds set`;
  }

  const lowest = Math.min(
    ...alerting.map((budget) => budget.alertThresholdPercent),
  );
  return `${count} · alerts from ${percentLabel(lowest)} of limit`;
}

/**
 * Both calls, together.
 *
 * A failure on either empties the whole screen rather than drawing the cards
 * under a header that could not be read: the panel states the sum of the rows
 * below it, so half of that pair is a screen that is only half true.
 *
 * The options call is the exception — it feeds only the "New budget" panel, so
 * when it alone fails the budgets that exist are still worth reading, and the
 * panel says why it is offering nothing.
 */
export async function getBudgetsScreen(): Promise<BudgetsScreen> {
  const accessToken = await requireAccessToken();
  const [listed, overview, options] = await Promise.all([
    listBudgets(accessToken),
    fetchBudgetOverview(accessToken),
    fetchCategoryOptions(accessToken, "budget"),
  ]);

  if (!listed.ok) {
    return emptyScreen(listed.error.message);
  }
  if (!overview.ok) {
    return emptyScreen(overview.error.message);
  }

  const choices = options.ok ? toChoices(options.data, listed.data) : [];
  const emptyNote = options.ok ? ALL_TAKEN_NOTE : OPTIONS_UNREADABLE_NOTE;

  return {
    rows: listed.data.map(toRow),
    allocation: toAllocation(overview.data),
    shares: toShares(overview.data),
    attention: toAttention(overview.data),
    categories: choices,
    draft: blankDraft(choices),
    emptyNote,
    subtitle: subtitleOf(listed.data),
    error: "",
  };
}

/* ── the other two screens that print these rows ───────────────────────── */

/**
 * The cards alone, for the screens that show a few of them beside something
 * else. The overview is not fetched: neither states a total, so neither needs
 * the panel that owns one.
 *
 * An unreachable API leaves the panel empty rather than taking the page down
 * with it — on the dashboard and in the app shell, budgets are one block among
 * several, not the reason the page was opened.
 */
async function budgetRows(): Promise<readonly BudgetRow[]> {
  const accessToken = await requireAccessToken();
  const listed = await listBudgets(accessToken);
  return listed.ok ? listed.data.map(toRow) : [];
}

export async function getBudgets(): Promise<readonly BudgetRow[]> {
  return budgetRows();
}

/** The dashboard's Budgets panel shows the first five. */
const DASHBOARD_BUDGET_COUNT = 5;

export async function getBudgetsPreview(): Promise<readonly BudgetRow[]> {
  return (await budgetRows()).slice(0, DASHBOARD_BUDGET_COUNT);
}

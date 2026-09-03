import { savingStreakLength } from "@/lib/data/goals";
import {
  REPORTING_MONTH_LABEL,
  balanceGrowth,
  categorySpend,
  expenseGrowth,
  incomeGrowth,
  incomeRowCount,
  largestRowIn,
  lastCheaperMonth,
  monthTotals,
  monthlySeries,
  monthlySpendByCategory,
  priorSpendOn,
  risingStreak,
  shareOf,
  spendByCategory,
  weeklyTrend,
  type CategorySpend,
} from "@/lib/data/ledger";
import { firstDaysNames, firstDaysTotal } from "@/lib/data/recurring";
import {
  formatPercent,
  formatPrecisePercent,
  formatRupiah,
  formatSignedPercent,
} from "@/lib/format";
import type {
  CategoryKey,
  CategoryRank,
  Insight,
  RampStep,
  SummaryStat,
  Tone,
  TrendMode,
  TrendPoint,
} from "@/types/ledger";

/**
 * Everything the dashboard and the insights screen print, phrased from the
 * ledger's own totals. No figure below is typed: each one is `lib/data/ledger.ts`
 * asked a question and then formatted.
 */

/* ── the trend chart ───────────────────────────────────────────────────── */

const SERIES_BY_MODE: Readonly<Record<TrendMode, () => readonly TrendPoint[]>> =
  {
    weekly: weeklyTrend,
    monthly: monthlySeries,
  };

export const TREND_RANGE_LABEL: Readonly<Record<TrendMode, string>> = {
  weekly: `Weeks 1–${weeklyTrend().length}, ${REPORTING_MONTH_LABEL}`,
  monthly: `${monthlySeries().length} months to ${REPORTING_MONTH_LABEL}`,
};

export type TrendBar = {
  readonly label: string;
  readonly incomeHeight: string;
  readonly expenseHeight: string;
  readonly incomeLabel: string;
  readonly expenseLabel: string;
  readonly netLabel: string;
};

const FULL_PERCENT = 100;
const HEIGHT_PRECISION = 1;

export async function getTrend(mode: TrendMode): Promise<readonly TrendBar[]> {
  const rows = SERIES_BY_MODE[mode]();

  // Bars are scaled against the tallest one, so the chart always fills its box.
  const peak = Math.max(
    ...rows.map((row) => Math.max(row.income, row.expense)),
  );

  const height = (value: number): string =>
    `${(shareOf(value, peak) * FULL_PERCENT).toFixed(HEIGHT_PRECISION)}%`;

  return rows.map((row) => ({
    label: row.label,
    incomeHeight: height(row.income),
    expenseHeight: height(row.expense),
    incomeLabel: formatRupiah(row.income),
    expenseLabel: formatRupiah(row.expense),
    netLabel: formatRupiah(row.income - row.expense),
  }));
}

/* ── donut geometry — ported from the artboard's `arc(i)` ──────────────── */

const CENTER = 90;
const OUTER_RADIUS = 88;
const INNER_RADIUS = 52;
const SLICE_GAP = 0.022;
const QUARTER_TURN = Math.PI / 2;
const FULL_TURN = Math.PI * 2;

function pointOn(radius: number, angle: number): readonly [number, number] {
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)];
}

function arcPath(startAngle: number, endAngle: number): string {
  const [x1, y1] = pointOn(OUTER_RADIUS, startAngle);
  const [x2, y2] = pointOn(OUTER_RADIUS, endAngle);
  const [x3, y3] = pointOn(INNER_RADIUS, endAngle);
  const [x4, y4] = pointOn(INNER_RADIUS, startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M${x1} ${y1}`,
    `A${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L${x3} ${y3}`,
    `A${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArc} 0 ${x4} ${y4}`,
    "Z",
  ].join("");
}

export type DonutSegment = {
  readonly id: string;
  readonly label: string;
  readonly step: RampStep;
  readonly path: string;
  readonly percent: string;
  readonly value: string;
};

export type DonutData = {
  readonly segments: readonly DonutSegment[];
  readonly totalLabel: string;
  readonly totalValue: string;
  readonly totalNote: string;
};

export async function getSpendDonut(): Promise<DonutData> {
  const slices = spendByCategory();
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  // The ring starts at twelve o'clock and is walked clockwise, one slice at a
  // time, each taking the share of a full turn its own share of the spend is.
  let angle = -QUARTER_TURN;

  const segments = slices.map((slice) => {
    const start = angle;
    const end = start + shareOf(slice.value, total) * FULL_TURN;
    angle = end;

    return {
      id: slice.key,
      label: slice.label,
      step: slice.step,
      path: arcPath(start, end - SLICE_GAP),
      percent: formatPercent(shareOf(slice.value, total)),
      value: formatRupiah(slice.value),
    };
  });

  return {
    segments,
    totalLabel: "Total spent",
    totalValue: formatRupiah(total),
    totalNote: `${slices.length} categories`,
  };
}

/** The donut's caption: which month, and what it totalled. */
export function donutCaption(): string {
  return `${REPORTING_MONTH_LABEL} · ${formatRupiah(monthTotals().expense)}`;
}

/* ── the dashboard's four stats ────────────────────────────────────────── */

/** A rising expense is bad news, a rising income is good — hence two of these. */
function toneForSpendChange(ratio: number): Tone {
  if (ratio === 0) {
    return "muted";
  }
  return ratio > 0 ? "expense" : "income";
}

const STAT_DELTA_DIGITS = 1;

export async function getSummaryStats(): Promise<readonly SummaryStat[]> {
  const { closingBalance, income, expense, net, savingsRate } = monthTotals();

  return [
    {
      id: "balance",
      label: "Total balance",
      value: formatRupiah(closingBalance),
      icon: "wallet",
      iconTone: "muted",
      valueTone: "text",
      delta: formatSignedPercent(balanceGrowth(), STAT_DELTA_DIGITS),
      deltaTone: "income",
      deltaNote: "vs last month",
    },
    {
      id: "income",
      label: `Income, ${REPORTING_MONTH_LABEL.split(" ")[0]}`,
      value: formatRupiah(income),
      icon: "up",
      iconTone: "income",
      valueTone: "income",
      delta: formatSignedPercent(incomeGrowth(), STAT_DELTA_DIGITS),
      deltaTone: "income",
      deltaNote: `${incomeRowCount()} client invoices`,
    },
    {
      id: "expense",
      label: `Expense, ${REPORTING_MONTH_LABEL.split(" ")[0]}`,
      value: formatRupiah(expense),
      icon: "down",
      iconTone: "expense",
      valueTone: "text",
      delta: formatSignedPercent(expenseGrowth(), STAT_DELTA_DIGITS),
      deltaTone: toneForSpendChange(expenseGrowth()),
      deltaNote: `driven by ${fastestRisingCategory().label.toLowerCase()}`,
    },
    {
      id: "saved",
      label: "Net saved",
      value: formatRupiah(net),
      icon: "flag",
      iconTone: "accent",
      valueTone: "text",
      delta: formatPrecisePercent(savingsRate),
      deltaTone: "income",
      deltaNote: "of income kept",
    },
  ];
}

/* ── the insights screen ───────────────────────────────────────────────── */

/**
 * The category that grew the most against last month, ignoring the catch-all.
 * "Driven by other" names the bucket for everything unclassified, which is not
 * an explanation of anything — the point of the line is to say what to look at.
 */
const UNCLASSIFIED: CategoryKey = "other";

function fastestRisingCategory(): CategorySpend {
  const [first, ...rest] = spendByCategory().filter(
    (entry) => entry.key !== UNCLASSIFIED,
  );
  return rest.reduce(
    (leader, entry) => (entry.change > leader.change ? entry : leader),
    first,
  );
}

const ORDINALS = [
  "",
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
  "eleventh",
  "twelfth",
] as const;

function ordinal(count: number): string {
  return ORDINALS[count] ?? `${count}th`;
}

/** "Up 34%" / "Down 18%" — a change said out loud rather than signed. */
function changeWord(ratio: number): string {
  const direction = ratio >= 0 ? "Up" : "Down";
  return `${direction} ${formatPercent(Math.abs(ratio))}`;
}

function subscriptionInsight(): Insight {
  const subs = categorySpend("subs");
  const biggest = largestRowIn("subs");

  return {
    id: "ins-subs",
    kicker: changeWord(subs.change),
    icon: "up",
    tone: "expense",
    title: `Subscriptions climbed for the ${ordinal(risingStreak("subs"))} month`,
    body: `${formatRupiah(subs.value)} in August, ${formatRupiah(
      Math.abs(subs.value - priorSpendOn("subs")),
    )} more than July. ${biggest.name} is the largest single charge at ${formatRupiah(
      biggest.amount,
    )}.`,
  };
}

function transportInsight(): Insight {
  const transport = categorySpend("transport");
  const cheaper = lastCheaperMonth("transport");
  const since = cheaper === null ? "your record began" : cheaper;

  return {
    id: "ins-transport",
    kicker: changeWord(transport.change),
    icon: "down",
    tone: "income",
    title: `Transport is your cheapest month since ${since}`,
    body: `${formatRupiah(transport.value)} — ${formatRupiah(
      Math.abs(transport.value - priorSpendOn("transport")),
    )} below July, mostly fewer late-night rides.`,
  };
}

function savingsInsight(): Insight {
  const { savingsRate } = monthTotals();

  return {
    id: "ins-savings",
    kicker: "Savings rate",
    icon: "flag",
    tone: "text",
    title: `${formatPercent(savingsRate)} kept for the ${ordinal(
      savingStreakLength(),
    )} month running`,
    body: "Two more months at this rate finishes the emergency fund ahead of the December target.",
  };
}

function cashFlowInsight(): Insight {
  const names = firstDaysNames();

  return {
    id: "ins-cashflow",
    kicker: "Cash flow",
    icon: "calendar",
    tone: "warn",
    title: `${formatRupiah(firstDaysTotal())} leaves in the first six days of September`,
    body: `${names.length} scheduled items land before your first invoice clears: ${names.join(", ")}.`,
  };
}

export async function getInsights(): Promise<readonly Insight[]> {
  return [
    subscriptionInsight(),
    transportInsight(),
    savingsInsight(),
    cashFlowInsight(),
  ];
}

/* ── the comparison chart ──────────────────────────────────────────────── */

const COMPARE_TOP_COUNT = 4;

/** The four categories with the most spent across the whole six months. */
function comparedCategories(): readonly CategorySpend[] {
  const series = monthlySpendByCategory();

  const totalOver = (key: CategoryKey): number =>
    series.reduce((total, month) => total + month.spend[key], 0);

  return [...spendByCategory()]
    .sort((a, b) => totalOver(b.key) - totalOver(a.key))
    .slice(0, COMPARE_TOP_COUNT);
}

export type ComparePart = {
  readonly id: string;
  readonly step: RampStep;
  readonly height: string;
  readonly title: string;
};

export type CompareColumn = {
  readonly label: string;
  readonly parts: readonly ComparePart[];
};

export async function getCategoryComparison(): Promise<
  readonly CompareColumn[]
> {
  const charted = comparedCategories();
  const series = monthlySpendByCategory();

  // Scaled against the tallest stack rather than a constant, so a month that
  // outgrows the old ceiling cannot draw itself past the top of the panel.
  const tallest = Math.max(
    ...series.map((month) =>
      charted.reduce((total, entry) => total + month.spend[entry.key], 0),
    ),
  );

  return series.map((month) => ({
    label: month.label,
    parts: charted.map((entry) => {
      const value = month.spend[entry.key];
      return {
        id: `${month.label}-${entry.key}`,
        step: entry.step,
        height: `${(shareOf(value, tallest) * FULL_PERCENT).toFixed(HEIGHT_PRECISION)}%`,
        title: `${entry.label} · ${formatRupiah(value)}`,
      };
    }),
  }));
}

export const COMPARE_LEGEND = comparedCategories().map((entry) => ({
  id: entry.key,
  label: entry.label,
  step: entry.step,
}));

/* ── the ranking ───────────────────────────────────────────────────────── */

const RANKING_COUNT = 6;
const RANK_DIGITS = 2;

export async function getCategoryRanking(): Promise<readonly CategoryRank[]> {
  return [...spendByCategory()]
    .sort((a, b) => b.value - a.value)
    .slice(0, RANKING_COUNT)
    .map((entry, index) => ({
      rank: String(index + 1).padStart(RANK_DIGITS, "0"),
      label: entry.label,
      value: formatRupiah(entry.value),
      delta: formatSignedPercent(entry.change),
      deltaTone: toneForSpendChange(entry.change),
    }));
}


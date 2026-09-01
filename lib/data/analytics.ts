import { formatPercent, formatRupiah } from "@/lib/format";
import type {
  CategoryRank,
  DonutSlice,
  Insight,
  RampStep,
  SummaryStat,
  TrendMode,
  TrendPoint,
} from "@/types/ledger";

/** `DONUT` from the artboard (lines ~1536-1544), in ramp order. */
const SPEND_BY_CATEGORY: readonly DonutSlice[] = [
  { label: "Housing", value: 4500000, step: "c1" },
  { label: "Food & drink", value: 2640000, step: "c2" },
  { label: "Transport", value: 1380000, step: "c3" },
  { label: "Subscriptions", value: 1180000, step: "c4" },
  { label: "Utilities", value: 980000, step: "c5" },
  { label: "Health", value: 740000, step: "c6" },
  { label: "Other", value: 1360000, step: "c7" },
];

/** `WEEKLY` and `MONTHLY` from the artboard (line ~1546-1547). */
const WEEKLY: readonly TrendPoint[] = [
  { label: "W1", income: 5200000, expense: 3400000 },
  { label: "W2", income: 4100000, expense: 2600000 },
  { label: "W3", income: 6800000, expense: 3100000 },
  { label: "W4", income: 3900000, expense: 2900000 },
  { label: "W5", income: 1450000, expense: 780000 },
];

const MONTHLY: readonly TrendPoint[] = [
  { label: "Mar", income: 16200000, expense: 11400000 },
  { label: "Apr", income: 19800000, expense: 12900000 },
  { label: "May", income: 15400000, expense: 10800000 },
  { label: "Jun", income: 22100000, expense: 13600000 },
  { label: "Jul", income: 18900000, expense: 12200000 },
  { label: "Aug", income: 21450000, expense: 12780000 },
];

export const TREND_RANGE_LABEL: Readonly<Record<TrendMode, string>> = {
  weekly: "Weeks 1–5, August 2026",
  monthly: "March – August 2026",
};

export type TrendBar = {
  readonly label: string;
  readonly incomeHeight: string;
  readonly expenseHeight: string;
  readonly incomeLabel: string;
  readonly expenseLabel: string;
  readonly netLabel: string;
};

export async function getTrend(mode: TrendMode): Promise<readonly TrendBar[]> {
  const rows = mode === "weekly" ? WEEKLY : MONTHLY;
  const peak = Math.max(
    ...rows.map((row) => Math.max(row.income, row.expense)),
  );

  return rows.map((row) => ({
    label: row.label,
    incomeHeight: `${((row.income / peak) * 100).toFixed(1)}%`,
    expenseHeight: `${((row.expense / peak) * 100).toFixed(1)}%`,
    incomeLabel: formatRupiah(row.income),
    expenseLabel: formatRupiah(row.expense),
    netLabel: formatRupiah(row.income - row.expense),
  }));
}

/* donut geometry — Ported from the artboard's `arc(i)`. */

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
  const total = SPEND_BY_CATEGORY.reduce((sum, slice) => sum + slice.value, 0);
  let angle = -QUARTER_TURN;

  const segments = SPEND_BY_CATEGORY.map((slice) => {
    const start = angle;
    const end = start + (slice.value / total) * FULL_TURN;
    angle = end;

    return {
      id: slice.label,
      label: slice.label,
      step: slice.step,
      path: arcPath(start, end - SLICE_GAP),
      percent: formatPercent(slice.value / total),
      value: formatRupiah(slice.value),
    };
  });

  return {
    segments,
    totalLabel: "Total spent",
    totalValue: formatRupiah(total),
    totalNote: `${SPEND_BY_CATEGORY.length} categories`,
  };
}

/** Widths for the Budgets page allocation bar — same slices, no geometry. */
export async function getAllocationShares(): Promise<
  readonly { readonly id: string; readonly step: RampStep; readonly width: string }[]
> {
  const total = SPEND_BY_CATEGORY.reduce((sum, slice) => sum + slice.value, 0);
  return SPEND_BY_CATEGORY.map((slice) => ({
    id: slice.label,
    step: slice.step,
    width: formatPercent(slice.value / total),
  }));
}

/* ── insights screen ───────────────────────────────────────────────────── */

export const INSIGHTS: readonly Insight[] = [
  {
    id: "ins-subs",
    kicker: "Up 34%",
    icon: "up",
    tone: "expense",
    title: "Subscriptions climbed for the third month",
    body: "Rp1.180.000 in August against a Rp1.000.000 limit. Adobe and Copilot both started inside this cycle.",
  },
  {
    id: "ins-transport",
    kicker: "Down 18%",
    icon: "down",
    tone: "income",
    title: "Transport is your cheapest month since March",
    body: "Rp1.380.000 — Rp310.000 below your six-month average, mostly fewer late-night rides.",
  },
  {
    id: "ins-savings",
    kicker: "Savings rate",
    icon: "flag",
    tone: "text",
    title: "40% kept for the seventh month running",
    body: "Two more months at this rate finishes the emergency fund ahead of the December target.",
  },
  {
    id: "ins-cashflow",
    kicker: "Cash flow",
    icon: "calendar",
    tone: "warn",
    title: "Rp5.111.000 leaves in the first six days of September",
    body: "Rent and two bills land before your first invoice clears. BCA Payroll covers it with Rp36m to spare.",
  },
];

/** The stacked comparison chart: housing is flat, the rest track the month. */
const COMPARE_SHARES: readonly {
  readonly label: string;
  readonly step: RampStep;
  readonly share: number | null;
}[] = [
  { label: "Housing", step: "c1", share: null },
  { label: "Food & drink", step: "c2", share: 0.21 },
  { label: "Transport", step: "c3", share: 0.11 },
  { label: "Subscriptions", step: "c4", share: 0.09 },
];

const HOUSING_FIXED = 4500000;
const COMPARE_SCALE = 14000000;

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
  return MONTHLY.map((month) => ({
    label: month.label,
    parts: COMPARE_SHARES.map((part) => {
      const value = part.share === null ? HOUSING_FIXED : month.expense * part.share;
      return {
        id: `${month.label}-${part.label}`,
        step: part.step,
        height: `${((value / COMPARE_SCALE) * 100).toFixed(1)}%`,
        title: `${part.label} · ${formatRupiah(value)}`,
      };
    }),
  }));
}

export const COMPARE_LEGEND = COMPARE_SHARES.map((part) => ({
  id: part.label,
  label: part.label,
  step: part.step,
}));

const RANKING_DELTAS = ["0%", "+6%", "−18%", "+34%", "+2%", "−9%"] as const;
const RANKING_TONES = [
  "muted",
  "expense",
  "income",
  "expense",
  "expense",
  "income",
] as const;

export async function getCategoryRanking(): Promise<readonly CategoryRank[]> {
  return SPEND_BY_CATEGORY.slice(0, 6).map((slice, index) => ({
    rank: String(index + 1).padStart(2, "0"),
    label: slice.label,
    value: formatRupiah(slice.value),
    delta: RANKING_DELTAS[index],
    deltaTone: RANKING_TONES[index],
  }));
}

/* ── dashboard summary ─────────────────────────────────────────────────── */

export const SUMMARY_STATS: readonly SummaryStat[] = [
  {
    id: "balance",
    label: "Total balance",
    value: "Rp84.320.000",
    icon: "wallet",
    iconTone: "muted",
    valueTone: "text",
    delta: "+3.4%",
    deltaTone: "income",
    deltaNote: "vs last month",
  },
  {
    id: "income",
    label: "Income, August",
    value: "Rp21.450.000",
    icon: "up",
    iconTone: "income",
    valueTone: "income",
    delta: "+13.5%",
    deltaTone: "income",
    deltaNote: "four client invoices",
  },
  {
    id: "expense",
    label: "Expense, August",
    value: "Rp12.780.000",
    icon: "down",
    iconTone: "expense",
    valueTone: "text",
    delta: "+4.8%",
    deltaTone: "expense",
    deltaNote: "driven by subscriptions",
  },
  {
    id: "saved",
    label: "Net saved",
    value: "Rp8.670.000",
    icon: "flag",
    iconTone: "accent",
    valueTone: "text",
    delta: "40.4%",
    deltaTone: "income",
    deltaNote: "of income kept",
  },
];

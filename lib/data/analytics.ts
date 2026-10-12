import { listCategories } from "@/lib/api/categories";
import {
  fetchTransactionOverview,
  fetchTransactionTrend,
  type CategorySpendRecord,
  type TransactionOverviewRecord,
  type TransactionPeriodRecord,
  type TrendPointRecord,
} from "@/lib/api/transactions";
import {
  fetchWalletOptions,
  fetchWalletOverview,
  listWallets,
  type WalletOverviewRecord,
  type WalletRecord,
} from "@/lib/api/wallets";
import { requireAccessToken } from "@/lib/auth/session";
import { RAMP_STEPS, colorOrBlank } from "@/lib/category-fields";
import { isoDayOf, monthLabel, parseIsoDate, todayInJakarta } from "@/lib/dates";
import { savingStreakLength } from "@/lib/data/goals";
import {
  categorySpend,
  largestRowIn,
  lastCheaperMonth,
  monthTotals,
  monthlySpendByCategory,
  priorSpendOn,
  risingStreak,
  shareOf,
  spendByCategory,
  type CategorySpend,
} from "@/lib/data/ledger";
import { firstDaysNames, firstDaysTotal } from "@/lib/data/recurring";
import type { RecentTransactions } from "@/lib/data/transactions";
import {
  formatPercent,
  formatPrecisePercent,
  formatRupiah,
  formatSignedPercent,
} from "@/lib/format";
import { squarify, type TreemapTile } from "@/lib/treemap";
import type { ApiResult } from "@/types/api";
import type {
  CategoryKey,
  CurrencyCode,
  CategoryRank,
  Insight,
  ColorKey,
  SummaryStat,
  Tone,
  TrendMode,
} from "@/types/ledger";

/**
 * Everything the dashboard and the insights screen print, phrased from the
 * ledger's own totals. No figure below is typed: each one is `lib/data/ledger.ts`
 * asked a question and then formatted.
 */

/* ── the trend chart ───────────────────────────────────────────────────── */

/** One bar, scaled and phrased here; the API sends the period and the figures. */
export type TrendBar = {
  readonly label: string;
  readonly incomeHeight: string;
  readonly expenseHeight: string;
  /** The same two figures as shares of the window's peak, for a line to plot. */
  readonly incomeShare: number;
  readonly expenseShare: number;
  /** The net against the window's largest net, and which side of zero it fell. */
  readonly netHeight: string;
  readonly isLoss: boolean;
  readonly incomeLabel: string;
  readonly expenseLabel: string;
  readonly netLabel: string;
};

const FULL_PERCENT = 100;
const HEIGHT_PRECISION = 1;

/* ── donut geometry — ported from the artboard's `arc(i)` ──────────────── */

const CENTER = 90;
const OUTER_RADIUS = 88;
const INNER_RADIUS = 64;
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
  readonly step: ColorKey;
  readonly path: string;
  readonly percent: string;
  readonly value: string;
  /** Its share of the spend, 0–1 — what the other three forms are drawn from. */
  readonly share: number;
  /** That share as a width, for one track divided between the categories. */
  readonly width: string;
  /** The same spend against the largest category's, for a ranked bar. */
  readonly barWidth: string;
  /** Where its tile sits in the treemap. */
  readonly tile: TreemapTile;
};

/** The treemap is laid out for a box this many times wider than it is tall. */
const TREEMAP_ASPECT = 2.5;
const WIDTH_PRECISION = 3;

function widthOf(share: number): string {
  return `${(share * FULL_PERCENT).toFixed(WIDTH_PRECISION)}%`;
}

export type DonutData = {
  readonly segments: readonly DonutSegment[];
  readonly totalLabel: string;
  readonly totalValue: string;
  readonly totalNote: string;
};

/* ── the dashboard's four stats ────────────────────────────────────────── */

/** A rising expense is bad news, a rising income is good — hence two of these. */
function toneForSpendChange(ratio: number): Tone {
  if (ratio === 0) {
    return "muted";
  }
  return ratio > 0 ? "expense" : "income";
}

const STAT_DELTA_DIGITS = 1;

/* ── the insights screen ───────────────────────────────────────────────── */

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
  readonly step: ColorKey;
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


/* ── the dashboard, from the API ───────────────────────────────────────── */

/**
 * Four stat cards, a donut, and a bar chart, all measured over the same month.
 *
 * The deltas are what make this screen a single read rather than four: each one
 * is a ratio of two figures, so both have to be counted the same way and on the
 * same data. `GET /transactions/overview` answers the reported month and the one
 * before it together for exactly that reason.
 *
 * Where a comparison cannot honestly be made the delta says so rather than
 * printing a number. An empty earlier month is not "0%" — it is no comparison at
 * all, and a "0%" beside a month that earned nothing would read as "unchanged".
 */

const NO_DELTA = "—";

/** A ratio against last month, or `null` when there is nothing to divide by. */
function changeAgainst(current: number, prior: number): number | null {
  return prior === 0 ? null : (current - prior) / prior;
}

type Delta = { readonly delta: string; readonly deltaTone: Tone; readonly deltaNote: string };

function deltaOf(ratio: number | null, tone: Tone, note: string, missingNote: string): Delta {
  if (ratio === null) {
    return { delta: NO_DELTA, deltaTone: "muted", deltaNote: missingNote };
  }
  return {
    delta: formatSignedPercent(ratio, STAT_DELTA_DIGITS),
    deltaTone: tone,
    deltaNote: note,
  };
}

function plural(count: number, noun: string): string {
  return count === 1 ? `${count} ${noun}` : `${count} ${noun}s`;
}

/** The one plural here that is not an "s". */
function pluralEntries(count: number): string {
  return count === 1 ? "1 entry" : `${count} entries`;
}

/** Expense is stored negative; a spend reads as a magnitude. */
function spentOf(period: TransactionPeriodRecord): number {
  return -period.moneyOut;
}

/**
 * The category that grew the most against last month, or "" when none did.
 *
 * A month where everything fell has no "driven by" — naming whichever category
 * fell least would turn a quiet month into a culprit.
 */
function drivenBy(
  current: readonly CategorySpendRecord[],
  previous: readonly CategorySpendRecord[],
): string {
  const before = new Map(previous.map((entry) => [entry.categoryId, entry.spent]));

  let leader = "";
  let biggest = 0;
  for (const entry of current) {
    const rise = entry.spent - (before.get(entry.categoryId) ?? 0);
    if (rise > biggest) {
      biggest = rise;
      leader = entry.name;
    }
  }
  return leader;
}

const NOTHING_LAST_MONTH = "no figure last month";

function balanceStat(
  held: number,
  overview: TransactionOverviewRecord,
  blockedNote: string,
): SummaryStat {
  // What the month opened with, read back from what it holds now. It only holds
  // while the headline counts every wallet — see `dashboardBalanceBlocked`.
  const opening = held - overview.current.net;
  const ratio = blockedNote === "" ? changeAgainst(held, opening) : null;

  return {
    id: "balance",
    label: "Total balance",
    value: formatRupiah(held),
    icon: "wallet",
    iconTone: "muted",
    valueTone: "text",
    ...deltaOf(
      ratio,
      ratio !== null && ratio < 0 ? "expense" : "income",
      "vs the start of the month",
      blockedNote === "" ? NOTHING_LAST_MONTH : blockedNote,
    ),
  };
}

function incomeStat(overview: TransactionOverviewRecord, monthName: string): SummaryStat {
  const { current, previous } = overview;

  return {
    id: "income",
    label: `Income, ${monthName}`,
    value: formatRupiah(current.moneyIn),
    icon: "up",
    iconTone: "income",
    valueTone: "income",
    ...deltaOf(
      changeAgainst(current.moneyIn, previous.moneyIn),
      "income",
      pluralEntries(current.incomeEntries),
      NOTHING_LAST_MONTH,
    ),
  };
}

function expenseStat(overview: TransactionOverviewRecord, monthName: string): SummaryStat {
  const { current, previous } = overview;
  const ratio = changeAgainst(spentOf(current), spentOf(previous));
  const leader = drivenBy(current.byCategory, previous.byCategory);

  return {
    id: "expense",
    label: `Expense, ${monthName}`,
    value: formatRupiah(spentOf(current)),
    icon: "down",
    iconTone: "expense",
    valueTone: "text",
    ...deltaOf(
      ratio,
      toneForSpendChange(ratio ?? 0),
      leader === ""
        ? pluralEntries(current.expenseEntries)
        : `driven by ${leader.toLowerCase()}`,
      NOTHING_LAST_MONTH,
    ),
  };
}

function savedStat(overview: TransactionOverviewRecord): SummaryStat {
  const { net, moneyIn } = overview.current;

  return {
    id: "saved",
    label: "Net saved",
    value: formatRupiah(net),
    icon: "flag",
    iconTone: "accent",
    valueTone: "text",
    // Not a month-on-month change: the share of what came in that stayed in.
    delta: moneyIn <= 0 ? NO_DELTA : formatPrecisePercent(shareOf(net, moneyIn)),
    deltaTone: moneyIn <= 0 ? "muted" : "income",
    deltaNote: moneyIn <= 0 ? "no income this month" : "of income kept",
  };
}

/**
 * Why the balance delta cannot be stated, or "" when it can.
 *
 * The opening balance is inferred by taking this month's net back off what the
 * wallets hold now, and that inference has two ways of being wrong. Restating a
 * wallet's balance mid-month folds part of the month into the stated figure, so
 * subtracting the net removes it twice. And the headline counts only wallets in
 * the black, so while one is overdrawn the figure the net is taken off is not the
 * figure the net moved. Both are hidden rather than approximated.
 */
function dashboardBalanceBlocked(
  wallets: readonly WalletRecord[],
  base: CurrencyCode,
  overdrawn: number,
  monthStartIso: string,
): string {
  if (overdrawn !== 0) {
    return "a wallet is overdrawn";
  }

  const restated = wallets.some(
    (wallet) =>
      wallet.includeInTotal &&
      wallet.currency === base &&
      isoDayOf(wallet.balanceUpdatedAt) >= monthStartIso,
  );
  return restated ? "a balance was restated this month" : "";
}

/* ── the donut ─────────────────────────────────────────────────────────── */

/** A category's stored colour, or a ramp step by position when it was never given one. */
function stepOf(color: string, index: number): ColorKey {
  return colorOrBlank(color) || RAMP_STEPS[index % RAMP_STEPS.length];
}

function toDonut(
  categories: readonly CategorySpendRecord[],
  monthName: string,
): { readonly donut: DonutData; readonly caption: string } {
  const total = categories.reduce((sum, entry) => sum + entry.spent, 0);

  // The ring starts at twelve o'clock and is walked clockwise, each slice taking
  // the share of a full turn its own share of the spend is.
  let angle = -QUARTER_TURN;

  const largest = Math.max(0, ...categories.map((entry) => entry.spent));
  const tiles = squarify(
    categories.map((entry) => entry.spent),
    TREEMAP_ASPECT,
  );

  const segments = categories.map((entry, index) => {
    const share = shareOf(entry.spent, total);
    const start = angle;
    const end = start + share * FULL_TURN;
    angle = end;

    return {
      id: entry.categoryId,
      label: entry.name,
      step: stepOf(entry.color, index),
      path: arcPath(start, end - SLICE_GAP),
      percent: formatPercent(share),
      value: formatRupiah(entry.spent),
      share,
      width: widthOf(share),
      barWidth: widthOf(shareOf(entry.spent, largest)),
      tile: tiles[index] ?? NO_TILE,
    };
  });

  return {
    donut: {
      segments,
      totalLabel: "Total spent",
      totalValue: formatRupiah(total),
      totalNote: pluralCategories(categories.length),
    },
    caption: `${monthName} · ${formatRupiah(total)}`,
  };
}

const NO_TILE: TreemapTile = { left: 0, top: 0, width: 0, height: 0 };

function pluralCategories(count: number): string {
  return count === 1 ? "1 category" : `${count} categories`;
}

/* ── the bar chart ─────────────────────────────────────────────────────── */

const SHORT_MONTH_LENGTH = 3;

function shortMonth(start: string): string {
  const date = new Date(start);
  return monthLabel(date).split(" ")[0].slice(0, SHORT_MONTH_LENGTH);
}

function toBars(
  points: readonly TrendPointRecord[],
  mode: TrendMode,
): readonly TrendBar[] {
  // Bars are scaled against the tallest figure in the window, so the chart fills
  // its box whatever the month's size.
  const peak = Math.max(
    0,
    ...points.map((point) => Math.max(point.moneyIn, -point.moneyOut)),
  );

  // The net has a scale of its own: it is the difference of the two, so against
  // their peak a month that broke nearly even would be a bar too short to see.
  const netPeak = Math.max(
    0,
    ...points.map((point) => Math.abs(point.moneyIn + point.moneyOut)),
  );

  const height = (value: number, against: number): string =>
    `${(shareOf(value, against) * FULL_PERCENT).toFixed(HEIGHT_PRECISION)}%`;

  return points.map((point, index) => {
    const spent = -point.moneyOut;
    const net = point.moneyIn - spent;
    return {
      label: mode === "weekly" ? `W${index + 1}` : shortMonth(point.start),
      incomeHeight: height(point.moneyIn, peak),
      expenseHeight: height(spent, peak),
      incomeShare: shareOf(point.moneyIn, peak),
      expenseShare: shareOf(spent, peak),
      netHeight: height(Math.abs(net), netPeak),
      isLoss: net < 0,
      incomeLabel: formatRupiah(point.moneyIn),
      expenseLabel: formatRupiah(spent),
      netLabel: formatRupiah(net),
    };
  });
}

function trendLabel(mode: TrendMode, count: number, monthName: string): string {
  return mode === "weekly"
    ? `Weeks 1–${count}, ${monthName}`
    : `${count} months to ${monthName}`;
}

/* ── the screen ────────────────────────────────────────────────────────── */

export type DashboardScreen = {
  readonly subtitle: string;
  readonly stats: readonly SummaryStat[];
  readonly donut: DonutData;
  readonly donutCaption: string;
  /** What went wrong with the month's figures; the stats and the donut share it. */
  readonly monthError: string;
  readonly bars: readonly TrendBar[];
  readonly trendLabel: string;
  readonly trendError: string;
  /** Rows in another currency, which none of the figures above absorb. */
  readonly uncountedNote: string;
};

const EMPTY_DONUT: DonutData = {
  segments: [],
  totalLabel: "Total spent",
  totalValue: formatRupiah(0),
  totalNote: pluralCategories(0),
};

/** Days left in the month a day falls in, counted from the real calendar. */
function daysLeftInMonth(todayIso: string): number {
  const today = parseIsoDate(todayIso);
  if (today === null) {
    return 0;
  }
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return lastDay - today.getDate();
}

function uncountedNote(count: number): string {
  return count === 0
    ? ""
    : `${pluralEntries(count)} in another currency, not counted here`;
}

/**
 * Every panel on the dashboard, read together.
 *
 * A failure does not take the page down, unlike `/budgets`: no panel here states
 * the sum of another, so a trend that could not be read is one panel saying so
 * beside three that are still true. The month's figures are one read, though, so
 * the stats and the donut fail as a pair.
 */
export async function getDashboardScreen(mode: TrendMode): Promise<DashboardScreen> {
  const accessToken = await requireAccessToken();
  const [overview, trend, walletOverview, wallets] = await Promise.all([
    fetchTransactionOverview(accessToken),
    fetchTransactionTrend(accessToken, mode),
    fetchWalletOverview(accessToken),
    listWallets(accessToken),
  ]);

  const today = todayInJakarta();
  const monthStartIso = `${today.slice(0, MONTH_ISO_LENGTH)}-01`;
  const monthName = monthLabel(new Date(monthStartIso));
  const subtitle = `${monthName} · ${plural(daysLeftInMonth(today), "day")} left in the cycle`;

  const monthReadable = overview.ok && walletOverview.ok;
  const month = monthReadable
    ? toDonut(overview.data.current.byCategory, monthName)
    : { donut: EMPTY_DONUT, caption: monthName };

  let stats: readonly SummaryStat[] = [];
  if (monthReadable) {
    const blocked = dashboardBalanceBlocked(
      wallets.ok ? wallets.data : [],
      walletOverview.data.baseCurrency,
      walletOverview.data.overdrawn,
      monthStartIso,
    );
    stats = [
      balanceStat(walletOverview.data.totalHeld, overview.data, blocked),
      incomeStat(overview.data, monthName),
      expenseStat(overview.data, monthName),
      savedStat(overview.data),
    ];
  }

  return {
    subtitle,
    stats,
    donut: month.donut,
    donutCaption: month.caption,
    monthError: monthError(overview, walletOverview),
    bars: trend.ok ? toBars(trend.data.points, mode) : [],
    trendLabel: trendLabel(mode, trend.ok ? trend.data.points.length : 0, monthName),
    trendError: trend.ok ? "" : trend.error.message,
    uncountedNote: overview.ok ? uncountedNote(overview.data.otherEntries) : "",
  };
}

const MONTH_ISO_LENGTH = 7;

/* ── the setup checklist ───────────────────────────────────────────────── */

/**
 * What a new account still has to do before this screen can say anything.
 *
 * Every panel below the card answers a question about money that has been
 * recorded, so on a fresh account all of them answer "none" at once. Five
 * panels each explaining their own emptiness is not an answer to "where do I
 * start" — this card is, and it retires itself the moment it stops being one.
 *
 * A step is ticked from the account's own data rather than from a flag, so the
 * card cannot disagree with the screen under it.
 */
export type SetupStep = {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly done: boolean;
  /** Where the step is done, or "" when it opens the add-transaction sheet. */
  readonly href: string;
  readonly action: string;
};

export type SetupChecklist = {
  readonly steps: readonly SetupStep[];
  readonly doneCount: number;
  readonly show: boolean;
};

const HIDDEN_CHECKLIST: SetupChecklist = {
  steps: [],
  doneCount: 0,
  show: false,
};

function categoryHint(count: number): string {
  return count === 0
    ? "Add the first one to file a transaction against it"
    : `${pluralCategories(count)} were set up for you`;
}

function walletHint(count: number): string {
  return count === 0
    ? "Where the money sits — cash, a bank account, an e-wallet"
    : `${plural(count, "wallet")} on this account`;
}

function entryHint(hasEntry: boolean): string {
  return hasEntry
    ? "Your ledger is running"
    : "The first income or expense fills every panel below";
}

/**
 * Registration seeds the categories, so the two real gaps are a wallet and a
 * first entry. The card names all three anyway: a step already ticked is what
 * makes the two that are not read as a short list rather than a warning.
 */
export async function getSetupChecklist(
  recent: RecentTransactions,
): Promise<SetupChecklist> {
  const accessToken = await requireAccessToken();
  const [categories, wallets] = await Promise.all([
    listCategories(accessToken),
    fetchWalletOptions(accessToken),
  ]);

  // A read that failed is not a step left undone. Rather than tell an account
  // with wallets that it has none, the card stays out of the way — the panels
  // below state the failure on their own.
  if (!categories.ok || !wallets.ok || recent.error !== "") {
    return HIDDEN_CHECKLIST;
  }

  const hasEntry = recent.items.length > 0;
  const steps: readonly SetupStep[] = [
    {
      id: "categories",
      label: "Categories ready",
      hint: categoryHint(categories.data.length),
      done: categories.data.length > 0,
      href: "/categories",
      action: "Add category",
    },
    {
      id: "wallet",
      label: "Add a wallet",
      hint: walletHint(wallets.data.length),
      done: wallets.data.length > 0,
      href: "/wallets",
      action: "Add wallet",
    },
    {
      id: "entry",
      label: "Record a transaction",
      hint: entryHint(hasEntry),
      done: hasEntry,
      href: "",
      action: "Add transaction",
    },
  ];

  const doneCount = steps.filter((step) => step.done).length;
  return { steps, doneCount, show: doneCount < steps.length };
}

function monthError(
  overview: ApiResult<TransactionOverviewRecord>,
  walletOverview: ApiResult<WalletOverviewRecord>,
): string {
  if (!overview.ok) {
    return overview.error.message;
  }
  return walletOverview.ok ? "" : walletOverview.error.message;
}

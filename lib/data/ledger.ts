import { CATEGORIES, RAMP_BY_CATEGORY_LABEL } from "@/lib/data/categories";
import { TODAY, TRANSACTIONS } from "@/lib/data/transactions";
import type { CategoryKey, RampStep, TrendPoint } from "@/types/ledger";

/**
 * Every aggregate in the app, summed out of `TRANSACTIONS`.
 *
 * Nothing downstream of this file states a money figure of its own. The
 * dashboard's four stats, the donut, both trend charts, what each budget has
 * spent and the insights ranking are all reductions over the same rows, so a
 * figure printed on one screen cannot disagree with the same figure on another.
 *
 * Two things here are input rather than derived, and both say so: the balance
 * August opened on, and the five months that ran before the ledger starts.
 */

/** The month every screen reports on. The ledger holds exactly this month. */
export const REPORTING_MONTH = "2026-08";
export const REPORTING_MONTH_LABEL = "August 2026";

/** The cycle is the calendar month, so what is left to run is what is left of it. */
const CYCLE_LAST_DAY = 31;

/** Days between `TODAY` and the end of the cycle — four, on 27 August. */
export function daysLeftInCycle(): number {
  return CYCLE_LAST_DAY - Number(TODAY.slice(8, 10));
}

/**
 * How much of the cycle has run, as a ratio — 27/31 on the 27th.
 *
 * What a spend is measured against to say whether it is early or late. A budget
 * 90% spent means nothing on its own; 90% spent with 87% of the month gone is
 * the sentence someone can act on.
 */
export function cycleElapsed(): number {
  return Number(TODAY.slice(8, 10)) / CYCLE_LAST_DAY;
}

/**
 * What was held on 31 July, across every wallet counted towards the total.
 *
 * This is the one figure a ledger cannot derive: a month of movements tells you
 * how much the balance changed, never what it started at. Once transactions are
 * live this stops being a constant and becomes `/wallets/overview`, which sums
 * the real balances in SQL.
 */
const OPENING_BALANCE = 75_650_000;

/** A month that ran before the ledger begins, kept the way an import leaves it. */
type MonthRollup = {
  /** The three letters a chart axis has room for. */
  readonly label: string;
  /** The month written out, for the sentences that name one. */
  readonly name: string;
  readonly income: number;
  /** Spend per category. The month's expense is the sum of these, never typed. */
  readonly spend: Readonly<Record<CategoryKey, number>>;
};

/**
 * The five months before the ledger begins.
 *
 * Rollups rather than rows because that is what a real migration leaves behind:
 * you carry summaries out of the old system, not every receipt. August is not
 * listed — it is summed from the ledger and appended by `monthlySeries`.
 *
 * Rent is the same Rp4.500.000 every month, which is what makes Housing the
 * flat band on the insights chart.
 */
const MARCH: MonthRollup = {
  label: "Mar",
  name: "March",
  income: 16_200_000,
  spend: { housing: 4_500_000, food: 2_310_000, transport: 1_310_000, subs: 690_000, utilities: 905_000, health: 640_000, other: 1_045_000, income: 0 },
};

const APRIL: MonthRollup = {
  label: "Apr",
  name: "April",
  income: 19_800_000,
  spend: { housing: 4_500_000, food: 2_680_000, transport: 1_840_000, subs: 742_000, utilities: 1_020_000, health: 905_000, other: 1_213_000, income: 0 },
};

const MAY: MonthRollup = {
  label: "May",
  name: "May",
  income: 15_400_000,
  spend: { housing: 4_500_000, food: 2_180_000, transport: 1_395_000, subs: 742_000, utilities: 880_000, health: 505_000, other: 598_000, income: 0 },
};

const JUNE: MonthRollup = {
  label: "Jun",
  name: "June",
  income: 22_100_000,
  spend: { housing: 4_500_000, food: 2_940_000, transport: 1_960_000, subs: 806_000, utilities: 1_140_000, health: 1_020_000, other: 1_234_000, income: 0 },
};

/** The month every "up 34%" on the insights screen is measured against. */
const JULY: MonthRollup = {
  label: "Jul",
  name: "July",
  income: 18_900_000,
  spend: { housing: 4_500_000, food: 2_490_000, transport: 1_683_000, subs: 881_000, utilities: 961_000, health: 813_000, other: 872_000, income: 0 },
};

const MONTH_HISTORY: readonly MonthRollup[] = [MARCH, APRIL, MAY, JUNE, JULY];

/* ── the month, totalled ───────────────────────────────────────────────── */

const rowsThisMonth = TRANSACTIONS.filter((row) =>
  row.date.startsWith(REPORTING_MONTH),
);

type Signed = { readonly amount: number };

function sumIncome(rows: readonly Signed[]): number {
  return rows.reduce((total, row) => (row.amount > 0 ? total + row.amount : total), 0);
}

function sumExpense(rows: readonly Signed[]): number {
  return rows.reduce((total, row) => (row.amount < 0 ? total - row.amount : total), 0);
}

function sumValues(values: Readonly<Record<string, number>>): number {
  return Object.values(values).reduce((total, value) => total + value, 0);
}

/** A share of a whole, guarded so an empty month reads 0 rather than NaN. */
export function shareOf(part: number, whole: number): number {
  return whole === 0 ? 0 : part / whole;
}

export type MonthTotals = {
  readonly income: number;
  readonly expense: number;
  /** Income less expense. Negative when the month spent more than it earned. */
  readonly net: number;
  /** The fraction of income kept, as a ratio. */
  readonly savingsRate: number;
  /** What was held on the last day of the month before. */
  readonly openingBalance: number;
  /** Opening balance plus what the month kept. */
  readonly closingBalance: number;
  readonly entryCount: number;
  readonly walletCount: number;
};

export function monthTotals(): MonthTotals {
  const income = sumIncome(rowsThisMonth);
  const expense = sumExpense(rowsThisMonth);
  const net = income - expense;

  return {
    income,
    expense,
    net,
    savingsRate: shareOf(net, income),
    openingBalance: OPENING_BALANCE,
    closingBalance: OPENING_BALANCE + net,
    entryCount: rowsThisMonth.length,
    walletCount: new Set(rowsThisMonth.map((row) => row.wallet)).size,
  };
}

/** How the balance moved against where it started — the balance card's delta. */
export function balanceGrowth(): number {
  const { net, openingBalance } = monthTotals();
  return shareOf(net, openingBalance);
}

/** Month-over-month change, as a ratio. Positive means the figure went up. */
function changeAgainstPrior(current: number, prior: number): number {
  return shareOf(current - prior, prior);
}

/** The month a delta is measured against: the one the history ends on. */
const PRIOR_MONTH = JULY;
const PRIOR_MONTH_EXPENSE = sumValues(PRIOR_MONTH.spend);

export function incomeGrowth(): number {
  return changeAgainstPrior(monthTotals().income, PRIOR_MONTH.income);
}

export function expenseGrowth(): number {
  return changeAgainstPrior(monthTotals().expense, PRIOR_MONTH_EXPENSE);
}

/* ── the month, split by category ──────────────────────────────────────── */

/**
 * The spending categories in ramp order. `income` is not one of them — it is
 * where money comes from, not somewhere it goes — so it is dropped here, which
 * also leaves exactly seven keys for the seven-step ramp.
 */
const SPEND_CATEGORIES: readonly CategoryKey[] = Object.values(CATEGORIES)
  .filter((category) => category.key !== "income")
  .map((category) => category.key);

export type CategorySpend = {
  readonly key: CategoryKey;
  readonly label: string;
  readonly value: number;
  readonly step: RampStep;
  /** Change against the same category last month, as a ratio. */
  readonly change: number;
};

function spentOn(key: CategoryKey): number {
  return sumExpense(rowsThisMonth.filter((row) => row.category === key));
}

/**
 * Every spending category, in ramp order and never sorted — the ramp step a
 * category wears is its position in this list, so reordering would repaint the
 * donut. Rank by value where a ranking is wanted; do not reorder this.
 */
export function spendByCategory(): readonly CategorySpend[] {
  return SPEND_CATEGORIES.map((key) => {
    const { label } = CATEGORIES[key];
    const value = spentOn(key);

    return {
      key,
      label,
      value,
      step: RAMP_BY_CATEGORY_LABEL[label],
      change: changeAgainstPrior(value, PRIOR_MONTH.spend[key]),
    };
  });
}

/** One category's figures, for the copy that names a category out loud. */
export function categorySpend(key: CategoryKey): CategorySpend {
  const found = spendByCategory().find((entry) => entry.key === key);
  // Every spending key is in the list, so the fallback is only for `income`.
  return found ?? {
    key,
    label: CATEGORIES[key].label,
    value: 0,
    step: "c7",
    change: 0,
  };
}

/** The single biggest charge in a category this month, for copy that names one. */
export function largestRowIn(key: CategoryKey): { name: string; amount: number } {
  const rows = rowsThisMonth.filter((row) => row.category === key);
  const biggest = rows.reduce<{ name: string; amount: number }>(
    (leader, row) =>
      Math.abs(row.amount) > leader.amount
        ? { name: row.name, amount: Math.abs(row.amount) }
        : leader,
    { name: "", amount: 0 },
  );
  return biggest;
}

/** What the month before spent on one category — what a delta is measured off. */
export function priorSpendOn(key: CategoryKey): number {
  return PRIOR_MONTH.spend[key];
}

/** How many rows of income the month carries — "four client invoices". */
export function incomeRowCount(): number {
  return rowsThisMonth.filter((row) => row.amount > 0).length;
}

/**
 * The most recent month that spent less on this than the current one — what
 * lets a card say "cheapest month since March" and be checkably right. `null`
 * when no month on record was cheaper, which is the stronger claim.
 */
export function lastCheaperMonth(key: CategoryKey): string | null {
  const current = categorySpend(key).value;
  const cheaper = MONTH_HISTORY.filter((month) => month.spend[key] < current);
  return cheaper.at(-1)?.name ?? null;
}

/* ── the month, split by week ──────────────────────────────────────────── */

/** Day-of-month a week starts on. The last runs to the end of the month. */
const WEEK_STARTS = [1, 8, 15, 22, 29] as const;
const DAYS_IN_WEEK = 7;

function weekIndexOf(isoDate: string): number {
  const dayOfMonth = Number(isoDate.slice(8, 10));
  const index = Math.floor((dayOfMonth - 1) / DAYS_IN_WEEK);
  return Math.min(index, WEEK_STARTS.length - 1);
}

/**
 * The month in five buckets. W5 is empty until the 29th, which is the honest
 * reading on the 27th — nothing has been spent in a week that has not started.
 */
export function weeklyTrend(): readonly TrendPoint[] {
  const buckets = WEEK_STARTS.map((_, index) =>
    rowsThisMonth.filter((row) => weekIndexOf(row.date) === index),
  );

  return buckets.map((rows, index) => ({
    label: `W${index + 1}`,
    income: sumIncome(rows),
    expense: sumExpense(rows),
  }));
}

/* ── the six months ────────────────────────────────────────────────────── */

/** Six months: five carried in from the rollups, and this one summed live. */
export function monthlySeries(): readonly TrendPoint[] {
  const { income, expense } = monthTotals();
  return [
    ...MONTH_HISTORY.map((month) => ({
      label: month.label,
      income: month.income,
      expense: sumValues(month.spend),
    })),
    { label: REPORTING_MONTH_LABEL.slice(0, 3), income, expense },
  ];
}

export type MonthlyCategorySpend = {
  readonly label: string;
  readonly spend: Readonly<Record<CategoryKey, number>>;
};

/** The same six months, split by category — what the comparison chart stacks. */
export function monthlySpendByCategory(): readonly MonthlyCategorySpend[] {
  const current = Object.fromEntries(
    spendByCategory().map((entry) => [entry.key, entry.value]),
  ) as Record<CategoryKey, number>;

  return [
    ...MONTH_HISTORY.map((month) => ({ label: month.label, spend: month.spend })),
    {
      label: REPORTING_MONTH_LABEL.slice(0, 3),
      spend: { ...current, income: 0 },
    },
  ];
}

/** The six-month average income, which the recurring screen quotes against. */
export function averageMonthlyIncome(): number {
  const series = monthlySeries();
  return series.reduce((total, month) => total + month.income, 0) / series.length;
}

/**
 * How many months in a row this category has risen, counting back from now.
 * A card claiming something "climbed for the third month" is counting this.
 */
export function risingStreak(key: CategoryKey): number {
  const values = monthlySpendByCategory().map((month) => month.spend[key]);

  let streak = 0;
  for (let index = values.length - 1; index > 0; index -= 1) {
    if (values[index] <= values[index - 1]) {
      break;
    }
    streak += 1;
  }
  return streak;
}

/* ── what the screens call themselves ──────────────────────────────────── */

/** "August 2026 · 4 days left in the cycle". */
export function dashboardSubtitle(): string {
  return `${REPORTING_MONTH_LABEL} · ${daysLeftInCycle()} days left in the cycle`;
}

/** "54 entries this month across 5 wallets" — counted, never claimed. */
export function transactionsSubtitle(): string {
  const { entryCount, walletCount } = monthTotals();
  return `${entryCount} entries this month across ${walletCount} wallets`;
}

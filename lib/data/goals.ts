import type { Goal } from "@/types/ledger";

/** The artboard's `goals` list (Finance App.dc.html, lines ~2168-2172). */
const GOALS: readonly Goal[] = [
  {
    id: "goal-house",
    name: "House down payment",
    deadline: "Target December 2028",
    icon: "home",
    percent: "38%",
    saved: "Rp152.000.000",
    target: "Rp400.000.000",
    monthly: "Rp6.500.000",
    eta: "On track",
  },
  {
    id: "goal-emergency",
    name: "Emergency fund",
    deadline: "6 months of expenses",
    icon: "shield",
    percent: "78%",
    saved: "Rp42.000.000",
    target: "Rp54.000.000",
    monthly: "Rp1.500.000",
    eta: "Done by May 2027",
  },
  {
    id: "goal-laptop",
    name: "New laptop",
    deadline: "Target March 2027",
    icon: "monitor",
    percent: "39%",
    saved: "Rp12.400.000",
    target: "Rp32.000.000",
    monthly: "Rp1.200.000",
    eta: "2 months behind",
  },
];

/** Twelve months to August; the streak has been running since February. */
const STREAK_LABELS = [
  "S", "O", "N", "D", "J", "F", "M", "A", "M", "J", "J", "A",
] as const;

const STREAK_STARTS_AT = 5;

export type StreakMonth = {
  readonly id: string;
  readonly label: string;
  readonly isActive: boolean;
};

export const STREAK_MONTHS: readonly StreakMonth[] = STREAK_LABELS.map(
  (label, index) => ({
    id: `streak-${index}`,
    label,
    isActive: index >= STREAK_STARTS_AT,
  }),
);

export const GOAL_FUNDING_WALLETS = [
  "BCA Payroll",
  "Jenius savings",
  "Wise USD",
] as const;

export async function getGoals(): Promise<readonly Goal[]> {
  return GOALS;
}

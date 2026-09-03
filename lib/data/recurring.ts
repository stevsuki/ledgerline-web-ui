import type { IconName } from "@/components/ui/icon-sprite";
import { averageMonthlyIncome } from "@/lib/data/ledger";
import { formatPercent, formatRupiah } from "@/lib/format";
import { paginate, type Paged } from "@/lib/pagination";
import type { MiniStat, RecurringItem } from "@/types/ledger";

/**
 * The schedule, as amounts and due days rather than as the sentences the
 * artboard printed. "Due in 7 days" and "leaves in the first six days of
 * September" are then both the same question asked of this list with a
 * different horizon, instead of two figures typed by hand that disagreed with
 * it — the artboard's own header said Rp5.891.000 a month while its rows added
 * up to Rp5.705.000.
 */
type ScheduledItem = {
  readonly id: string;
  readonly name: string;
  readonly wallet: string;
  readonly icon: IconName;
  readonly frequency: string;
  /** Day of September it falls on. A paused item has no next date. */
  readonly dueDay: number | null;
  readonly amount: number;
};

const SCHEDULE: readonly ScheduledItem[] = [
  { id: "rec-rent", name: "Kost Tebet Barat", wallet: "BCA Payroll", icon: "home", frequency: "Monthly", dueDay: 1, amount: 4_500_000 },
  { id: "rec-biznet", name: "Biznet Home", wallet: "BCA Payroll", icon: "wifi", frequency: "Monthly", dueDay: 1, amount: 425_000 },
  { id: "rec-figma", name: "Figma Professional", wallet: "BCA Card", icon: "monitor", frequency: "Monthly", dueDay: 3, amount: 180_000 },
  { id: "rec-adobe", name: "Adobe Creative Cloud", wallet: "BCA Card", icon: "monitor", frequency: "Monthly", dueDay: 6, amount: 290_000 },
  { id: "rec-copilot", name: "GitHub Copilot", wallet: "BCA Card", icon: "monitor", frequency: "Monthly", dueDay: 9, amount: 160_000 },
  { id: "rec-bpjs", name: "BPJS Kesehatan", wallet: "BCA Payroll", icon: "heart", frequency: "Monthly", dueDay: 10, amount: 150_000 },
  { id: "rec-netflix", name: "Netflix", wallet: "GoPay", icon: "monitor", frequency: "Monthly", dueDay: null, amount: 186_000 },
];

/**
 * How far ahead "due soon" looks. Seven days from 27 August reaches 3 September,
 * which is one day further than the artboard's own flags went — it marked the
 * two items on the 1st and stopped, missing the subscription on the 3rd.
 */
const DUE_SOON_THROUGH_DAY = 3;

/** The window the dashboard's cash-flow insight asks about. */
const FIRST_DAYS_THROUGH_DAY = 6;

const PAUSED_SINCE = "July";

function isActive(item: ScheduledItem): item is ScheduledItem & { dueDay: number } {
  return item.dueDay !== null;
}

const ACTIVE = SCHEDULE.filter(isActive);

function totalDueThrough(day: number): number {
  return ACTIVE.filter((item) => item.dueDay <= day).reduce(
    (total, item) => total + item.amount,
    0,
  );
}

function namesDueThrough(day: number): readonly string[] {
  return ACTIVE.filter((item) => item.dueDay <= day).map((item) => item.name);
}

/** What leaves the account before the given day of September. */
export function dueSoonTotal(): number {
  return totalDueThrough(DUE_SOON_THROUGH_DAY);
}

export function firstDaysTotal(): number {
  return totalDueThrough(FIRST_DAYS_THROUGH_DAY);
}

export function firstDaysNames(): readonly string[] {
  return namesDueThrough(FIRST_DAYS_THROUGH_DAY);
}

/** Every active item's amount, added up — what the schedule costs a month. */
export function monthlyCommitment(): number {
  return ACTIVE.reduce((total, item) => total + item.amount, 0);
}

function toRow(item: ScheduledItem): RecurringItem {
  const paused = item.dueDay === null;

  return {
    id: item.id,
    name: item.name,
    wallet: item.wallet,
    icon: item.icon,
    frequency: item.frequency,
    due: paused ? "Paused" : `${item.dueDay} Sep`,
    amount: formatRupiah(item.amount),
    isDueSoon: !paused && item.dueDay <= DUE_SOON_THROUGH_DAY,
    isPaused: paused,
  };
}

export const RECURRING_PAGE_SIZES = [5, 10, 25] as const;

/** "Rent, internet and one subscription" — the note under the due-soon stat. */
function listNames(names: readonly string[]): string {
  if (names.length <= 1) {
    return names.join("");
  }
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function getRecurringStats(): readonly MiniStat[] {
  const commitment = monthlyCommitment();
  const pausedCount = SCHEDULE.length - ACTIVE.length;

  return [
    {
      id: "commitment",
      label: "Monthly commitment",
      value: formatRupiah(commitment),
      tone: "text",
      note: `${formatPercent(commitment / averageMonthlyIncome())} of average income`,
    },
    {
      id: "due-soon",
      label: "Due in 7 days",
      value: formatRupiah(dueSoonTotal()),
      tone: "expense",
      note: listNames(namesDueThrough(DUE_SOON_THROUGH_DAY)),
    },
    {
      id: "active",
      label: "Active items",
      value: String(ACTIVE.length),
      tone: "text",
      note: `${pausedCount} paused since ${PAUSED_SINCE}`,
    },
  ];
}

/** "7 scheduled items · Rp5.705.000 per month" — the screen's own subtitle. */
export function recurringSubtitle(): string {
  return `${SCHEDULE.length} scheduled items · ${formatRupiah(monthlyCommitment())} per month`;
}

export const RECURRING_FREQUENCIES = [
  "Monthly",
  "Weekly",
  "Quarterly",
  "Annual",
] as const;

export const RECURRING_WALLETS = ["BCA Card", "GoPay", "BCA Payroll"] as const;

export async function getRecurring(
  page: number,
  size: number,
): Promise<Paged<RecurringItem>> {
  return paginate(SCHEDULE.map(toRow), page, size);
}

/**
 * The artboard's schedule, kept only for the insights preview: the live screen
 * reads `lib/data/recurring-list.ts`.
 */
type ScheduledItem = {
  readonly id: string;
  readonly name: string;
  /** Day of September it falls on. A paused item has no next date. */
  readonly dueDay: number | null;
  readonly amount: number;
};

const SCHEDULE: readonly ScheduledItem[] = [
  { id: "rec-rent", name: "Kost Tebet Barat", dueDay: 1, amount: 4_500_000 },
  { id: "rec-biznet", name: "Biznet Home", dueDay: 1, amount: 425_000 },
  { id: "rec-figma", name: "Figma Professional", dueDay: 3, amount: 180_000 },
  { id: "rec-adobe", name: "Adobe Creative Cloud", dueDay: 6, amount: 290_000 },
  { id: "rec-copilot", name: "GitHub Copilot", dueDay: 9, amount: 160_000 },
  { id: "rec-bpjs", name: "BPJS Kesehatan", dueDay: 10, amount: 150_000 },
  { id: "rec-netflix", name: "Netflix", dueDay: null, amount: 186_000 },
];

/** The window the cash-flow insight asks about. */
const FIRST_DAYS_THROUGH_DAY = 6;

function dueInFirstDays(): readonly ScheduledItem[] {
  return SCHEDULE.filter(
    (item) => item.dueDay !== null && item.dueDay <= FIRST_DAYS_THROUGH_DAY,
  );
}

export function firstDaysTotal(): number {
  return dueInFirstDays().reduce((total, item) => total + item.amount, 0);
}

export function firstDaysNames(): readonly string[] {
  return dueInFirstDays().map((item) => item.name);
}

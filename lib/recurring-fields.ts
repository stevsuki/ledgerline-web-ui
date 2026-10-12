/** The recurring form's contract: every name is the backend's own json tag. */
export const RECURRING_FIELD = {
  id: "id",
  name: "name",
  amount: "amount",
  frequency: "frequency",
  nextDueDate: "next_due_date",
  wallet: "wallet_id",
  category: "category_id",
  isPaused: "is_paused",
  /** The form's own: the picked wallet's currency, which the amount is read in. */
  currency: "currency",
  /** The confirm sheet's own. */
  paidOn: "paid_on",
  note: "note",
} as const;

export const RECURRING_FREQUENCIES = [
  "monthly",
  "weekly",
  "quarterly",
  "annual",
] as const;

export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

export const FREQUENCY_LABEL: Readonly<Record<RecurringFrequency, string>> = {
  monthly: "Monthly",
  weekly: "Weekly",
  quarterly: "Quarterly",
  annual: "Annual",
};

export const FREQUENCY_OPTIONS = RECURRING_FREQUENCIES.map((value) => ({
  value,
  label: FREQUENCY_LABEL[value],
}));

export function parseFrequency(value: string): RecurringFrequency {
  return RECURRING_FREQUENCIES.find((option) => option === value) ?? "monthly";
}

export const RECURRING_NAME_MAX_LENGTH = 100;
export const RECURRING_NOTE_MAX_LENGTH = 255;

/** Two date formats meet in this app and neither converts for free. */

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const DAYS_PER_WEEK = 7;

/** Six rows always, so the popover never changes height between months. */
const WEEKS_SHOWN = 6;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** Sunday-first, matching the artboard's week strips. */
export const WEEKDAYS = [
  { key: "sun", initial: "S", label: "Sunday" },
  { key: "mon", initial: "M", label: "Monday" },
  { key: "tue", initial: "T", label: "Tuesday" },
  { key: "wed", initial: "W", label: "Wednesday" },
  { key: "thu", initial: "T", label: "Thursday" },
  { key: "fri", initial: "F", label: "Friday" },
  { key: "sat", initial: "S", label: "Saturday" },
] as const;

export type DateRange = { readonly from: string; readonly to: string };

export const EMPTY_RANGE: DateRange = { from: "", to: "" };

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * The workspace keeps Jakarta time, so "today" and the day a timestamp fell on
 * are both read there — not in whatever zone the server happens to run in.
 */
const JAKARTA_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today in Jakarta, as an ISO day. Live screens date their figures against it. */
export function todayInJakarta(): string {
  return JAKARTA_DAY.format(new Date());
}

/** The Jakarta calendar day an API timestamp fell on; "" when it is unreadable. */
export function isoDayOf(timestamp: string): string {
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? "" : JAKARTA_DAY.format(parsed);
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `null` for anything that is not a real calendar day, `2026-02-30` included. */
export function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE_PATTERN.test(value)) {
    return null;
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(year, month - 1, day);

  const isReal = date.getMonth() === month - 1 && date.getDate() === day;
  return isReal ? date : null;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function shiftMonth(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function monthLabel(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/** The 42 days a month grid shows: the month, padded out of its neighbours. */
export function monthGrid(month: Date): readonly Date[] {
  const first = startOfMonth(month);
  const start = addDays(first, -first.getDay());

  return Array.from({ length: WEEKS_SHOWN * DAYS_PER_WEEK }, (_, offset) =>
    addDays(start, offset),
  );
}

/** ISO days are lexicographically ordered, so a range test is a string test. */
export function isWithin(iso: string, range: DateRange): boolean {
  if (range.from && iso < range.from) {
    return false;
  }
  return !(range.to && iso > range.to);
}

export function clampIso(iso: string, min: string, max: string): string {
  if (iso < min) {
    return min;
  }
  return iso > max ? max : iso;
}

/** A range is only ever stored low-to-high, whichever end was clicked first. */
export function orderRange(a: string, b: string): DateRange {
  return a <= b ? { from: a, to: b } : { from: b, to: a };
}

function dayAndMonth(date: Date): string {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)}`;
}

/**
 * "Thursday, 27 August" — the day heading a ledger group prints. Derived from
 * the row's own ISO date rather than typed beside it, so a weekday can never
 * disagree with the date it labels.
 */
export function formatDayHeading(iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) {
    return iso;
  }
  return `${WEEKDAYS[date.getDay()].label}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

function shortDay(iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) {
    return iso;
  }
  return `${dayAndMonth(date)} ${date.getFullYear()}`;
}

const MS_PER_DAY = 86_400_000;

/** Past this, "N days ago" stops being easier to read than the date itself. */
const RELATIVE_DAY_LIMIT = 30;

/** "18 Sep" — the short day a wallet card prints. */
export function formatDayMonth(iso: string): string {
  const date = parseIsoDate(iso);
  return date ? dayAndMonth(date) : iso;
}

/**
 * "today" / "yesterday" / "6 days ago" / "on 18 Jul". Nothing in the app syncs,
 * so how stale a figure is has to be stated rather than implied.
 */
export function formatSince(iso: string, todayIso: string): string {
  const then = parseIsoDate(iso);
  const today = parseIsoDate(todayIso);
  if (!then || !today) {
    return "—";
  }

  const days = Math.round((today.getTime() - then.getTime()) / MS_PER_DAY);
  if (days <= 0) {
    return "today";
  }
  if (days === 1) {
    return "yesterday";
  }
  return days < RELATIVE_DAY_LIMIT ? `${days} days ago` : `on ${formatDayMonth(iso)}`;
}

/**
 * The next time a statement day comes round — this month if it is still ahead,
 * otherwise the next one. A 31st is pulled back to the length of the month.
 */
export function nextDueDate(dueDay: number, todayIso: string): string {
  const today = parseIsoDate(todayIso);
  if (!today) {
    return "";
  }

  const monthOffset = today.getDate() <= dueDay ? 0 : 1;
  const month = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const lastDay = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();

  return toIsoDate(
    new Date(month.getFullYear(), month.getMonth(), Math.min(dueDay, lastDay)),
  );
}

/** What the trigger button and the export summary print. */
export function formatRangeLabel(range: DateRange, fallback: string): string {
  if (!range.from && !range.to) {
    return fallback;
  }
  if (range.from && !range.to) {
    return `From ${shortDay(range.from)}`;
  }
  if (!range.from && range.to) {
    return `Until ${shortDay(range.to)}`;
  }
  if (range.from === range.to) {
    return shortDay(range.from);
  }

  const sameMonth = range.from.slice(0, 7) === range.to.slice(0, 7);
  const start = sameMonth
    ? String(parseIsoDate(range.from)?.getDate() ?? "")
    : shortDay(range.from);

  return `${start} – ${shortDay(range.to)}`;
}

/** The preset names, so a chip can call a range what the segments call it. */
const PRESET_LABEL: Readonly<Record<RangePresetId, string>> = {
  "7d": "7 days",
  "30d": "30 days",
  month: "This month",
  all: "",
};

/** The shortest label that is still true, for the filter bar's chip. */
export function formatRangeChip(
  range: DateRange,
  todayIso: string,
  fallback: string,
): string {
  const preset = matchingPreset(range, todayIso);
  if (preset === "all") {
    return fallback;
  }
  if (preset) {
    return PRESET_LABEL[preset];
  }

  const start = parseIsoDate(range.from);
  const end = parseIsoDate(range.to);
  const year = todayIso.slice(0, 4);
  const isThisYear =
    range.from.slice(0, 4) === year && range.to.slice(0, 4) === year;

  if (!start || !end || !isThisYear) {
    return formatRangeLabel(range, fallback);
  }

  if (range.from === range.to) {
    return dayAndMonth(start);
  }

  const sameMonth = range.from.slice(0, 7) === range.to.slice(0, 7);
  const from = sameMonth ? String(start.getDate()) : dayAndMonth(start);
  return `${from} – ${dayAndMonth(end)}`;
}

/* presets — The four shortcuts that answer most range questions on their own. */

export const RANGE_PRESET_IDS = ["7d", "30d", "month", "all"] as const;

export type RangePresetId = (typeof RANGE_PRESET_IDS)[number];

export const RANGE_PRESETS: readonly {
  readonly id: RangePresetId;
  readonly label: string;
}[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "month", label: "This month" },
  { id: "all", label: "All" },
];

const PRESET_LOOKBACK_DAYS: Readonly<Record<"7d" | "30d", number>> = {
  "7d": 6,
  "30d": 29,
};

export function presetRange(id: RangePresetId, todayIso: string): DateRange {
  const today = parseIsoDate(todayIso);
  if (!today || id === "all") {
    return EMPTY_RANGE;
  }

  if (id === "month") {
    return { from: toIsoDate(startOfMonth(today)), to: todayIso };
  }

  return { from: toIsoDate(addDays(today, -PRESET_LOOKBACK_DAYS[id])), to: todayIso };
}

/** Which shortcut, if any, the current range is already showing. */
export function matchingPreset(
  range: DateRange,
  todayIso: string,
): RangePresetId | null {
  const match = RANGE_PRESET_IDS.find((id) => {
    const preset = presetRange(id, todayIso);
    return preset.from === range.from && preset.to === range.to;
  });
  return match ?? null;
}

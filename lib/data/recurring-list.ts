import { fetchCategoryOptions } from "@/lib/api/categories";
import {
  fetchRecurringOverview,
  listRecurring,
  type RecurringOverviewRecord,
  type RecurringRecord,
} from "@/lib/api/recurring";
import { fetchWalletOptions } from "@/lib/api/wallets";
import { requireAccessToken } from "@/lib/auth/session";
import { ICON_BY_CATEGORY_KIND } from "@/lib/category-fields";
import { daysBetween, formatDayMonth, todayInJakarta } from "@/lib/dates";
import { formatFigure, formatMoney } from "@/lib/format";
import type { IconKey } from "@/lib/icon-choice";
import { paginate, type Paged } from "@/lib/pagination";
import {
  FREQUENCY_LABEL,
  type RecurringFrequency,
} from "@/lib/recurring-fields";
import type { CurrencyCode, MiniStat, Tone } from "@/types/ledger";

/** The recurring screen, served from `ledgerline-backend`. */

export const RECURRING_PAGE_SIZES = [5, 10, 25] as const;

/** How far ahead a row is flagged; the overview's own total uses the same span. */
const DUE_SOON_DAYS = 7;

export type RecurringDraft = {
  /** "" for an item that does not exist yet. */
  readonly id: string;
  readonly name: string;
  readonly amount: string;
  readonly currency: CurrencyCode;
  readonly frequency: RecurringFrequency;
  readonly nextDueDate: string;
  readonly walletId: string;
  readonly categoryId: string;
  readonly isPaused: boolean;
};

export type RecurringDueState = "paused" | "overdue" | "soon" | "later";

export type RecurringRow = {
  readonly id: string;
  readonly name: string;
  readonly wallet: string;
  readonly icon: IconKey;
  readonly frequency: string;
  /** "3 days overdue" / "Due today" / "Due in 3 days" / "Paused". */
  readonly dueLabel: string;
  /** "13 Oct", or "" on a paused item. */
  readonly dueDate: string;
  readonly dueState: RecurringDueState;
  readonly dueTone: Tone;
  /** Due today or already past: the row asks for its payment to be recorded. */
  readonly needsAction: boolean;
  readonly amount: string;
  readonly draft: RecurringDraft;
};

export type WalletChoice = {
  readonly value: string;
  readonly label: string;
  readonly currency: CurrencyCode;
};

export type CategoryChoice = {
  readonly value: string;
  readonly label: string;
};

export type RecurringScreen = {
  readonly page: Paged<RecurringRow>;
  readonly stats: readonly MiniStat[];
  readonly subtitle: string;
  readonly wallets: readonly WalletChoice[];
  readonly categories: readonly CategoryChoice[];
  /** Null when there is no wallet or category to schedule against. */
  readonly draft: RecurringDraft | null;
  readonly emptyNote: string;
  readonly today: string;
  readonly error: string;
};

function plural(count: number, noun: string): string {
  return count === 1 ? `${count} ${noun}` : `${count} ${noun}s`;
}

function dueStateOf(isPaused: boolean, daysLeft: number): RecurringDueState {
  if (isPaused) {
    return "paused";
  }
  if (daysLeft < 0) {
    return "overdue";
  }
  return daysLeft <= DUE_SOON_DAYS ? "soon" : "later";
}

const DUE_TONE: Readonly<Record<RecurringDueState, Tone>> = {
  paused: "muted",
  overdue: "expense",
  soon: "warn",
  later: "muted",
};

function dueLabelOf(state: RecurringDueState, daysLeft: number): string {
  if (state === "paused") {
    return "Paused";
  }
  if (state === "overdue") {
    return `${plural(-daysLeft, "day")} overdue`;
  }
  if (daysLeft === 0) {
    return "Due today";
  }
  return daysLeft === 1 ? "Due tomorrow" : `Due in ${daysLeft} days`;
}

function toDraft(record: RecurringRecord): RecurringDraft {
  return {
    id: record.id,
    name: record.name,
    amount: formatFigure(record.amount, record.currency),
    currency: record.currency,
    frequency: record.frequency,
    nextDueDate: record.nextDueDate,
    walletId: record.walletId,
    categoryId: record.categoryId,
    isPaused: record.isPaused,
  };
}

function toRow(record: RecurringRecord, today: string): RecurringRow {
  const daysLeft = daysBetween(today, record.nextDueDate);
  const dueState = dueStateOf(record.isPaused, daysLeft);

  return {
    id: record.id,
    name: record.name,
    wallet: record.walletName,
    icon: record.icon === "" ? ICON_BY_CATEGORY_KIND.expense : record.icon,
    frequency: FREQUENCY_LABEL[record.frequency],
    dueLabel: dueLabelOf(dueState, daysLeft),
    dueDate: record.isPaused ? "" : formatDayMonth(record.nextDueDate),
    dueState,
    dueTone: DUE_TONE[dueState],
    needsAction: !record.isPaused && daysLeft <= 0,
    amount: formatMoney(record.amount, record.currency),
    draft: toDraft(record),
  };
}

function dueSoonNote(overview: RecurringOverviewRecord): string {
  const items = plural(overview.dueSoonCount, "item");
  return overview.overdueCount > 0
    ? `${items} · ${overview.overdueCount} overdue`
    : items;
}

function commitmentNote(overview: RecurringOverviewRecord): string {
  return overview.uncountedItems > 0
    ? `${plural(overview.uncountedItems, "item")} in another currency, not counted here`
    : "Every active item, spread over a month";
}

function toStats(overview: RecurringOverviewRecord): readonly MiniStat[] {
  return [
    {
      id: "commitment",
      label: "Monthly commitment",
      value: formatMoney(overview.monthlyCommitment, overview.currency),
      tone: "text",
      note: commitmentNote(overview),
    },
    {
      id: "due-soon",
      label: `Due in ${overview.dueSoonDays} days`,
      value: formatMoney(overview.dueSoonTotal, overview.currency),
      tone: "expense",
      note: dueSoonNote(overview),
    },
    {
      id: "active",
      label: "Active items",
      value: String(overview.activeCount),
      tone: "text",
      note: `${overview.pausedCount} paused`,
    },
  ];
}

const NO_WALLET_NOTE = "Add a wallet first — a recurring item is paid from one.";
const NO_CATEGORY_NOTE =
  "No spending category could be read, so nothing can be scheduled right now.";

function blankDraft(
  wallets: readonly WalletChoice[],
  categories: readonly CategoryChoice[],
  today: string,
): RecurringDraft | null {
  const [wallet] = wallets;
  const [category] = categories;
  if (!wallet || !category) {
    return null;
  }

  return {
    id: "",
    name: "",
    amount: "",
    currency: wallet.currency,
    frequency: "monthly",
    nextDueDate: today,
    walletId: wallet.value,
    categoryId: category.value,
    isPaused: false,
  };
}

/**
 * The list and its overview are awaited together and fail together: the cards
 * state sums of the rows under them. The two option calls only feed the form.
 */
export async function getRecurringScreen(
  page: number,
  size: number,
): Promise<RecurringScreen> {
  const accessToken = await requireAccessToken();
  const today = todayInJakarta();

  const [listed, overview, walletOptions, categoryOptions] = await Promise.all([
    listRecurring(accessToken),
    fetchRecurringOverview(accessToken, today),
    fetchWalletOptions(accessToken),
    fetchCategoryOptions(accessToken, "expense"),
  ]);

  const wallets = walletOptions.ok
    ? walletOptions.data.map((option) => ({
        value: option.id,
        label: option.name,
        currency: option.currency,
      }))
    : [];
  const categories = categoryOptions.ok
    ? categoryOptions.data.map((option) => ({
        value: option.id,
        label: option.name,
      }))
    : [];

  const form = {
    wallets,
    categories,
    draft: blankDraft(wallets, categories, today),
    emptyNote: wallets.length === 0 ? NO_WALLET_NOTE : NO_CATEGORY_NOTE,
    today,
  };

  const unread = {
    ...form,
    page: paginate<RecurringRow>([], page, size),
    stats: [],
    subtitle: "The schedule could not be read",
  };
  if (!listed.ok) {
    return { ...unread, error: listed.error.message };
  }
  if (!overview.ok) {
    return { ...unread, error: overview.error.message };
  }

  const rows = listed.data.map((record) => toRow(record, today));

  return {
    ...form,
    page: paginate(rows, page, size),
    stats: toStats(overview.data),
    subtitle: `${plural(rows.length, "scheduled item")} · ${formatMoney(overview.data.monthlyCommitment, overview.data.currency)} per month`,
    error: "",
  };
}

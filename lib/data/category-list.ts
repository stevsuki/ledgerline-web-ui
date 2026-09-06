import type { IconName } from "@/components/ui/icon-sprite";
import { listCategories, type CategoryRecord } from "@/lib/api/categories";
import { requireAccessToken } from "@/lib/auth/session";
import {
  CATEGORY_KIND_LABEL,
  FALLBACK_MASTER_ID,
  ICON_BY_CATEGORY_KIND,
  MASTER_DEFAULTS,
  RAMP_STEPS,
} from "@/lib/category-fields";
import { CATEGORIES } from "@/lib/data/categories";
import type { CategoryKind, MiniStat, RampStep } from "@/types/ledger";

/**
 * The categories screen: the master list, and nothing else.
 *
 * **No money figure is stated anywhere on this screen, deliberately.** What was
 * spent per category is the dashboard's donut and the insights ranking, and how
 * much of a limit is left is the budgets screen — printing any of it again here
 * would be a second copy of a number that already has an owner, and the two
 * would drift the first time one of them changed. This screen answers only what
 * nothing else does: which categories exist, which way each one runs, what it
 * is drawn with, and where it came from.
 *
 * It reads `/categories`, which is per user: `SeedDefaults` gives a new account
 * the seven master rows as `expense`, and everything after that is theirs.
 */

/* ── resolving the two defaults ────────────────────────────────────────── */

/**
 * A category wears its own tile; failing that, the one its master row was
 * drawn with on the artboard; failing that, its kind's.
 */
function iconOf(record: CategoryRecord): IconName {
  if (record.icon !== "") {
    return record.icon;
  }
  return (
    MASTER_DEFAULTS[record.masterId]?.icon ??
    ICON_BY_CATEGORY_KIND[record.kind]
  );
}

/**
 * Its step of the ramp, by the same order of preference — and, for a category
 * named by hand before the colour column existed, the next step round.
 *
 * That last step is the weak one: past seven categories two of them share a
 * step, and two slices of one colour cannot be told apart. It is the reason the
 * editor asks for a colour rather than counting one out.
 */
function stepOf(record: CategoryRecord, index: number): RampStep {
  if (record.color !== "") {
    return record.color;
  }
  return (
    MASTER_DEFAULTS[record.masterId]?.color ??
    RAMP_STEPS[index % RAMP_STEPS.length]
  );
}

/** Exactly one row catches spending nobody named, and it is this one. */
function isFallback(record: CategoryRecord): boolean {
  return record.masterId === FALLBACK_MASTER_ID;
}

/* ── the row ───────────────────────────────────────────────────────────── */

/** What the editor opens with. A blank id is a category that does not exist yet. */
export type CategoryDraft = {
  readonly id: string;
  readonly name: string;
  readonly kind: CategoryKind;
  readonly icon: IconName;
  readonly color: RampStep;
  readonly isFallback: boolean;
};

/** Why a category cannot be removed — said in the sheet, beside the button. */
export type CategoryRemoval = {
  readonly canRemove: boolean;
  readonly reason: string;
};

export type CategoryRow = {
  readonly id: string;
  readonly name: string;
  readonly icon: IconName;
  readonly step: RampStep;
  /** "Expense · from the shared list · catches what is not named" */
  readonly meta: string;
  readonly removal: CategoryRemoval;
  readonly draft: CategoryDraft;
};

const FALLBACK_REASON =
  "This is where spending nobody named lands, and where naming one on a transaction starts. It stays.";

const SEEDED_NOTE = "from the shared list";
const OWN_NOTE = "added by hand";
const FALLBACK_NOTE = "catches what is not named";

function metaOf(record: CategoryRecord): string {
  const parts = [CATEGORY_KIND_LABEL[record.kind]];
  parts.push(record.masterId ? SEEDED_NOTE : OWN_NOTE);

  if (isFallback(record)) {
    parts.push(FALLBACK_NOTE);
  }
  return parts.join(" · ");
}

/**
 * Nothing points at a category yet — there are no transactions and no budgets
 * in the backend to point with — so the one rule left is the one this app owns:
 * the bucket the add-transaction sheet hangs "name this category" on cannot be
 * the thing you delete.
 */
function removalOf(record: CategoryRecord): CategoryRemoval {
  if (isFallback(record)) {
    return { canRemove: false, reason: FALLBACK_REASON };
  }
  return { canRemove: true, reason: "" };
}

function toRow(record: CategoryRecord, index: number): CategoryRow {
  const step = stepOf(record, index);
  const icon = iconOf(record);

  return {
    id: record.id,
    name: record.name,
    icon,
    step,
    meta: metaOf(record),
    removal: removalOf(record),
    draft: {
      id: record.id,
      name: record.name,
      kind: record.kind,
      icon,
      color: step,
      isFallback: isFallback(record),
    },
  };
}

/* ── the stats ─────────────────────────────────────────────────────────── */

function statsOf(records: readonly CategoryRecord[]): readonly MiniStat[] {
  const spending = records.filter((record) => record.kind === "expense").length;
  const ownMade = records.filter((record) => record.masterId === "").length;

  return [
    {
      id: "cat-count",
      label: "Categories",
      value: String(records.length),
      tone: "text",
      note: "Every one of them selectable on a transaction",
    },
    {
      id: "cat-spending",
      label: "Spending",
      value: String(spending),
      tone: "text",
      note: "The only kind a budget can be measured against",
    },
    {
      id: "cat-own",
      label: "Added by hand",
      value: String(ownMade),
      tone: ownMade > 0 ? "text" : "muted",
      note: "Named here, rather than seeded with the account",
    },
  ];
}

/* ── the screen ────────────────────────────────────────────────────────── */

/** The step a new category opens on: the first one nothing else is wearing. */
function nextFreeStep(rows: readonly CategoryRow[]): RampStep {
  const taken = new Set(rows.map((row) => row.step));
  return (
    RAMP_STEPS.find((step) => !taken.has(step)) ??
    RAMP_STEPS[rows.length % RAMP_STEPS.length]
  );
}

function blankDraft(rows: readonly CategoryRow[]): CategoryDraft {
  return {
    id: "",
    name: "",
    kind: "expense",
    icon: ICON_BY_CATEGORY_KIND.expense,
    color: nextFreeStep(rows),
    isFallback: false,
  };
}

export type CategoriesScreen = {
  readonly rows: readonly CategoryRow[];
  readonly stats: readonly MiniStat[];
  readonly draft: CategoryDraft;
  /** Why the screen is empty, when the API could not answer at all. */
  readonly error: string;
};

export async function getCategoriesScreen(): Promise<CategoriesScreen> {
  const accessToken = await requireAccessToken();
  const result = await listCategories(accessToken);

  if (!result.ok) {
    return {
      rows: [],
      stats: statsOf([]),
      draft: blankDraft([]),
      error: result.error.message,
    };
  }

  const rows = result.data.map(toRow);
  return { rows, stats: statsOf(result.data), draft: blankDraft(rows), error: "" };
}

/* ── the add-transaction sheet's picker ────────────────────────────────── */

export type CategoryPicker = {
  readonly labels: readonly string[];
  /** The bucket that offers to be named instead of picked. */
  readonly fallback: string;
};

/**
 * The fixture's own names, for when the API cannot be reached.
 *
 * The sheet this feeds saves nothing yet, and every other screen in the app is
 * still summed from that same fixture, so falling back to it keeps the whole
 * mock consistent rather than leaving an empty select behind.
 */
const FIXTURE_PICKER: CategoryPicker = {
  labels: Object.values(CATEGORIES).map((category) => category.label),
  fallback: CATEGORIES.other.label,
};

/**
 * One call for both halves the add-transaction sheet needs: the names to offer,
 * and which of them is the one that asks to be named. Read from the API rather
 * than from a constant, because a category added on the categories screen has
 * to be selectable on the very next transaction.
 */
export async function getCategoryPicker(): Promise<CategoryPicker> {
  const accessToken = await requireAccessToken();
  const result = await listCategories(accessToken);

  if (!result.ok || result.data.length === 0) {
    return FIXTURE_PICKER;
  }

  const fallback = result.data.find(isFallback);
  return {
    labels: result.data.map((record) => record.name),
    fallback: fallback?.name ?? "",
  };
}

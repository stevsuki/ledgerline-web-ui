import type { IconKey } from "@/lib/icon-choice";
import { listCategories, type CategoryRecord } from "@/lib/api/categories";
import { requireAccessToken } from "@/lib/auth/session";
import {
  CATEGORY_KIND_LABEL,
  ICON_BY_CATEGORY_KIND,
  RAMP_STEPS,
} from "@/lib/category-fields";
import type { CategoryKind, MiniStat, ColorKey } from "@/types/ledger";

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
 * It reads `/categories`, which returns two things: the account's own
 * categories, and the shared master rows it has not taken up yet. Nothing is
 * seeded at registration, so a new account holds none of the first and sees all
 * of the second — and the list agrees with what the pickers offer instead of
 * quietly disagreeing with them.
 *
 * A shared row is shown, not held. It cannot be deleted, because there is
 * nothing to delete; editing it takes it up first, and then it is the
 * account's like any other.
 */

/* ── resolving the two defaults ────────────────────────────────────────── */

/**
 * A category wears its own tile; failing that, its kind's.
 *
 * The seeded ones are given theirs by `SeedDefaults`, copied off the master row,
 * so only a category named by hand before the icon column existed reaches the
 * second line.
 */
function iconOf(record: CategoryRecord): IconKey {
  return record.icon === "" ? ICON_BY_CATEGORY_KIND[record.kind] : record.icon;
}

/**
 * Its step of the ramp, by the same order of preference — and, for a category
 * named by hand before the colour column existed, the next step round.
 *
 * That last step is the weak one: past seven categories two of them share a
 * step, and two slices of one colour cannot be told apart. It is the reason the
 * editor asks for a colour rather than counting one out.
 */
function stepOf(record: CategoryRecord, index: number): ColorKey {
  if (record.color !== "") {
    return record.color;
  }
  return RAMP_STEPS[index % RAMP_STEPS.length];
}

/* ── the row ───────────────────────────────────────────────────────────── */

/** What the editor opens with. A blank id is a category that does not exist yet. */
export type CategoryDraft = {
  readonly id: string;
  readonly name: string;
  readonly kind: CategoryKind;
  readonly icon: IconKey;
  readonly color: ColorKey;
};

/** Why a category cannot be removed — said in the sheet, beside the button. */
export type CategoryRemoval = {
  readonly canRemove: boolean;
  readonly reason: string;
};

export type CategoryRow = {
  readonly id: string;
  readonly name: string;
  readonly icon: IconKey;
  readonly step: ColorKey;
  /** "Built-in" or "Custom" — where the name came from, in one word. */
  readonly origin: string;
  /** "Expense" or "Income" — all that is still recorded about a row's origin. */
  readonly meta: string;
  readonly removal: CategoryRemoval;
  readonly draft: CategoryDraft;
};

const SHARED_NOTE = "from the shared list, not yet yours";

/**
 * Where a row the account holds came from is not recorded — a category taken up
 * from the shared list is a plain copy of it. What the line can still say is
 * which way it runs, and whether it is held at all.
 */
function metaOf(record: CategoryRecord): string {
  const kind = CATEGORY_KIND_LABEL[record.kind];
  return record.isOwn ? kind : `${kind} · ${SHARED_NOTE}`;
}

const SHARED_REASON =
  "This one is offered to every account and is not yours yet, so there is nothing here to remove. Edit it and it becomes yours.";

/**
 * Only what the account holds can be removed. A shared row has no row of its
 * own behind it; taking it off the list would mean hiding it, which nothing
 * records.
 *
 * A second rule will end up here. Transactions and budgets both point at
 * categories, and one still in use should say so rather than disappear from
 * under them — but the list states no usage count, so that check has nothing to
 * read yet. The backend's `ON DELETE RESTRICT` is what holds the line for now.
 */
function removalOf(record: CategoryRecord): CategoryRemoval {
  if (!record.isOwn) {
    return { canRemove: false, reason: SHARED_REASON };
  }
  return { canRemove: true, reason: "" };
}

const BUILT_IN = "Built-in";
const CUSTOM = "Custom";

function toRow(record: CategoryRecord, index: number): CategoryRow {
  const step = stepOf(record, index);
  const icon = iconOf(record);

  return {
    id: record.id,
    name: record.name,
    icon,
    step,
    origin: record.isBuiltIn ? BUILT_IN : CUSTOM,
    meta: metaOf(record),
    removal: removalOf(record),
    draft: {
      id: record.id,
      name: record.name,
      kind: record.kind,
      icon,
      color: step,
    },
  };
}

/* ── the stats ─────────────────────────────────────────────────────────── */

function statsOf(records: readonly CategoryRecord[]): readonly MiniStat[] {
  const spending = records.filter((record) => record.kind === "expense").length;
  const earning = records.filter((record) => record.kind === "income").length;
  const own = records.filter((record) => record.isOwn).length;

  return [
    {
      id: "cat-count",
      label: "Categories",
      value: String(records.length),
      tone: "text",
      note:
        own === records.length
          ? "Every one of them selectable on a transaction"
          : `${own} yours, the rest offered from the shared list`,
    },
    {
      id: "cat-spending",
      label: "Spending",
      value: String(spending),
      tone: "text",
      note: "The only kind a budget can be measured against",
    },
    {
      id: "cat-earning",
      label: "Earning",
      value: String(earning),
      tone: earning > 0 ? "text" : "muted",
      note: "What money coming in can be filed under",
    },
  ];
}

/* ── the screen ────────────────────────────────────────────────────────── */

/** The step a new category opens on: the first one nothing else is wearing. */
function nextFreeStep(rows: readonly CategoryRow[]): ColorKey {
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

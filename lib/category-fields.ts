import type { IconName } from "@/components/ui/icon-sprite";
import { withCurrent, type IconKey } from "@/lib/icon-choice";
import { isHexColor } from "@/lib/tone";
import type {
  CategoryKind,
  ColorKey,
  HexColor,
  RampStep,
  SelectChoice,
} from "@/types/ledger";

/**
 * The category form's contract, kept outside `lib/data/` so the client half of
 * the editor can read it — the same reason `lib/wallet-fields.ts` and
 * `lib/budget-fields.ts` sit here.
 *
 * Every name below is the shape `POST /categories` takes, so a rejected save
 * lands on the field that caused it with no translation table in between to
 * fall out of date.
 */

export const CATEGORY_FIELD = {
  id: "id",
  name: "name",
  kind: "type",
  icon: "icon",
  color: "color",
} as const;

/** `binding:"required,min=2,max=40"` — a category name is a label, not a note. */
export const CATEGORY_NAME_MIN_LENGTH = 2;
export const CATEGORY_NAME_MAX_LENGTH = 40;

/* ── the kind ──────────────────────────────────────────────────────────── */

/** The kinds in the order the Type select offers them. */
export const CATEGORY_KIND_ORDER: readonly CategoryKind[] = [
  "expense",
  "income",
];

export const CATEGORY_KIND_LABEL: Readonly<Record<CategoryKind, string>> = {
  expense: "Expense",
  income: "Income",
};

export const CATEGORY_KIND_OPTIONS: readonly SelectChoice[] =
  CATEGORY_KIND_ORDER.map((kind) => ({
    value: kind,
    label: CATEGORY_KIND_LABEL[kind],
  }));

/** A `<select>` hands back a string; this is how it becomes a `CategoryKind`. */
export function parseCategoryKind(value: string): CategoryKind {
  return CATEGORY_KIND_ORDER.find((kind) => kind === value) ?? "expense";
}

/* ── the icon ──────────────────────────────────────────────────────────── */

/**
 * The tile a category of each kind wears when it has none of its own. The
 * picker starts here and follows the Type select until someone chooses a tile
 * themselves, exactly as the wallet sheet follows its own Type select.
 */
export const ICON_BY_CATEGORY_KIND: Readonly<Record<CategoryKind, IconName>> = {
  expense: "bag",
  income: "bank",
};

/**
 * The tiles the category picker offers: the seven the seeded categories already
 * wear, plus the few a new one is most likely to want — a bank and a mail slip
 * for money coming in, a gift, a globe for travel, people for anything shared,
 * a target for a category kept on purpose, and the tag itself.
 */
export const CATEGORY_ICON_CHOICES: readonly IconName[] = [
  "home",
  "cup",
  "car",
  "monitor",
  "wifi",
  "heart",
  "bag",
  "bank",
  "mail",
  "gift",
  "globe",
  "users",
  "target",
  "tag",
];

/** The shortlist, plus whatever this category is already wearing. */
export function categoryIconChoices(current: IconKey): readonly IconKey[] {
  return withCurrent(CATEGORY_ICON_CHOICES, current);
}

/* ── the colour ────────────────────────────────────────────────────────── */

/**
 * The seven-step ramp, offered as a choice rather than derived from position.
 *
 * The artboard could map a category onto the ramp by where it sat in a list of
 * exactly seven; a master list anyone can add to cannot. Storing the step is
 * what keeps a donut slice the same colour after a category is added above it
 * — which is also why `color` is asked for here and sent to the backend rather
 * than computed on the way to the chart.
 */
export const RAMP_STEPS: readonly RampStep[] = [
  "c1",
  "c2",
  "c3",
  "c4",
  "c5",
  "c6",
  "c7",
];

/** What a swatch is called to a screen reader: its position, not its hue. */
export function rampStepLabel(step: RampStep): string {
  return `Colour ${step.slice(1)}`;
}

/** What the colour well opens on before anybody has chosen a colour. */
export const DEFAULT_CUSTOM_COLOR: HexColor = "#8c9eff";

/**
 * What a form posted, as a colour this app can paint — a step of the ramp or
 * a `#rrggbb` of the person's own. The same contract `iconNameOrBlank` holds
 * for an icon: `""` is the column's way of saying "no colour of its own", and
 * only the read path resolves it.
 */
export function colorOrBlank(value: string): ColorKey | "" {
  const hex = value.toLowerCase();
  if (isHexColor(hex)) {
    return hex;
  }
  return RAMP_STEPS.find((step) => step === value) ?? "";
}

import type { IconName } from "@/components/ui/icon-sprite";
import { withCurrent } from "@/lib/icon-choice";
import type { CategoryKey } from "@/types/ledger";

/**
 * The budget form's contract, kept outside `lib/data/` so the client half of
 * the editor can read it — the same reason `lib/wallet-fields.ts` sits here.
 *
 * Every name is the shape a `POST /budgets` will take when there is one, so a
 * validation error can land on the field that caused it without a translation
 * table in between to fall out of date.
 */
export const BUDGET_FIELD = {
  id: "id",
  category: "category",
  icon: "icon",
  limit: "monthly_limit",
  threshold: "alert_threshold",
  /**
   * The threshold's escape hatch. The presets post `alert_threshold` directly;
   * picking "Custom" posts the sentinel there and the typed figure here, so
   * exactly one field carries the answer either way.
   */
  thresholdCustom: "alert_threshold_custom",
  rollover: "rollover",
} as const;

/** What the Custom segment posts as `alert_threshold`. */
export const CUSTOM_THRESHOLD = "custom";

/**
 * The one-tap thresholds, as ratios.
 *
 * These are the values the budgets actually use rather than a round-numbered
 * guess: the artboard offered 70% — which nothing used — and had no way at all
 * to reach the 75% Utilities was already set to. Anything else is Custom now,
 * so the list no longer has to try to cover every case.
 */
export const THRESHOLD_PRESETS: readonly number[] = [0.75, 0.8, 0.9];

export function isPreset(ratio: number): boolean {
  return THRESHOLD_PRESETS.includes(ratio);
}

/* ── the icon ──────────────────────────────────────────────────────────── */

/**
 * The tile a category wears when the budget has none of its own.
 *
 * A copy of what `CATEGORIES` already says, and deliberately so: the editor
 * re-reads this on every change of the Category select, and a client component
 * may never import `lib/data/`. It is the same trade `ICON_BY_KIND` makes for
 * wallets. The keys are `CategoryKey`, so dropping a category makes this fail
 * to compile rather than quietly lose a tile.
 */
export const ICON_BY_CATEGORY: Readonly<Record<CategoryKey, IconName>> = {
  housing: "home",
  food: "cup",
  transport: "car",
  subs: "monitor",
  utilities: "wifi",
  health: "heart",
  other: "bag",
  // Income is never budgeted; the key exists so the record stays exhaustive.
  income: "bank",
};

/**
 * The tiles the budget picker offers: every category's default, plus four that
 * say something a category cannot — a gift for a giving budget, a globe for
 * travel, people for anything shared, a target for a budget kept on purpose.
 */
export const BUDGET_ICON_CHOICES: readonly IconName[] = [
  "home",
  "cup",
  "car",
  "monitor",
  "wifi",
  "heart",
  "bag",
  "gift",
  "globe",
  "users",
  "target",
];

/** The shortlist, plus whatever this budget is already wearing. */
export function budgetIconChoices(current: IconName): readonly IconName[] {
  return withCurrent(BUDGET_ICON_CHOICES, current);
}

/** A category is budgetable when a transaction can actually be filed under it. */
export function isSpendCategory(key: string): key is CategoryKey {
  return key in ICON_BY_CATEGORY && key !== "income";
}

/**
 * The budget form's contract, kept outside `lib/data/` so the client half of
 * the editor can read it — the same reason `lib/wallet-fields.ts` sits here.
 *
 * Every name is the backend's own json tag, so a rejected save lands on the
 * field that caused it: the API keys its `errors` array by the tag, and
 * `failureState` keys its map by the input's `name`, with no translation table
 * in between to fall out of date.
 */
export const BUDGET_FIELD = {
  id: "id",
  category: "category_id",
  limit: "monthly_limit",
  threshold: "alert_threshold_percent",
  /**
   * The threshold's escape hatch. The presets post `alert_threshold_percent`
   * directly; picking "Custom" posts the sentinel there and the typed figure
   * here, so exactly one field carries the answer either way.
   *
   * This one is the form's own — the backend never sees it.
   */
  thresholdCustom: "alert_threshold_custom",
  rollover: "rollover",
  isFixed: "is_fixed",
} as const;

/** What the Custom segment posts as the threshold. */
export const CUSTOM_THRESHOLD = "custom";

/**
 * The one-tap thresholds, as ratios.
 *
 * These are the values budgets actually use rather than a round-numbered
 * guess: the artboard offered 70% — which nothing used — and had no way at all
 * to reach the 75% Utilities was already set to. Anything else is Custom now,
 * so the list no longer has to try to cover every case.
 */
export const THRESHOLD_PRESETS: readonly number[] = [0.75, 0.8, 0.9];

export function isPreset(ratio: number): boolean {
  return THRESHOLD_PRESETS.includes(ratio);
}

/**
 * A fixed commitment alerts at its whole limit and nowhere else.
 *
 * The database says so too — `budgets_fixed_threshold_check` refuses any other
 * value on a fixed row — so the editor hides the control and posts this rather
 * than leaving the field out and having the write rejected.
 */
export const FIXED_THRESHOLD_PERCENT = 100;

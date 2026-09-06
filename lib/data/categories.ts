import type { Category, CategoryKey, RampStep } from "@/types/ledger";

/** The artboard's `CATS` map (Finance App.dc.html, lines ~1494-1503). */
export const CATEGORIES: Readonly<Record<CategoryKey, Category>> = {
  housing: { key: "housing", label: "Housing", icon: "home" },
  food: { key: "food", label: "Food & drink", icon: "cup" },
  transport: { key: "transport", label: "Transport", icon: "car" },
  subs: { key: "subs", label: "Subscriptions", icon: "monitor" },
  utilities: { key: "utilities", label: "Utilities", icon: "wifi" },
  health: { key: "health", label: "Health", icon: "heart" },
  other: { key: "other", label: "Other", icon: "bag" },
  income: { key: "income", label: "Client income", icon: "bank" },
};

/*
 * The names a transaction can be filed under are no longer listed here: they
 * are whatever the master list holds, which is editable. `categoryLabels()` in
 * `lib/data/category-list.ts` answers for it — this file stays the artboard's
 * fixture, the thing the ledger and the store are both seeded from.
 */

/** Spending categories map onto the ramp positionally, in the donut's own order. */
export const RAMP_BY_CATEGORY_LABEL: Readonly<Record<string, RampStep>> = {
  Housing: "c1",
  "Food & drink": "c2",
  Transport: "c3",
  Subscriptions: "c4",
  Utilities: "c5",
  Health: "c6",
  Other: "c7",
};

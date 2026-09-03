import type { IconName } from "@/components/ui/icon-sprite";
import type { CategoryKey } from "@/types/ledger";

/**
 * Where a budget is kept.
 *
 * There is no `/budgets` endpoint yet, so this is the seed plus whatever the
 * editor has changed since the server started. It is the one mutable thing in
 * `lib/data/`, which is why it is its own module: `budgets.ts` stays a pure
 * derivation over whatever this hands back, and the day the endpoint exists
 * only the four functions below are replaced.
 *
 * Being in memory, an edit lives as long as the server process. That is enough
 * to see the whole chain move — change a threshold and the row, the attention
 * list and the dashboard panel all follow — and it is stated here rather than
 * implied so nobody mistakes it for storage.
 */

/**
 * A budget as it is stored: a limit somebody chose, and the category it is
 * measured against. What it has *spent* is never here — that is the ledger's
 * answer, and storing it is what let the artboard's two halves disagree.
 */
export type BudgetLimit = {
  readonly category: CategoryKey;
  readonly limit: number;
  /** The share of the limit this budget starts warning at. */
  readonly threshold: number;
  /**
   * A tile of its own, or `""` for "no icon of its own" — the same contract
   * `roles.icon` and `wallets.icon` hold. Only the read path resolves it, and
   * for a budget it resolves to the category's own tile.
   */
  readonly icon: IconName | "";
  /** Whether what is unspent carries into next cycle. */
  readonly rollover: boolean;
  /**
   * A single fixed payment rather than a running spend — rent, an insurance
   * premium. It goes from nothing to its whole limit in one transaction, so it
   * has no approach to warn about: a threshold on it would fire every month,
   * for ever, with nothing to do about it. Only going *over* means anything,
   * and on a fixed commitment that means the amount itself changed.
   */
  readonly isFixed: boolean;
};

/** The artboard's `B` fixture, with its `spent` column dropped as derivable. */
const SEED: readonly BudgetLimit[] = [
  { category: "housing", limit: 4_500_000, threshold: 1, icon: "", rollover: false, isFixed: true },
  { category: "food", limit: 3_000_000, threshold: 0.8, icon: "", rollover: false, isFixed: false },
  { category: "transport", limit: 1_800_000, threshold: 0.8, icon: "", rollover: false, isFixed: false },
  { category: "subs", limit: 1_000_000, threshold: 0.8, icon: "", rollover: false, isFixed: false },
  { category: "utilities", limit: 1_200_000, threshold: 0.75, icon: "", rollover: true, isFixed: false },
  { category: "health", limit: 1_200_000, threshold: 0.8, icon: "", rollover: false, isFixed: false },
];

/**
 * Keyed by category, because that is what makes a budget the budget it is:
 * two budgets for Food & drink would each be measured against the same spend.
 */
const budgets = new Map<CategoryKey, BudgetLimit>(
  SEED.map((budget) => [budget.category, budget]),
);

/** Every budget, in the order the categories are declared in. */
export function listBudgetLimits(): readonly BudgetLimit[] {
  return [...budgets.values()];
}

export function findBudgetLimit(category: CategoryKey): BudgetLimit | undefined {
  return budgets.get(category);
}

/** Writes a budget, whether it existed before or not. */
export function saveBudgetLimit(budget: BudgetLimit): void {
  budgets.set(budget.category, budget);
}

export function deleteBudgetLimit(category: CategoryKey): void {
  budgets.delete(category);
}

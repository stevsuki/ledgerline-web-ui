import { formatPercent, formatRupiah, toTrackWidth } from "@/lib/format";
import type { Budget, Tone } from "@/types/ledger";

/** The artboard's `B` fixture (Finance App.dc.html, lines ~1991-1998). */
const BUDGETS: readonly Budget[] = [
  { id: "bud-housing", label: "Housing", icon: "home", spent: 4500000, limit: 4500000, threshold: "90%" },
  { id: "bud-food", label: "Food & drink", icon: "cup", spent: 2640000, limit: 3000000, threshold: "80%" },
  { id: "bud-transport", label: "Transport", icon: "car", spent: 1380000, limit: 1800000, threshold: "80%" },
  { id: "bud-subs", label: "Subscriptions", icon: "monitor", spent: 1180000, limit: 1000000, threshold: "80%" },
  { id: "bud-utilities", label: "Utilities", icon: "wifi", spent: 980000, limit: 1200000, threshold: "75%" },
  { id: "bud-health", label: "Health", icon: "heart", spent: 740000, limit: 1200000, threshold: "80%" },
];

/** Above this share of the limit the row turns amber. */
const NEAR_LIMIT = 0.85;

export type BudgetRow = {
  readonly id: string;
  readonly label: string;
  readonly icon: Budget["icon"];
  readonly threshold: string;
  readonly tone: Tone;
  readonly isOver: boolean;
  readonly width: string;
  readonly spent: string;
  readonly limit: string;
  readonly remaining: string;
  readonly status: string;
};

function toneFor(ratio: number): Tone {
  if (ratio > 1) {
    return "expense";
  }
  if (ratio >= NEAR_LIMIT) {
    return "warn";
  }
  return "text";
}

function toRow(budget: Budget): BudgetRow {
  const ratio = budget.spent / budget.limit;
  const isOver = ratio > 1;
  const overBy = budget.spent - budget.limit;

  return {
    id: budget.id,
    label: budget.label,
    icon: budget.icon,
    threshold: budget.threshold,
    tone: toneFor(ratio),
    isOver,
    width: toTrackWidth(ratio),
    spent: formatRupiah(budget.spent),
    limit: formatRupiah(budget.limit),
    remaining: isOver
      ? `${formatRupiah(overBy)} over`
      : `${formatRupiah(-overBy)} left`,
    status: isOver ? "Over limit" : formatPercent(ratio),
  };
}

export async function getBudgets(): Promise<readonly BudgetRow[]> {
  return BUDGETS.map(toRow);
}

/** The dashboard's Budgets panel shows the first five. */
export async function getBudgetsPreview(): Promise<readonly BudgetRow[]> {
  return BUDGETS.slice(0, 5).map(toRow);
}

export const BUDGET_ALLOCATION = {
  total: "Rp12.700.000",
  categoryCount: "across 6 categories",
  spentNote: "Rp11.420.000 spent · 90% of allocation",
  cycleNote: "4 days left in cycle",
} as const;

/** Split into runs so the emphasised figure stays inside the sentence. */
export const BUDGET_ATTENTION: readonly {
  readonly id: string;
  readonly tone: Tone;
  readonly parts: readonly { readonly text: string; readonly strong?: boolean }[];
}[] = [
  {
    id: "attn-subs",
    tone: "expense",
    parts: [
      { text: "Subscriptions is " },
      { text: "Rp180.000 over", strong: true },
      { text: " its limit." },
    ],
  },
  {
    id: "attn-food",
    tone: "warn",
    parts: [{ text: "Food & drink at 88% with 4 days remaining." }],
  },
];

export const NEW_BUDGET_CATEGORIES = [
  "Education",
  "Travel",
  "Gifts & donations",
  "Custom…",
] as const;

export const BUDGET_THRESHOLDS = ["70%", "80%", "90%"] as const;

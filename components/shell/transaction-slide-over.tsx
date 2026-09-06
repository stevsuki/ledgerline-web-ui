"use client";

import { useState } from "react";

import { useAppChrome } from "@/components/shell/app-chrome";
import { SlideOver } from "@/components/ui/slide-over";
import { CATEGORY_NAME_MAX_LENGTH } from "@/lib/category-fields";
import { cx } from "@/lib/tone";

const QUICK_AMOUNTS = ["25.000", "62.000", "150.000", "425.000"] as const;

type TransactionKind = "expense" | "income";

const INCOME_IMPACT =
  "Adds to August income and lifts your savings rate above 41%.";

/**
 * How full the budget for this category is, or "" when none is measured against
 * it.
 *
 * The categories come from the API and the budgets are still a fixture, so the
 * two lists agree on spelling more often than not — "Food & Drink" against the
 * artboard's "Food & drink" — and a case-insensitive match is what carries the
 * ones that do. Anything left over genuinely has no budget, and the line says
 * so rather than printing a dash.
 */
function budgetWidthFor(
  budgetWidths: Readonly<Record<string, string>>,
  category: string,
): string {
  const exact = budgetWidths[category];
  if (exact) {
    return exact;
  }

  const wanted = category.toLowerCase();
  const found = Object.entries(budgetWidths).find(
    ([label]) => label.toLowerCase() === wanted,
  );
  return found?.[1] ?? "";
}

/**
 * What the impact line says, unwound rather than nested: income, spending that
 * is naming a category of its own, and spending filed under an existing one.
 */
function impactOf(
  kind: TransactionKind,
  category: string,
  newCategory: string,
  budgetWidths: Readonly<Record<string, string>>,
): string {
  if (kind === "income") {
    return INCOME_IMPACT;
  }
  if (newCategory !== "") {
    return `Files under ${newCategory}, which this transaction creates — nothing is budgeted against it yet.`;
  }

  const width = budgetWidthFor(budgetWidths, category);
  if (width === "") {
    return `Counts against ${category}. No budget is measured against it yet.`;
  }
  return `Counts against ${category} — that budget sits at ${width} of its limit.`;
}

export function TransactionSlideOver({
  categories,
  fallbackCategory,
  wallets,
  budgetWidths,
  today,
}: {
  readonly categories: readonly string[];
  /** The bucket that offers to be named instead — "Other". */
  readonly fallbackCategory: string;
  readonly wallets: readonly string[];
  /** Category label → how full that budget is, for the impact line. */
  readonly budgetWidths: Readonly<Record<string, string>>;
  readonly today: string;
}) {
  const { isTransactionOpen, closeTransaction, showToast } = useAppChrome();

  const [kind, setKind] = useState<TransactionKind>("expense");
  const [amount, setAmount] = useState("62.000");
  // The first of whatever the list holds, rather than a name typed in here: the
  // categories are the account's own now, and a hard-coded default would leave
  // the select showing one thing and this state holding another.
  const [category, setCategory] = useState(categories[0] ?? "");
  const [customName, setCustomName] = useState("");
  const [wallet, setWallet] = useState("GoPay");
  const [isRecurring, setRecurring] = useState(false);

  function save() {
    closeTransaction();
    showToast(`Transaction saved to ${wallet}`);
  }

  // Only the fallback offers to be named, and only a name that was actually
  // typed counts — an empty box means this one really is just Other.
  const isNaming = category === fallbackCategory;
  const newCategory = isNaming ? customName.trim() : "";
  const impact = impactOf(kind, category, newCategory, budgetWidths);

  return (
    <SlideOver
      open={isTransactionOpen}
      onClose={closeTransaction}
      title="Add transaction"
      subtitle={today}
      footer={
        <>
          <button type="button" className="btn btn-primary flex-1" onClick={save}>
            Save transaction
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={closeTransaction}
          >
            Cancel
          </button>
        </>
      }
    >
      <div className="seg w-full" role="group" aria-label="Transaction type">
        <KindOption
          kind="expense"
          label="Expense"
          current={kind}
          onSelect={setKind}
        />
        <KindOption
          kind="income"
          label="Income"
          current={kind}
          onSelect={setKind}
        />
      </div>

      <div>
        <span className="panel-kicker">Amount</span>
        <div className="border-divider mt-2 flex min-w-0 items-baseline gap-2 border-b pb-2.5">
          <span className="text-muted text-base">Rp</span>
          <input
            data-autofocus
            aria-label="Amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-heading)] text-[30px] font-semibold tracking-[-0.03em] tabular-nums outline-none"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((value) => (
            <button
              key={value}
              type="button"
              className="btn btn-secondary text-note"
              onClick={() => setAmount(value)}
            >
              Rp{value}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="tx-category">Category</label>
        <select
          id="tx-category"
          className="input"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          {categories.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/*
        Other is the one category that can be told what it really is. Naming it
        here is the same act as adding one on the categories screen — it joins
        the master list, so the next transaction can pick it by name.
      */}
      {isNaming ? (
        <div>
          <div className="field">
            <label htmlFor="tx-category-name">Name this category</label>
            <input
              id="tx-category-name"
              className="input"
              value={customName}
              maxLength={CATEGORY_NAME_MAX_LENGTH}
              placeholder="Course fees"
              onChange={(event) => setCustomName(event.target.value)}
            />
          </div>
          <p className="text-meta text-muted mt-1.5">
            Kept in Categories from here on. Leave it blank to file this one
            under {fallbackCategory}.
          </p>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="tx-wallet">Wallet</label>
        <select
          id="tx-wallet"
          className="input"
          value={wallet}
          onChange={(event) => setWallet(event.target.value)}
        >
          {wallets.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="field">
          <label htmlFor="tx-date">Date</label>
          <input id="tx-date" className="input" type="date" defaultValue="2026-08-27" />
        </div>
        <div className="field">
          <label htmlFor="tx-time">Time</label>
          <input id="tx-time" className="input" type="time" defaultValue="19:40" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="tx-note">Note</label>
        <textarea
          id="tx-note"
          className="input"
          rows={3}
          placeholder="Merchant, project or reference"
        />
      </div>

      <label className="radio w-full justify-between text-[13px]" htmlFor="tx-repeat">
        <span>Repeat this every month</span>
        <input
          id="tx-repeat"
          type="checkbox"
          checked={isRecurring}
          onChange={(event) => setRecurring(event.target.checked)}
        />
        <span className="dot" />
      </label>

      {isRecurring ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label htmlFor="tx-frequency">Frequency</label>
            <select id="tx-frequency" className="input" defaultValue="Monthly">
              <option>Monthly</option>
              <option>Weekly</option>
              <option>Annual</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="tx-ends">Ends</label>
            <select id="tx-ends" className="input" defaultValue="Never">
              <option>Never</option>
              <option>After 12 times</option>
              <option>On a date</option>
            </select>
          </div>
        </div>
      ) : null}

      <p className="text-muted text-note">{impact}</p>
    </SlideOver>
  );
}

function KindOption({
  kind,
  label,
  current,
  onSelect,
}: {
  readonly kind: TransactionKind;
  readonly label: string;
  readonly current: TransactionKind;
  readonly onSelect: (next: TransactionKind) => void;
}) {
  return (
    <label className={cx("seg-opt", "flex-1 justify-center")}>
      <input
        type="radio"
        name="tx-kind"
        value={kind}
        checked={current === kind}
        onChange={() => onSelect(kind)}
      />
      {label}
    </label>
  );
}

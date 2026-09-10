"use client";

import { useActionState, useId, useState } from "react";

import { FormBanner } from "@/components/auth/form-feedback";
import { useAppChrome } from "@/components/shell/app-chrome";
import { SlideOver } from "@/components/ui/slide-over";
import { IDLE_AUTH_STATE, type AuthFormState } from "@/lib/auth/form-state";
import { CATEGORY_NAME_MAX_LENGTH } from "@/lib/category-fields";
import { saveTransactionAction } from "@/lib/transactions/actions";
import { cx } from "@/lib/tone";

const QUICK_AMOUNTS = ["25.000", "62.000", "150.000", "425.000"] as const;

type TransactionKind = "expense" | "income";

/** A category or wallet as the sheet posts it: the id it sends, the name shown. */
type Option = { readonly id: string; readonly name: string };

const INCOME_IMPACT =
  "Adds to August income and lifts your savings rate above 41%.";

const NO_ERRORS: Readonly<Record<string, string>> = {};

/**
 * How full the budget for this category is, or "" when none is measured against
 * it. The categories are the account's own and the budgets are still a fixture,
 * so a case-insensitive match on the name is what carries the ones that line up.
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

function saveLabel(isPending: boolean): string {
  return isPending ? "Saving…" : "Save transaction";
}

export function TransactionSlideOver({
  categories,
  fallbackCategoryId,
  fallbackCategoryName,
  wallets,
  budgetWidths,
  today,
  todayIso,
}: {
  readonly categories: readonly Option[];
  /** The bucket that offers to be named instead of picked — "Other". */
  readonly fallbackCategoryId: string;
  readonly fallbackCategoryName: string;
  readonly wallets: readonly Option[];
  /** Category name → how full that budget is, for the impact line. */
  readonly budgetWidths: Readonly<Record<string, string>>;
  readonly today: string;
  /** Today as an ISO day, for the date field's default. */
  readonly todayIso: string;
}) {
  const { isTransactionOpen, closeTransaction, showToast } = useAppChrome();
  const formId = useId();

  const [state, formAction, isSaving] = useActionState(
    async (previousState: AuthFormState, formData: FormData) => {
      const next = await saveTransactionAction(previousState, formData);
      if (next.notice) {
        closeTransaction();
        showToast(next.notice);
      }
      return next;
    },
    IDLE_AUTH_STATE,
  );

  return (
    <SlideOver
      open={isTransactionOpen}
      onClose={closeTransaction}
      title="Add transaction"
      subtitle={today}
      footer={
        <>
          <button
            type="submit"
            form={formId}
            disabled={isSaving}
            className="btn btn-primary flex-1"
          >
            {saveLabel(isSaving)}
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
      {/* Keyed on the open flag so each time the sheet opens it starts clean. */}
      <TransactionFields
        key={String(isTransactionOpen)}
        formId={formId}
        formAction={formAction}
        fieldErrors={isTransactionOpen ? state.fieldErrors : NO_ERRORS}
        bannerError={isTransactionOpen ? state.error : ""}
        categories={categories}
        fallbackCategoryId={fallbackCategoryId}
        fallbackCategoryName={fallbackCategoryName}
        wallets={wallets}
        budgetWidths={budgetWidths}
        todayIso={todayIso}
      />
    </SlideOver>
  );
}

function TransactionFields({
  formId,
  formAction,
  fieldErrors,
  bannerError,
  categories,
  fallbackCategoryId,
  fallbackCategoryName,
  wallets,
  budgetWidths,
  todayIso,
}: {
  readonly formId: string;
  readonly formAction: (formData: FormData) => void;
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly bannerError: string;
  readonly categories: readonly Option[];
  readonly fallbackCategoryId: string;
  readonly fallbackCategoryName: string;
  readonly wallets: readonly Option[];
  readonly budgetWidths: Readonly<Record<string, string>>;
  readonly todayIso: string;
}) {
  const [kind, setKind] = useState<TransactionKind>("expense");
  const [amount, setAmount] = useState("62.000");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [customName, setCustomName] = useState("");
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? "");

  // Only the fallback offers to be named, and only a name actually typed counts.
  const isNaming = categoryId !== "" && categoryId === fallbackCategoryId;
  const newCategory = isNaming ? customName.trim() : "";
  const categoryName =
    categories.find((option) => option.id === categoryId)?.name ?? "";
  const impact = impactOf(kind, categoryName, newCategory, budgetWidths);

  return (
    <form id={formId} action={formAction} className="flex flex-col gap-4">
      {bannerError ? <FormBanner tone="error" message={bannerError} /> : null}

      <div className="seg w-full" role="group" aria-label="Transaction type">
        <KindOption kind="expense" label="Expense" current={kind} onSelect={setKind} />
        <KindOption kind="income" label="Income" current={kind} onSelect={setKind} />
      </div>

      <div>
        <span className="panel-kicker">Amount</span>
        <div className="border-divider mt-2 flex min-w-0 items-baseline gap-2 border-b pb-2.5">
          <span className="text-muted text-base">Rp</span>
          <input
            data-autofocus
            name="amount"
            aria-label="Amount"
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-heading)] text-[30px] font-semibold tracking-[-0.03em] tabular-nums outline-none"
          />
        </div>
        {fieldErrors.amount ? (
          <p className="text-expense text-meta mt-1.5">{fieldErrors.amount}</p>
        ) : null}
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
        <label htmlFor="tx-name">Description</label>
        <input
          id="tx-name"
          name="name"
          className="input"
          defaultValue=""
          placeholder="Kopi Tuku"
        />
        {fieldErrors.name ? (
          <p className="text-expense text-meta mt-1.5">{fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="tx-category">Category</label>
        <select
          id="tx-category"
          name="category_id"
          className="input"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          {categories.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      {/*
        Other is the one category that can be told what it really is. Naming it
        here is the same act as adding one on the categories screen — it joins
        the list, so the next transaction can pick it by name.
      */}
      {isNaming ? (
        <div>
          <div className="field">
            <label htmlFor="tx-category-name">Name this category</label>
            <input
              id="tx-category-name"
              name="new_category"
              className="input"
              value={customName}
              maxLength={CATEGORY_NAME_MAX_LENGTH}
              placeholder="Course fees"
              onChange={(event) => setCustomName(event.target.value)}
            />
          </div>
          <p className="text-meta text-muted mt-1.5">
            Kept in Categories from here on. Leave it blank to file this one under{" "}
            {fallbackCategoryName}.
          </p>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="tx-wallet">Wallet</label>
        <select
          id="tx-wallet"
          name="wallet_id"
          className="input"
          value={walletId}
          onChange={(event) => setWalletId(event.target.value)}
        >
          {wallets.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="field">
          <label htmlFor="tx-date">Date</label>
          <input
            id="tx-date"
            name="date"
            className="input"
            type="date"
            defaultValue={todayIso}
          />
          {fieldErrors.date ? (
            <p className="text-expense text-meta mt-1.5">{fieldErrors.date}</p>
          ) : null}
        </div>
        <div className="field">
          <label htmlFor="tx-time">Time</label>
          <input id="tx-time" name="time" className="input" type="time" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="tx-note">Note</label>
        <textarea
          id="tx-note"
          name="note"
          className="input"
          rows={3}
          placeholder="Merchant, project or reference"
        />
        {fieldErrors.note ? (
          <p className="text-expense text-meta mt-1.5">{fieldErrors.note}</p>
        ) : null}
      </div>

      {/* The wallet and category ids are on the selects; the type rides on the
          segmented control's radios, all posting under the backend's own tags. */}
      <input type="hidden" name="type" value={kind} />

      <p className="text-muted text-note">{impact}</p>
    </form>
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

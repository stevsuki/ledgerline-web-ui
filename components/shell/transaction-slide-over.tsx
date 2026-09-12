"use client";

import Link from "next/link";
import { useActionState, useId, useState, useTransition } from "react";

import { FormBanner } from "@/components/auth/form-feedback";
import { useAppChrome } from "@/components/shell/app-chrome";
import { Icon } from "@/components/ui/icon";
import { SlideOver } from "@/components/ui/slide-over";
import { IDLE_AUTH_STATE, type AuthFormState } from "@/lib/auth/form-state";
import { CATEGORY_NAME_MAX_LENGTH } from "@/lib/category-fields";
import { createCategoryInlineAction } from "@/lib/categories/actions";
import { formatDayHeading } from "@/lib/dates";
import {
  deleteTransactionAction,
  saveTransactionAction,
} from "@/lib/transactions/actions";
import { cx } from "@/lib/tone";
import type { TransactionDraft } from "@/types/ledger";

const QUICK_AMOUNTS = ["25.000", "62.000", "150.000", "425.000"] as const;

type TransactionKind = "expense" | "income";

/** A category or wallet as the sheet posts it: the id it sends, the name shown. */
type Option = { readonly id: string; readonly name: string };

/** A category carries its direction, because only the matching half is offered. */
type CategoryOption = Option & { readonly kind: TransactionKind };

/** The first category that can carry this direction, or "" when none can. */
function firstCategoryOf(
  categories: readonly CategoryOption[],
  kind: TransactionKind,
): string {
  return categories.find((option) => option.kind === kind)?.id ?? "";
}

const NO_ERRORS: Readonly<Record<string, string>> = {};

/** What the sheet opens on when it is adding rather than correcting. */
const BLANK_DRAFT: TransactionDraft = {
  id: "",
  categoryId: "",
  walletId: "",
  type: "expense",
  amount: "",
  currency: "IDR",
  name: "",
  note: "",
  date: "",
  time: "",
};

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

/** What the impact line says: money in, or spending measured against a limit. */
function impactOf(
  kind: TransactionKind,
  category: string,
  budgetWidths: Readonly<Record<string, string>>,
): string {
  if (kind === "income") {
    return "Counts as money in for the month this date falls in.";
  }

  const width = budgetWidthFor(budgetWidths, category);
  if (width === "") {
    return `Counts against ${category}. No budget is measured against it yet.`;
  }
  return `Counts against ${category} — that budget sits at ${width} of its limit.`;
}

function saveLabel(isEdit: boolean, isPending: boolean): string {
  if (isPending) {
    return "Saving…";
  }
  return isEdit ? "Save changes" : "Save transaction";
}

/** The add sheet is dated today; an edit is dated whatever it is correcting. */
function sheetSubtitle(draft: TransactionDraft, today: string): string {
  return draft.id === "" ? today : `Recorded ${formatDayHeading(draft.date)}`;
}

export function TransactionSlideOver({
  categories,
  wallets,
  budgetWidths,
  today,
  todayIso,
}: {
  readonly categories: readonly CategoryOption[];
  readonly wallets: readonly Option[];
  /** Category name → how full that budget is, for the impact line. */
  readonly budgetWidths: Readonly<Record<string, string>>;
  readonly today: string;
  /** Today as an ISO day, for the date field's default. */
  readonly todayIso: string;
}) {
  const { isTransactionOpen, closeTransaction, editingTransaction, showToast } =
    useAppChrome();
  const formId = useId();
  const [removeError, setRemoveError] = useState("");
  const [isRemoving, startRemoving] = useTransition();

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

  const draft = editingTransaction ?? BLANK_DRAFT;
  const isEdit = draft.id !== "";
  const isBusy = isSaving || isRemoving;

  // One action serves every row, so its state outlives the sheet that failed.
  // A rejected save on one entry must not greet the next one opened, which is
  // what the id echoed back in `values` settles.
  const isCurrent = (state.values.id ?? "") === draft.id;

  /**
   * The sheet stays open until the delete answers: closing first would unmount
   * the transition that is still carrying it.
   */
  function remove() {
    const label = draft.name || "this transaction";
    if (!window.confirm(`Remove ${label} from this ledger?`)) {
      return;
    }

    startRemoving(async () => {
      const error = await deleteTransactionAction(draft.id);
      if (error) {
        setRemoveError(error);
        return;
      }
      closeTransaction();
      showToast("Transaction removed");
    });
  }

  // Nothing can be recorded without somewhere to record it against, and an
  // empty wallet select is a dead end that explains none of that. The sheet
  // still opens — the answer is one step away, so it is offered here rather
  // than left for the reader to find.
  if (wallets.length === 0) {
    return (
      <SlideOver
        open={isTransactionOpen}
        onClose={closeTransaction}
        title="Add transaction"
        subtitle="One thing first"
        footer={
          <>
            <Link
              data-autofocus
              href="/wallets"
              className="btn btn-primary flex-1"
              onClick={closeTransaction}
            >
              Create a wallet
            </Link>
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
        <p className="text-muted text-[13px]">
          Every transaction is paid out of a wallet, and this workspace has none
          yet. Add one — cash, a bank account, an e-wallet — and this sheet is
          ready to use.
        </p>
      </SlideOver>
    );
  }

  return (
    <SlideOver
      open={isTransactionOpen}
      onClose={closeTransaction}
      title={isEdit ? "Edit transaction" : "Add transaction"}
      subtitle={sheetSubtitle(draft, today)}
      footer={
        <>
          <button
            type="submit"
            form={formId}
            disabled={isBusy}
            className="btn btn-primary flex-1"
          >
            {saveLabel(isEdit, isSaving)}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={closeTransaction}
          >
            Cancel
          </button>
          {isEdit ? (
            <button
              type="button"
              disabled={isBusy}
              className="btn btn-ghost text-expense ml-auto"
              onClick={remove}
            >
              {isRemoving ? "Removing…" : "Remove entry"}
            </button>
          ) : null}
        </>
      }
    >
      {/* Keyed on the entry so the fields reset between rows, and each time the
          sheet reopens on a blank one. */}
      <TransactionFields
        key={`${draft.id}-${String(isTransactionOpen)}`}
        formId={formId}
        formAction={formAction}
        fieldErrors={isCurrent ? state.fieldErrors : NO_ERRORS}
        bannerError={removeError || (isCurrent ? state.error : "")}
        draft={draft}
        categories={categories}
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
  draft,
  categories,
  wallets,
  budgetWidths,
  todayIso,
}: {
  readonly formId: string;
  readonly formAction: (formData: FormData) => void;
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly bannerError: string;
  readonly draft: TransactionDraft;
  readonly categories: readonly CategoryOption[];
  readonly wallets: readonly Option[];
  readonly budgetWidths: Readonly<Record<string, string>>;
  readonly todayIso: string;
}) {
  const [kind, setKind] = useState<TransactionKind>(draft.type);
  const [amount, setAmount] = useState(draft.amount);
  const [walletId, setWalletId] = useState(
    draft.walletId || (wallets[0]?.id ?? ""),
  );

  // A category named here is committed before the transaction is, so it exists
  // whatever happens next. It is held locally as well because the select is fed
  // from the layout, which re-reads on its own schedule — this way the new one
  // is selectable the instant it is made.
  const [minted, setMinted] = useState<readonly CategoryOption[]>([]);
  const [isNaming, setNaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState("");
  const [isMinting, startMinting] = useTransition();

  const known = [
    ...categories,
    ...minted.filter((row) => !categories.some((option) => option.id === row.id)),
  ];

  const [categoryId, setCategoryId] = useState(
    draft.categoryId || firstCategoryOf(known, draft.type),
  );

  // The select only holds the half that can carry this direction, so switching
  // direction has to move the selection with it rather than leave it pointing
  // at a category the backend would refuse.
  const offered = known.filter((option) => option.kind === kind);
  function selectKind(next: TransactionKind) {
    setKind(next);
    setCategoryId(firstCategoryOf(known, next));
  }

  function mintCategory() {
    if (newName.trim() === "") {
      return;
    }
    startMinting(async () => {
      const created = await createCategoryInlineAction(newName, kind);
      if (!created.ok) {
        setNameError(created.error);
        return;
      }
      setMinted((rows) => [...rows, created]);
      setCategoryId(created.id);
      setNewName("");
      setNameError("");
      setNaming(false);
    });
  }

  const categoryName =
    categories.find((option) => option.id === categoryId)?.name ?? "";
  const impact = impactOf(kind, categoryName, budgetWidths);

  return (
    <form id={formId} action={formAction} className="flex flex-col gap-4">
      {bannerError ? <FormBanner tone="error" message={bannerError} /> : null}

      <div className="seg w-full" role="group" aria-label="Transaction type">
        <KindOption kind="expense" label="Expense" current={kind} onSelect={selectKind} />
        <KindOption kind="income" label="Income" current={kind} onSelect={selectKind} />
      </div>

      <div>
        <span className="panel-kicker">Amount</span>
        <div className="border-divider mt-2 flex min-w-0 items-baseline gap-2 border-b pb-2.5">
          {/* An entry keeps the currency it arrived in, so the prefix states it. */}
          <span className="text-muted text-base">
            {draft.currency === "IDR" ? "Rp" : draft.currency}
          </span>
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
          required
          defaultValue={draft.name}
          placeholder="Kopi Tuku"
        />
        {fieldErrors.name ? (
          <p className="text-expense text-meta mt-1.5">{fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="tx-category">Category</label>
        <div className="flex items-center gap-2">
          <select
            id="tx-category"
            name="category_id"
            className="input min-w-0 flex-1"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {offered.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          {/* Nothing fits, rather than nothing exists: the way out is beside the
              select rather than on another screen, because leaving this sheet
              to make a category is where a half-typed entry gets abandoned. */}
          <button
            type="button"
            className="btn btn-secondary text-accent text-note flex-none"
            onClick={() => {
              setNaming(true);
              setNameError("");
            }}
          >
            <Icon name="plus" size={14} />
            New
          </button>
        </div>

        {isNaming ? (
          <div className="inset mt-2 flex flex-col gap-2 p-3">
            <label htmlFor="tx-new-category" className="panel-kicker">
              New {kind} category
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                id="tx-new-category"
                className="input min-w-0 flex-1"
                value={newName}
                maxLength={CATEGORY_NAME_MAX_LENGTH}
                placeholder="Course fees"
                onChange={(event) => setNewName(event.target.value)}
                // Enter here would submit the transaction around it, which is
                // not what somebody naming a category just asked for.
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    mintCategory();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-primary text-note flex-none"
                disabled={isMinting}
                onClick={mintCategory}
              >
                {isMinting ? "Creating…" : "Create"}
              </button>
              <button
                type="button"
                className="btn btn-ghost text-note flex-none"
                onClick={() => {
                  setNaming(false);
                  setNameError("");
                }}
              >
                Cancel
              </button>
            </div>
            {nameError ? (
              <p className="text-expense text-meta">{nameError}</p>
            ) : null}
            <p className="text-meta text-muted">
              Kept in Categories from here on. Give it a tile and a colour there
              whenever you like.
            </p>
          </div>
        ) : null}

        {offered.length === 0 && !isNaming ? (
          <p className="text-meta text-muted mt-1.5">
            No {kind} category yet — name the first one with New.
          </p>
        ) : null}
      </div>

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
            defaultValue={draft.date || todayIso}
          />
          {fieldErrors.date ? (
            <p className="text-expense text-meta mt-1.5">{fieldErrors.date}</p>
          ) : null}
        </div>
        <div className="field">
          <label htmlFor="tx-time">Time</label>
          <input
            id="tx-time"
            name="time"
            className="input"
            type="time"
            defaultValue={draft.time}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="tx-note">Note</label>
        {/* Required by the backend, which refuses a blank one on save. */}
        <textarea
          id="tx-note"
          name="note"
          className="input"
          rows={3}
          required
          defaultValue={draft.note}
          placeholder="Merchant, project or reference"
        />
        {fieldErrors.note ? (
          <p className="text-expense text-meta mt-1.5">{fieldErrors.note}</p>
        ) : null}
      </div>

      {/* The wallet and category ids are on the selects; the type rides on the
          segmented control's radios, all posting under the backend's own tags.
          The id is what tells an update from a create — blank means create. */}
      <input type="hidden" name="id" value={draft.id} />
      <input type="hidden" name="currency" value={draft.currency} />
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

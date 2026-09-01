"use client";

import { useState } from "react";

import { useAppChrome } from "@/components/shell/app-chrome";
import { SlideOver } from "@/components/ui/slide-over";
import { cx } from "@/lib/tone";

const QUICK_AMOUNTS = ["25.000", "62.000", "150.000", "425.000"] as const;

type TransactionKind = "expense" | "income";

const INCOME_IMPACT =
  "Adds to August income and lifts your savings rate above 41%.";

export function TransactionSlideOver({
  categories,
  wallets,
  budgetWidths,
  today,
}: {
  readonly categories: readonly string[];
  readonly wallets: readonly string[];
  /** Category label → how full that budget is, for the impact line. */
  readonly budgetWidths: Readonly<Record<string, string>>;
  readonly today: string;
}) {
  const { isTransactionOpen, closeTransaction, showToast } = useAppChrome();

  const [kind, setKind] = useState<TransactionKind>("expense");
  const [amount, setAmount] = useState("62.000");
  const [category, setCategory] = useState("Food & drink");
  const [wallet, setWallet] = useState("GoPay");
  const [isRecurring, setRecurring] = useState(false);

  function save() {
    closeTransaction();
    showToast(`Transaction saved to ${wallet}`);
  }

  const impact =
    kind === "income"
      ? INCOME_IMPACT
      : `Counts against ${category} — that budget sits at ${budgetWidths[category] ?? "—"} of its limit.`;

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

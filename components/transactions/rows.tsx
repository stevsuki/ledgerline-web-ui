import { Icon } from "@/components/ui/icon";
import { IconTile, Tag } from "@/components/ui/primitives";
import { CATEGORIES } from "@/lib/data/categories";
import { formatSignedRupiah } from "@/lib/format";
import { TEXT_TONE, cx } from "@/lib/tone";
import type { Transaction } from "@/types/ledger";

/** A ledger row in its two shapes. */

const AMOUNT_CLASS =
  "font-[family-name:var(--font-heading)] text-row font-semibold tabular-nums";

function toneFor(amount: number) {
  return {
    amount: amount > 0 ? TEXT_TONE.income : TEXT_TONE.text,
    icon: amount > 0 ? ("income" as const) : ("muted" as const),
  };
}

export function RecentTransactionRow({
  transaction,
}: {
  readonly transaction: Transaction;
}) {
  const category = CATEGORIES[transaction.category];
  const tone = toneFor(transaction.amount);
  const [, dayLabel] = transaction.day.split(", ");

  return (
    <li className="panel-row flex items-center gap-3">
      <IconTile name={category.icon} tone={tone.icon} />
      <div className="min-w-0 flex-1">
        <p className="text-row truncate">{transaction.name}</p>
        <p className="text-meta text-muted mt-px">
          {category.label} · {transaction.wallet}
        </p>
      </div>
      <div className="text-right">
        <p className={cx(AMOUNT_CLASS, tone.amount)}>
          {formatSignedRupiah(transaction.amount)}
        </p>
        <p className="text-muted mt-px text-[11px]">{dayLabel}</p>
      </div>
    </li>
  );
}

/** The five-column ledger row. */
export function LedgerRow({
  transaction,
}: {
  readonly transaction: Transaction;
}) {
  const category = CATEGORIES[transaction.category];
  const tone = toneFor(transaction.amount);

  return (
    <li className="panel-row grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[34px_1fr_140px_132px_110px] md:gap-3.5">
      <IconTile name={category.icon} tone={tone.icon} />
      <div className="min-w-0">
        <p className="text-row truncate">{transaction.name}</p>
        <p className="text-meta text-muted mt-px truncate">
          {transaction.note}
        </p>
        <p className="text-meta text-muted mt-px truncate md:hidden">
          {category.label} · {transaction.wallet}
        </p>
      </div>
      <Tag className="hidden justify-self-start md:inline-flex">
        {category.label}
      </Tag>
      <span className="text-muted hidden items-center gap-[7px] text-note md:flex">
        <Icon name={transaction.walletIcon} size={14} />
        {transaction.wallet}
      </span>
      <span className={cx(AMOUNT_CLASS, tone.amount, "text-right")}>
        {formatSignedRupiah(transaction.amount)}
      </span>
    </li>
  );
}

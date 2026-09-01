import { Icon } from "@/components/ui/icon";
import { IconTile, Tag } from "@/components/ui/primitives";
import { CATEGORIES } from "@/lib/data/categories";
import { formatSignedRupiah } from "@/lib/format";
import { TEXT_TONE, cx } from "@/lib/tone";
import type { Transaction } from "@/types/ledger";

/**
 * A ledger row in its two shapes: the dashboard's compact summary and the
 * transactions table's five-column grid. Both read the same tone rules, so an
 * incoming amount looks the same wherever it appears.
 */

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

export function LedgerRow({
  transaction,
}: {
  readonly transaction: Transaction;
}) {
  const category = CATEGORIES[transaction.category];
  const tone = toneFor(transaction.amount);

  return (
    <li className="panel-row grid grid-cols-[34px_1fr_140px_132px_110px] items-center gap-3.5">
      <IconTile name={category.icon} tone={tone.icon} />
      <div className="min-w-0">
        <p className="text-row truncate">{transaction.name}</p>
        <p className="text-meta text-muted mt-px">{transaction.note}</p>
      </div>
      <Tag className="justify-self-start">{category.label}</Tag>
      <span className="text-muted flex items-center gap-[7px] text-note">
        <Icon name={transaction.walletIcon} size={14} />
        {transaction.wallet}
      </span>
      <span className={cx(AMOUNT_CLASS, tone.amount, "text-right")}>
        {formatSignedRupiah(transaction.amount)}
      </span>
    </li>
  );
}

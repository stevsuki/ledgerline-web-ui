import { Icon } from "@/components/ui/icon";
import { IconTile, Tag } from "@/components/ui/primitives";
import { CATEGORIES } from "@/lib/data/categories";
import { formatSignedMoney } from "@/lib/format";
import { TEXT_TONE, cx } from "@/lib/tone";
import type { LedgerItem, Transaction } from "@/types/ledger";

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
          {formatSignedMoney(transaction.amount, transaction.currency)}
        </p>
        <p className="text-muted mt-px text-[11px]">{dayLabel}</p>
      </div>
    </li>
  );
}

/**
 * The five-column ledger row. Unlike the dashboard's recent row, this one is fed
 * from the live API, so its category and wallet are the names the account holds
 * with their icons already resolved — not a fixture key looked up here.
 */
export function LedgerRow({ item }: { readonly item: LedgerItem }) {
  const tone = toneFor(item.amount);

  return (
    <li className="panel-row grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[34px_1fr_140px_132px_110px] md:gap-3.5">
      <IconTile name={item.categoryIcon} tone={tone.icon} />
      <div className="min-w-0">
        <p className="text-row truncate">{item.name}</p>
        <p className="text-meta text-muted mt-px truncate">{item.note}</p>
        <p className="text-meta text-muted mt-px truncate md:hidden">
          {item.categoryName} · {item.walletName}
        </p>
      </div>
      <Tag className="hidden justify-self-start md:inline-flex">
        {item.categoryName}
      </Tag>
      <span className="text-muted hidden items-center gap-[7px] text-note md:flex">
        <Icon name={item.walletIcon} size={14} />
        {item.walletName}
      </span>
      <span className={cx(AMOUNT_CLASS, tone.amount, "text-right")}>
        {formatSignedMoney(item.amount, item.currency)}
      </span>
    </li>
  );
}

import { Icon } from "@/components/ui/icon";
import { IconTile, Tag } from "@/components/ui/primitives";
import { formatSignedMoney } from "@/lib/format";
import { TEXT_TONE, cx } from "@/lib/tone";
import type { LedgerItem, RecentEntry } from "@/types/ledger";

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
  entry,
}: {
  readonly entry: RecentEntry;
}) {
  const tone = toneFor(entry.amount);

  return (
    <li className="panel-row flex items-center gap-3">
      <IconTile name={entry.categoryIcon} tone={tone.icon} />
      <div className="min-w-0 flex-1">
        <p className="text-row truncate">{entry.name}</p>
        <p className="text-meta text-muted mt-px truncate">
          {entry.categoryName} · {entry.walletName}
        </p>
      </div>
      <div className="text-right">
        <p className={cx(AMOUNT_CLASS, tone.amount)}>
          {formatSignedMoney(entry.amount, entry.currency)}
        </p>
        <p className="text-muted mt-px text-[11px]">{entry.dayLabel}</p>
      </div>
    </li>
  );
}

/** The five-column ledger row, from the same live read as the one above. */
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

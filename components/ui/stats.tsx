import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { TEXT_TONE, cx } from "@/lib/tone";
import type { MiniStat, SummaryStat } from "@/types/ledger";

/** The auto-fitting stat strip six screens open with. */
export function StatGrid({
  children,
  minWidth = 200,
}: {
  readonly children: ReactNode;
  readonly minWidth?: number;
}) {
  return (
    <div
      className="stagger grid gap-4"
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minWidth}px), 1fr))`,
      }}
    >
      {children}
    </div>
  );
}

/** The artboard uses three sizes of stat card. */
export type StatSize = "compact" | "regular" | "large";

const STAT_SIZE: Readonly<
  Record<StatSize, { pad: string; value: string; note: string }>
> = {
  // Transactions: 15/18, a 20px value, no note.
  compact: {
    pad: "px-[18px] py-[15px]",
    value: "text-[20px] mt-[5px]",
    note: "mt-1",
  },
  // Recurring: 19/22, a 24px value.
  regular: {
    pad: "px-[22px] py-[19px]",
    value: "text-[24px] mt-2",
    note: "mt-[3px]",
  },
  // Users and audit: 19/22, the full 24.5px display value.
  large: {
    pad: "px-[22px] py-[19px]",
    value: "text-stat tracking-[-0.03em] mt-2.5",
    note: "mt-1",
  },
};

/** The dashboard's four headline cards: value, delta and a tone-carrying icon. */
export function SummaryStatCard({ stat }: { readonly stat: SummaryStat }) {
  return (
    <Panel className="px-[22px] py-[19px]">
      <div className="flex items-center justify-between">
        <span className="panel-kicker">{stat.label}</span>
        <Icon name={stat.icon} size={15} className={TEXT_TONE[stat.iconTone]} />
      </div>
      <p
        className={cx(
          "text-stat mt-3 font-[family-name:var(--font-heading)] font-semibold tracking-[-0.03em] tabular-nums",
          TEXT_TONE[stat.valueTone],
        )}
      >
        {stat.value}
      </p>
      <p className="text-meta text-muted mt-1.5 flex items-center gap-1.5">
        <span
          className={cx(
            "font-[family-name:var(--font-heading)] font-semibold",
            TEXT_TONE[stat.deltaTone],
          )}
        >
          {stat.delta}
        </span>
        <span>{stat.deltaNote}</span>
      </p>
    </Panel>
  );
}

export function StatCard({
  stat,
  size,
}: {
  readonly stat: MiniStat;
  readonly size: StatSize;
}) {
  const shape = STAT_SIZE[size];

  return (
    <Panel className={shape.pad}>
      <span className="panel-kicker">{stat.label}</span>
      <p
        className={cx(
          "font-[family-name:var(--font-heading)] font-semibold tabular-nums",
          shape.value,
          TEXT_TONE[stat.tone],
        )}
      >
        {stat.value}
      </p>
      {stat.note ? (
        <p className={cx("text-meta text-muted", shape.note)}>{stat.note}</p>
      ) : null}
    </Panel>
  );
}

export function StatRow({
  stats,
  size,
}: {
  readonly stats: readonly MiniStat[];
  readonly size: StatSize;
}) {
  return (
    <StatGrid>
      {stats.map((stat) => (
        <StatCard key={stat.id} stat={stat} size={size} />
      ))}
    </StatGrid>
  );
}

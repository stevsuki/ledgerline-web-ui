"use client";

import { useState, type ReactNode } from "react";

import { MINUS_SIGN } from "@/lib/format";
import type { TrendBar } from "@/lib/data/analytics";
import type { TrendChartKind } from "@/lib/dashboard-layout";
import { cx } from "@/lib/tone";

const FULL_PERCENT = 100;

/**
 * Income against expense, in the form its reader chose. Every height and share
 * comes from the server; the form only decides what is drawn from them.
 *
 * Whatever the form, the plot is the same row of columns — one per period, each
 * a hover target with its label underneath — so the tooltip, the band behind
 * the hovered period and the labels never move when the form does. A line or an
 * area is laid over those columns rather than inside them.
 */
export function TrendChart({
  bars,
  kind,
}: {
  readonly bars: readonly TrendBar[];
  readonly kind: TrendChartKind;
}) {
  const [hovered, setHovered] = useState<number>(-1);
  const active = bars[hovered];

  /** Keep the tooltip inside the panel, as the artboard's `tipLeft` does. */
  const tipLeft = Math.max(0, Math.min(74, (hovered / bars.length) * 100 + 3));

  return (
    <div className="relative mt-3 flex h-[216px] items-end gap-0.5">
      {bars.map((bar, index) => (
        <div
          key={bar.label}
          onMouseEnter={() => setHovered(index)}
          onMouseLeave={() => setHovered(-1)}
          className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2 pt-2 transition-colors"
          style={{
            background:
              hovered === index
                ? "color-mix(in srgb, var(--color-text) 6%, transparent)"
                : "transparent",
          }}
        >
          <div className="w-full flex-1">{MARKS_BY_KIND[kind](bar)}</div>
          <span className="text-muted h-4 font-[family-name:var(--font-heading)] text-[11px] leading-4 font-semibold tracking-[0.04em]">
            {bar.label}
          </span>
        </div>
      ))}

      {HAS_ZERO_LINE[kind] ? (
        <span
          aria-hidden="true"
          className="bg-divider pointer-events-none absolute inset-x-0 top-[calc(0.5rem+(100%-2rem)/2)] h-px"
        />
      ) : null}

      {kind === "line" || kind === "area" ? (
        <TrendLines bars={bars} hovered={hovered} isFilled={kind === "area"} />
      ) : null}

      {active ? (
        <div
          className="overlay-surface bg-bg pointer-events-none absolute -top-1.5 z-5 max-w-full min-w-[140px] px-[11px] py-[9px]"
          style={{ left: `min(${tipLeft}%, 100% - 140px)` }}
        >
          <p className="text-muted mb-1 text-[10px] tracking-[0.1em] uppercase">
            {active.label}
          </p>
          <p className="text-income text-note tabular-nums">
            + {active.incomeLabel}
          </p>
          <p className="text-expense text-note tabular-nums">
            {MINUS_SIGN} {active.expenseLabel}
          </p>
          <p className="text-muted mt-1 text-[11px]">
            Net {active.isLoss ? `${MINUS_SIGN} ` : ""}
            {active.netLabel}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ── what one period draws ─────────────────────────────────────────────── */

/** The two forms measured from a line across the middle rather than the floor. */
const HAS_ZERO_LINE: Readonly<Record<TrendChartKind, boolean>> = {
  bars: false,
  line: false,
  area: false,
  mirror: true,
  net: true,
};

const MARKS_BY_KIND: Readonly<
  Record<TrendChartKind, (bar: TrendBar) => ReactNode>
> = {
  bars: (bar) => (
    <div className="flex h-full items-end justify-center gap-[5px]">
      <Bar height={bar.incomeHeight} className="w-[28%] bg-income" />
      <Bar height={bar.expenseHeight} className="w-[28%] bg-expense" />
    </div>
  ),
  // A line and an area are one mark across every period, drawn by `TrendLines`.
  line: () => null,
  area: () => null,
  mirror: (bar) => (
    <SplitColumn
      above={<Bar height={bar.incomeHeight} className="w-[42%] bg-income" />}
      below={
        <Bar isDown height={bar.expenseHeight} className="w-[42%] bg-expense" />
      }
    />
  ),
  net: (bar) => (
    <SplitColumn
      above={
        bar.isLoss ? null : (
          <Bar height={bar.netHeight} className="w-[46%] bg-income" />
        )
      }
      below={
        bar.isLoss ? (
          <Bar isDown height={bar.netHeight} className="w-[46%] bg-expense" />
        ) : null
      }
    />
  ),
};

/** A column cut at the middle: what is above the zero line, and what is below. */
function SplitColumn({
  above,
  below,
}: {
  readonly above: ReactNode;
  readonly below: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 items-end justify-center">{above}</div>
      <div className="flex flex-1 items-start justify-center">{below}</div>
    </div>
  );
}

/** One bar. The round end is the one away from the line it is measured from. */
function Bar({
  height,
  className,
  isDown = false,
}: {
  readonly height: string;
  readonly className: string;
  readonly isDown?: boolean;
}) {
  return (
    <div
      className={cx(
        "glass-fill animate-grow min-w-[11px]",
        isDown
          ? "origin-top rounded-t-[3px] rounded-b-[7px]"
          : "rounded-t-[7px] rounded-b-[3px]",
        className,
      )}
      style={{ height }}
    />
  );
}

/* ── the line and the area ─────────────────────────────────────────────── */

type Series = {
  readonly id: string;
  readonly shares: readonly number[];
  readonly strokeClass: string;
  readonly fillClass: string;
  readonly dotClass: string;
};

/** A period's point sits over the middle of its column. */
function xOf(index: number, count: number): number {
  return ((index + 0.5) / count) * FULL_PERCENT;
}

function yOf(share: number): number {
  return FULL_PERCENT - share * FULL_PERCENT;
}

function linePoints(shares: readonly number[]): string {
  return shares
    .map((share, index) => `${xOf(index, shares.length)},${yOf(share)}`)
    .join(" ");
}

/** The line closed down to the floor at both ends, for the body under it. */
function areaPoints(shares: readonly number[]): string {
  const first = xOf(0, shares.length);
  const last = xOf(shares.length - 1, shares.length);
  return `${first},${FULL_PERCENT} ${linePoints(shares)} ${last},${FULL_PERCENT}`;
}

/**
 * Both series as lines over the columns.
 *
 * The SVG is stretched to the plot, so its strokes are told not to scale with
 * it, and the points are not in it at all: a circle in a stretched viewBox is
 * an ellipse, so each is a dot positioned by the same percentages instead.
 */
function TrendLines({
  bars,
  hovered,
  isFilled,
}: {
  readonly bars: readonly TrendBar[];
  readonly hovered: number;
  readonly isFilled: boolean;
}) {
  const series: readonly Series[] = [
    {
      id: "income",
      shares: bars.map((bar) => bar.incomeShare),
      strokeClass: "stroke-income",
      fillClass: "fill-income/15",
      dotClass: "bg-income",
    },
    {
      id: "expense",
      shares: bars.map((bar) => bar.expenseShare),
      strokeClass: "stroke-expense",
      fillClass: "fill-expense/15",
      dotClass: "bg-expense",
    },
  ];

  return (
    <div className="animate-fade pointer-events-none absolute inset-x-0 top-2 bottom-6">
      <svg
        viewBox={`0 0 ${FULL_PERCENT} ${FULL_PERCENT}`}
        preserveAspectRatio="none"
        className="size-full overflow-visible"
        aria-hidden="true"
      >
        {series.map((line) => (
          <g key={line.id}>
            {isFilled ? (
              <polygon
                points={areaPoints(line.shares)}
                className={line.fillClass}
              />
            ) : null}
            <polyline
              points={linePoints(line.shares)}
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className={line.strokeClass}
            />
          </g>
        ))}
      </svg>

      {series.map((line) =>
        line.shares.map((share, index) => (
          <span
            key={`${line.id}-${bars[index]?.label}`}
            className={cx(
              "ring-surface absolute -translate-x-1/2 translate-y-1/2 rounded-full ring-2 transition-[width,height] duration-150",
              hovered === index ? "size-2.5" : "size-2",
              line.dotClass,
            )}
            style={{
              left: `${xOf(index, line.shares.length)}%`,
              bottom: `${share * FULL_PERCENT}%`,
            }}
          />
        )),
      )}
    </div>
  );
}

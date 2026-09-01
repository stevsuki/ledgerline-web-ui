"use client";

import { useState } from "react";

import { MINUS_SIGN } from "@/lib/format";
import type { TrendBar } from "@/lib/data/analytics";

/** Income against expense. The bars and their heights come from the server. */
export function TrendChart({ bars }: { readonly bars: readonly TrendBar[] }) {
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
          className="flex h-full flex-1 flex-col items-center justify-end gap-2 pt-2 transition-colors"
          style={{
            background:
              hovered === index
                ? "color-mix(in srgb, var(--color-text) 6%, transparent)"
                : "transparent",
          }}
        >
          <div className="flex w-full flex-1 items-end justify-center gap-[5px]">
            <Bar height={bar.incomeHeight} className="bg-income" />
            <Bar height={bar.expenseHeight} className="bg-expense" />
          </div>
          <span className="text-muted font-[family-name:var(--font-heading)] text-[11px] font-semibold tracking-[0.04em]">
            {bar.label}
          </span>
        </div>
      ))}

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
          <p className="text-muted mt-1 text-[11px]">Net {active.netLabel}</p>
        </div>
      ) : null}
    </div>
  );
}

function Bar({
  height,
  className,
}: {
  readonly height: string;
  readonly className: string;
}) {
  return (
    <div
      className={`animate-grow w-[28%] min-w-[11px] rounded-t-[7px] rounded-b-[3px] ${className}`}
      style={{ height }}
    />
  );
}

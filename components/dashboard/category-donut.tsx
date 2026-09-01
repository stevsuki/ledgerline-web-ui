"use client";

import { useState } from "react";

import type { DonutData } from "@/lib/data/analytics";
import { RAMP_BG, RAMP_FILL, cx } from "@/lib/tone";

/** Spending by category. The geometry is computed on the server. */
export function CategoryDonut({ data }: { readonly data: DonutData }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const active = data.segments.find((segment) => segment.id === hovered);

  return (
    // Wraps rather than shrinking the dial.
    <div className="mt-4 flex flex-wrap items-center gap-4">
      <div className="relative mx-auto flex-none">
        <svg
          viewBox="0 0 180 180"
          className="size-[164px]"
          role="img"
          aria-label="Spending by category"
        >
          {data.segments.map((segment) => (
            <path
              key={segment.id}
              d={segment.path}
              className={cx(
                RAMP_FILL[segment.step],
                "cursor-pointer transition-opacity duration-150",
              )}
              opacity={!hovered || hovered === segment.id ? 1 : 0.32}
              onMouseEnter={() => setHovered(segment.id)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-muted text-[9.5px] tracking-[0.12em] uppercase">
            {active ? active.label : data.totalLabel}
          </span>
          <span className="mt-[3px] text-lg font-semibold tracking-[-0.02em]">
            {active ? active.value : data.totalValue}
          </span>
          <span className="text-muted mt-0.5 text-[11px]">
            {active ? `${active.percent} of spend` : data.totalNote}
          </span>
        </div>
      </div>

      <ul className="flex min-w-[170px] flex-1 flex-col">
        {data.segments.map((segment) => (
          <li
            key={segment.id}
            onMouseEnter={() => setHovered(segment.id)}
            onMouseLeave={() => setHovered(null)}
            className="border-divider flex items-center gap-2 border-b px-1 py-[5px] text-note transition-colors"
            style={{
              background:
                hovered === segment.id
                  ? "color-mix(in srgb, var(--color-text) 7%, transparent)"
                  : "transparent",
            }}
          >
            <span
              aria-hidden="true"
              className={cx("size-[9px] flex-none rounded-[3px]", RAMP_BG[segment.step])}
            />
            <span className="min-w-0 flex-1 truncate">{segment.label}</span>
            <span className="text-muted tabular-nums">{segment.percent}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

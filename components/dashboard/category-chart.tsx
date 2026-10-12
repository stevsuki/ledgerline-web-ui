"use client";

import { useState } from "react";

import { StackedBar } from "@/components/ui/primitives";
import type { DonutData, DonutSegment } from "@/lib/data/analytics";
import type { CategoryChartKind } from "@/lib/dashboard-layout";
import { cx, paintClass, paintStyle, sliceClass, sliceStyle } from "@/lib/tone";

/** How far a mark steps back while another one is being read. */
const DIMMED_OPACITY = 0.32;

/** A tile narrower or shorter than this cannot hold its own name. */
const LABEL_MIN_WIDTH = 18;
const LABEL_MIN_HEIGHT = 26;

const CHART_LABEL = "Spending by category";

type Hover = {
  readonly hovered: string | null;
  readonly onHover: (id: string | null) => void;
};

type Readout = {
  readonly label: string;
  readonly value: string;
  readonly note: string;
};

/** The total, until a category is pointed at — then that category instead. */
function readoutOf(data: DonutData, active: DonutSegment | undefined): Readout {
  return active
    ? {
        label: active.label,
        value: active.value,
        note: `${active.percent} of spend`,
      }
    : { label: data.totalLabel, value: data.totalValue, note: data.totalNote };
}

/**
 * Spending by category, in the form its reader chose. The geometry of every
 * form — arcs, widths, tiles — is computed on the server.
 */
export function CategoryChart({
  data,
  kind,
}: {
  readonly data: DonutData;
  readonly kind: CategoryChartKind;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  // Every figure is already on the row, so there is nothing for a hover to add.
  if (kind === "ranked") {
    return <RankedBars segments={data.segments} />;
  }

  const hover: Hover = { hovered, onHover: setHovered };
  const readout = readoutOf(
    data,
    data.segments.find((segment) => segment.id === hovered),
  );

  if (kind === "donut") {
    return (
      // Wraps rather than shrinking the dial.
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Dial segments={data.segments} readout={readout} hover={hover} />
        <Key
          segments={data.segments}
          hover={hover}
          className="flex min-w-[170px] flex-1 flex-col"
        />
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3.5">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <span className="panel-kicker">{readout.label}</span>
        <span className="text-lg font-semibold tracking-[-0.02em] tabular-nums">
          {readout.value}
        </span>
        <span className="text-meta text-muted">{readout.note}</span>
      </div>

      {kind === "strip" ? (
        <StackedBar
          className="h-3.5"
          segments={data.segments.map((segment) => ({
            id: segment.id,
            width: segment.width,
            fillClass: paintClass(segment.step),
            fillStyle: paintStyle(segment.step),
          }))}
        />
      ) : (
        <Treemap segments={data.segments} hover={hover} />
      )}

      <Key
        segments={data.segments}
        hover={hover}
        className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,170px),1fr))] gap-x-4"
      />
    </div>
  );
}

/* ── donut ─────────────────────────────────────────────────────────────── */

function Dial({
  segments,
  readout,
  hover,
}: {
  readonly segments: readonly DonutSegment[];
  readonly readout: Readout;
  readonly hover: Hover;
}) {
  return (
    <div className="relative mx-auto flex-none">
      <svg
        viewBox="0 0 180 180"
        className="size-[164px]"
        role="img"
        aria-label={CHART_LABEL}
      >
        {segments.map((segment) => (
          <path
            key={segment.id}
            d={segment.path}
            className={cx(
              sliceClass(segment.step),
              "glass-slice cursor-pointer transition-opacity duration-150",
            )}
            style={sliceStyle(segment.step)}
            opacity={opacityOf(segment.id, hover.hovered)}
            onMouseEnter={() => hover.onHover(segment.id)}
            onMouseLeave={() => hover.onHover(null)}
          />
        ))}
      </svg>

      {/* Narrower than the hole, so a long name ends in an ellipsis inside the ring rather than under it. */}
      <div className="pointer-events-none absolute inset-0 mx-auto flex w-[104px] flex-col items-center justify-center text-center">
        <span className="text-muted max-w-full truncate text-[9.5px] tracking-[0.12em] uppercase">
          {readout.label}
        </span>
        <span className="mt-[3px] max-w-full truncate text-lg font-semibold tracking-[-0.02em] tabular-nums">
          {readout.value}
        </span>
        <span className="text-muted mt-0.5 max-w-full truncate text-[11px]">
          {readout.note}
        </span>
      </div>
    </div>
  );
}

function opacityOf(id: string, hovered: string | null): number {
  return hovered === null || hovered === id ? 1 : DIMMED_OPACITY;
}

/* ── treemap ───────────────────────────────────────────────────────────── */

/**
 * One tile per category, its area the category's share. The 1px each tile is
 * inset by is the gap between two of them, so the ground shows through rather
 * than a line being drawn.
 */
function Treemap({
  segments,
  hover,
}: {
  readonly segments: readonly DonutSegment[];
  readonly hover: Hover;
}) {
  return (
    <div
      className="animate-fade relative h-[216px]"
      role="img"
      aria-label={CHART_LABEL}
    >
      {segments.map((segment) => (
        <div
          key={segment.id}
          className="absolute p-px transition-opacity duration-150"
          style={{
            left: `${segment.tile.left}%`,
            top: `${segment.tile.top}%`,
            width: `${segment.tile.width}%`,
            height: `${segment.tile.height}%`,
            opacity: opacityOf(segment.id, hover.hovered),
          }}
          onMouseEnter={() => hover.onHover(segment.id)}
          onMouseLeave={() => hover.onHover(null)}
        >
          <div
            className={cx(
              "glass-fill flex size-full flex-col justify-end overflow-hidden rounded-[7px] px-2 py-1.5",
              paintClass(segment.step),
            )}
            style={paintStyle(segment.step)}
          >
            {segment.tile.width >= LABEL_MIN_WIDTH &&
            segment.tile.height >= LABEL_MIN_HEIGHT ? (
              <>
                <span className="truncate text-[11.5px] font-semibold">
                  {segment.label}
                </span>
                <span className="truncate text-[11px] tabular-nums">
                  {segment.percent}
                </span>
              </>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── ranked bars ───────────────────────────────────────────────────────── */

/** Largest first, each bar measured against the largest rather than the total. */
function RankedBars({
  segments,
}: {
  readonly segments: readonly DonutSegment[];
}) {
  const ranked = [...segments].sort((a, b) => b.share - a.share);

  return (
    <ul className="mt-4 flex flex-col gap-3">
      {ranked.map((segment) => (
        <li key={segment.id}>
          <div className="text-note flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate">{segment.label}</span>
            <span className="flex-none tabular-nums">{segment.value}</span>
            <span className="text-muted w-9 flex-none text-right tabular-nums">
              {segment.percent}
            </span>
          </div>
          <StackedBar
            className="track-sm mt-1.5"
            segments={[
              {
                id: segment.id,
                width: segment.barWidth,
                fillClass: paintClass(segment.step),
                fillStyle: paintStyle(segment.step),
              },
            ]}
          />
        </li>
      ))}
    </ul>
  );
}

/* ── the key ───────────────────────────────────────────────────────────── */

/** Swatch · name · share. Pointing at a row reads that category out above. */
function Key({
  segments,
  hover,
  className,
}: {
  readonly segments: readonly DonutSegment[];
  readonly hover: Hover;
  readonly className: string;
}) {
  return (
    <ul className={className}>
      {segments.map((segment) => (
        <li
          key={segment.id}
          onMouseEnter={() => hover.onHover(segment.id)}
          onMouseLeave={() => hover.onHover(null)}
          className="border-divider text-note flex items-center gap-2 border-b px-1 py-[5px] transition-colors"
          style={{
            background:
              hover.hovered === segment.id
                ? "color-mix(in srgb, var(--color-text) 7%, transparent)"
                : "transparent",
          }}
        >
          <span
            aria-hidden="true"
            className={cx(
              "glass-fill size-[9px] flex-none rounded-[3px]",
              paintClass(segment.step),
            )}
            style={paintStyle(segment.step)}
          />
          <span className="min-w-0 flex-1 truncate">{segment.label}</span>
          <span className="text-muted tabular-nums">{segment.percent}</span>
        </li>
      ))}
    </ul>
  );
}

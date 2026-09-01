import type { ReactNode } from "react";

import { cx } from "@/lib/tone";

/**
 * The two layout rules every screen in the artboard follows: a single column
 * of sections, and an auto-fitting split that collapses at a minimum width.
 */

/**
 * Centring is the artboard's one omission worth correcting: it caps the content
 * width but leaves it pinned left, so on any display wider than the canvas all
 * the leftover space piles up on the right.
 *
 * The cap itself comes from `--screen-max`, which <AppScreen> sets on both the
 * header and the content — that is what keeps the page title above the first
 * card at every window width.
 */
export function ScreenStack({
  children,
  gap = 24,
}: {
  readonly children: ReactNode;
  readonly gap?: number;
}) {
  return (
    <div
      className="animate-fade mx-auto flex w-full max-w-[var(--screen-max)] flex-col"
      style={{ gap }}
    >
      {children}
    </div>
  );
}

export function SplitGrid({
  children,
  minWidth = 340,
  ratio = 1.4,
  gap = 24,
  className,
}: {
  readonly children: ReactNode;
  readonly minWidth?: number;
  readonly ratio?: number;
  readonly gap?: number;
  readonly className?: string;
}) {
  return (
    <div
      className={cx("grid items-start", className)}
      style={{
        gap,
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minWidth}px), ${ratio}fr))`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Wide tables scroll inside their panel rather than pushing the page sideways,
 * matching the artboard's `overflow-x:auto` wrappers.
 */
export function TableScroll({
  children,
  minWidth,
}: {
  readonly children: ReactNode;
  readonly minWidth: number;
}) {
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}

/** A grid that fills with equal cards rather than splitting into columns. */
export function CardGrid({
  children,
  minWidth = 280,
  gap = 14,
}: {
  readonly children: ReactNode;
  readonly minWidth?: number;
  readonly gap?: number;
}) {
  return (
    <div
      className="grid"
      style={{
        gap,
        gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}

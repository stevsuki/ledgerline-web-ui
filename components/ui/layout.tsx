import type { ReactNode } from "react";

import { cx } from "@/lib/tone";

/** The two layout rules every screen follows: a stacked column, and a collapsing split. */

/** Centring is the artboard's one omission worth correcting. */
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

/** Wide tables scroll inside their panel rather than pushing the page sideways. */
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
        gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minWidth}px), 1fr))`,
      }}
    >
      {children}
    </div>
  );
}

/** The two-up field layout the editor panels share — wallets, goals, settings. */
export function FieldGrid({
  children,
  minWidth = 180,
  className,
}: {
  readonly children: ReactNode;
  readonly minWidth?: number;
  readonly className?: string;
}) {
  return (
    <div
      className={cx("grid gap-3", className)}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minWidth}px), 1fr))`,
      }}
    >
      {children}
    </div>
  );
}

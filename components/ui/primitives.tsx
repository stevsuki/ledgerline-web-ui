import Link from "next/link";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon-sprite";
import { PanelNotice } from "@/components/ui/panel";
import { initialsOf } from "@/lib/format";
import { BG_TONE, TEXT_TONE, cx } from "@/lib/tone";
import type { Tone } from "@/types/ledger";

/* ── tag ───────────────────────────────────────────────────────────────── */

type TagVariant = "neutral" | "accent" | "outline";

const TAG_CLASS: Readonly<Record<TagVariant, string>> = {
  neutral: "tag-neutral",
  accent: "tag-accent",
  outline: "tag-outline",
};

export function Tag({
  children,
  variant = "neutral",
  className,
}: {
  readonly children: ReactNode;
  readonly variant?: TagVariant;
  readonly className?: string;
}) {
  return (
    <span className={cx("tag", TAG_CLASS[variant], className)}>{children}</span>
  );
}

/* ── icon tile ─────────────────────────────────────────────────────────── */

/** Shape contract: 34×34 (32 in dense rows) · 1px divider · radius 10. */
export function IconTile({
  name,
  tone = "muted",
  dense = false,
}: {
  readonly name: IconName;
  readonly tone?: Tone;
  readonly dense?: boolean;
}) {
  return (
    <span
      className={cx("icon-tile", dense && "icon-tile-sm", TEXT_TONE[tone])}
    >
      <Icon name={name} size={dense ? 15 : 16} />
    </span>
  );
}

/* ── progress track ────────────────────────────────────────────────────── */

/** Shape contract: radius 99 track, radius 99 fill. */
export function ProgressTrack({
  width,
  fillClass,
  small = false,
  className,
}: {
  readonly width: string;
  readonly fillClass: string;
  readonly small?: boolean;
  readonly className?: string;
}) {
  return (
    <div className={cx("track", small && "track-sm", className)}>
      <div
        className={cx("track-fill animate-grow-x", fillClass)}
        style={{ width }}
      />
    </div>
  );
}

/** A budget line: what it is, how far through it is, and the two figures. */
export function MeterRow({
  label,
  spent,
  limit,
  width,
  fillClass,
}: {
  readonly label: string;
  readonly spent: string;
  readonly limit: string;
  readonly width: string;
  readonly fillClass: string;
}) {
  return (
    <div>
      <div className="text-note flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="text-muted flex-none tabular-nums">
          {spent} / {limit}
        </span>
      </div>
      <ProgressTrack
        small
        className="mt-1.5"
        width={width}
        fillClass={fillClass}
      />
    </div>
  );
}

/* ── legends and stacked bars ──────────────────────────────────────────── */

/** One swatch and its name; four screens draw it. */
export function LegendItem({
  label,
  fillClass,
}: {
  readonly label: string;
  readonly fillClass: string;
}) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cx("size-2.5 flex-none rounded-[3px]", fillClass)}
      />
      {label}
    </li>
  );
}

/** The row those swatches sit in. Wraps, so a narrow panel stacks them. */
export function LegendList({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <ul
      className={cx(
        "text-meta text-muted flex flex-wrap gap-x-4.5 gap-y-1.5",
        className,
      )}
    >
      {children}
    </ul>
  );
}

export type BarSegment = {
  readonly id: string;
  readonly width: string;
  readonly fillClass: string;
};

/** A single track divided into shares rather than filled to one point. */
export function StackedBar({
  segments,
  className,
}: {
  readonly segments: readonly BarSegment[];
  readonly className?: string;
}) {
  return (
    <div className={cx("track flex", className)}>
      {segments.map((segment) => (
        <span
          key={segment.id}
          className={segment.fillClass}
          style={{ width: segment.width }}
        />
      ))}
    </div>
  );
}

/* ── avatar ────────────────────────────────────────────────────────────── */

export function Avatar({
  name,
  highlight = false,
  size = 34,
}: {
  readonly name: string;
  readonly highlight?: boolean;
  readonly size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "border-divider grid flex-none place-items-center rounded-full border font-[family-name:var(--font-heading)] font-semibold",
        highlight ? "text-accent bg-accent/15" : "text-text bg-panel",
      )}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initialsOf(name)}
    </span>
  );
}

/* ── status cell ───────────────────────────────────────────────────────── */

const STATUS_TONE: Readonly<Record<string, Tone>> = {
  Enabled: "income",
  Invited: "warn",
  Disabled: "muted",
};

export function StatusCell({ status }: { readonly status: string }) {
  const tone = STATUS_TONE[status] ?? "muted";

  return (
    <span className="text-note flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cx("size-[7px] flex-none rounded-full", BG_TONE[tone])}
      />
      {status}
    </span>
  );
}

/* ── empty state ───────────────────────────────────────────────────────── */

export function EmptyState({
  message,
  resetHref,
  resetLabel,
}: {
  readonly message: string;
  readonly resetHref: string;
  readonly resetLabel: string;
}) {
  return (
    <PanelNotice>
      {message}{" "}
      <Link className="btn btn-ghost text-[13px]" href={resetHref}>
        {resetLabel}
      </Link>
    </PanelNotice>
  );
}

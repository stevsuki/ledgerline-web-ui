import type { ReactNode } from "react";

import { cx } from "@/lib/tone";

type PanelProps = {
  readonly children: ReactNode;
  readonly className?: string;
  /** Panels rise on mount; turn it off for a panel inside another animation. */
  readonly animate?: boolean;
};

/** Shape contract: 1px divider · radius 16 · shadow-md · surface. */
export function Panel({ children, className, animate = true }: PanelProps) {
  return (
    <div className={cx("panel", animate && "animate-pop", className)}>
      {children}
    </div>
  );
}

type PanelHeaderProps = {
  readonly title: string;
  readonly subtitle?: string;
  readonly action?: ReactNode;
  /** A header with no bottom rule, used where the body draws its own. */
  readonly plain?: boolean;
};

export function PanelHeader({
  title,
  subtitle,
  action,
  plain = false,
}: PanelHeaderProps) {
  return (
    <div
      className={cx(
        "flex items-start justify-between gap-3",
        plain ? "panel-pad-x pt-6" : "panel-head",
      )}
    >
      <div className="min-w-0 flex-1">
        <h2 className="panel-title">{title}</h2>
        {subtitle ? (
          <p className="text-meta text-muted mt-0.5">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** A panel whose whole body is padded — the editor and summary cards. */
export function SectionPanel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  titleId,
}: {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  /** Overrides the default `mt-4 flex flex-col gap-3` body. */
  readonly bodyClassName?: string;
  /** Set when something on the page links to this panel's heading. */
  readonly titleId?: string;
}) {
  return (
    <Panel className={cx("panel-pad", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="panel-title">
            {title}
          </h2>
          {description ? (
            <p className="text-meta text-muted mt-0.5">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className={bodyClassName ?? "mt-4 flex flex-col gap-3"}>
        {children}
      </div>
    </Panel>
  );
}

/** The line a table shows instead of rows: an empty result, or the reason the request failed. */
export function PanelNotice({
  children,
  tone = "muted",
}: {
  readonly children: ReactNode;
  readonly tone?: "muted" | "expense";
}) {
  return (
    <p
      className={cx(
        "panel-pad-x py-12 text-[13px]",
        tone === "expense" ? "text-expense" : "text-muted",
      )}
    >
      {children}
    </p>
  );
}

/** Shape contract: 1px divider · radius 12 · panel fill, inside a Panel. */
export function InsetBlock({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return <div className={cx("inset", className)}>{children}</div>;
}

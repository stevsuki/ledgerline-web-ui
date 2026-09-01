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
        plain ? "px-6 pt-6" : "panel-head",
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

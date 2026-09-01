import type { ReactNode } from "react";

import { WORKSPACE } from "@/lib/nav";

/**
 * The shared auth surface: a 400px panel with 32px padding, optionally led by
 * the brand mark, exactly as the artboard's three cards are built.
 */
export function AuthCard({
  title,
  intro,
  kicker,
  showBrand = false,
  children,
}: {
  readonly title: string;
  readonly intro?: string;
  readonly kicker?: string;
  readonly showBrand?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <div className="panel animate-pop p-8">
      {showBrand ? (
        <span
          aria-hidden="true"
          className="bg-accent text-bg grid size-8 place-items-center rounded-[var(--radius-tile)] font-semibold"
        >
          {WORKSPACE.initial}
        </span>
      ) : null}

      {kicker ? <p className="panel-kicker mb-2">{kicker}</p> : null}

      <h1
        className={`text-[28px] leading-[1.1] font-semibold tracking-[-0.03em] ${
          showBrand ? "mt-5" : ""
        }`}
      >
        {title}
      </h1>

      {intro ? <p className="text-muted text-note mt-1.5">{intro}</p> : null}

      <div className="mt-5.5 flex flex-col gap-3">{children}</div>
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="text-muted flex items-center gap-3 text-note">
      <span className="bg-divider h-px flex-1" />
      <span>or</span>
      <span className="bg-divider h-px flex-1" />
    </div>
  );
}

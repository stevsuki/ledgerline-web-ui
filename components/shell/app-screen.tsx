import { cookies } from "next/headers";
import type { CSSProperties, ReactNode } from "react";

import { AppHeader } from "@/components/shell/app-header";
import { requireProfile } from "@/lib/auth/session";
import { THEME_COOKIE, parseTheme } from "@/lib/preferences";

/** One line, above everything a preview screen shows. */
function PreviewBanner() {
  return (
    <p className="border-warn/40 bg-warn/[0.08] text-meta text-muted mx-auto mb-5 flex w-full max-w-[var(--screen-max)] flex-wrap items-center gap-2 rounded-[var(--radius-panel)] border px-3.5 py-2.5">
      <span className="tag tag-neutral flex-none text-[9.5px] tracking-[0.08em] uppercase">
        Preview
      </span>
      <span>
        Sample figures from the design, not this workspace. Nothing here is read
        from your ledger yet.
      </span>
    </p>
  );
}

/** Every screen opens with this: the gate, and the one width header and content share. */
export async function AppScreen({
  title,
  subtitle,
  maxWidth = 1200,
  isPreview = false,
  children,
}: {
  readonly title: string;
  readonly subtitle: string;
  /** The content cap for this screen, from the artboard's per-screen max-width. */
  readonly maxWidth?: number;
  /**
   * The screen is still drawn from the design fixture rather than the account's
   * own data. It says so at the top rather than only in the rail: a figure is
   * read where it is printed, and every figure below is someone else's.
   */
  readonly isPreview?: boolean;
  readonly children: ReactNode;
}) {
  // The gate, checked next to the render rather than only in the proxy.
  const { user } = await requireProfile();

  const store = await cookies();
  const theme = parseTheme(store.get(THEME_COOKIE)?.value);

  // One width for the screen: the header bar and the content below it both read it.
  const screenWidth = { "--screen-max": `${maxWidth}px` } as CSSProperties;

  return (
    <>
      {/* Same nesting as <main> below — gutter on the outer element. */}
      <header
        style={screenWidth}
        className="screen-gutter border-divider bg-bg sticky top-0 z-50 flex-none border-b py-2.5 sm:py-3.5"
      >
        <AppHeader
          title={title}
          subtitle={subtitle}
          fullName={user.fullName}
          theme={theme}
        />
      </header>

      {/* The column scrolls, not this element, so both edges agree with the header. */}
      <main
        style={screenWidth}
        className="screen-gutter flex-1 pt-5 pb-16 sm:pt-[30px] sm:pb-20"
      >
        {isPreview ? <PreviewBanner /> : null}
        {children}
      </main>
    </>
  );
}

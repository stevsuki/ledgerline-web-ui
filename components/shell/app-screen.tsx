import { cookies } from "next/headers";
import type { CSSProperties, ReactNode } from "react";

import { AppHeader } from "@/components/shell/app-header";
import { requireProfile } from "@/lib/auth/session";
import { THEME_COOKIE, parseTheme } from "@/lib/preferences";

/** Every screen opens with this: the gate, and the one width header and content share. */
export async function AppScreen({
  title,
  subtitle,
  maxWidth = 1200,
  children,
}: {
  readonly title: string;
  readonly subtitle: string;
  /** The content cap for this screen, from the artboard's per-screen max-width. */
  readonly maxWidth?: number;
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
        {children}
      </main>
    </>
  );
}

import { cookies } from "next/headers";
import type { CSSProperties, ReactNode } from "react";

import { NotificationBell } from "@/components/shell/notification-bell";
import { ThemeToggle } from "@/components/shell/theme-controls";
import { Icon } from "@/components/ui/icon";
import { OpenTransactionButton } from "@/components/ui/action-button";
import { Avatar } from "@/components/ui/primitives";
import { requireProfile } from "@/lib/auth/session";
import { NOTIFICATIONS } from "@/lib/data/reminders";
import { WORKSPACE } from "@/lib/nav";
import { THEME_COOKIE, parseTheme } from "@/lib/preferences";

/**
 * Every screen opens with this. The header is shared markup rather than a
 * layout slot, so a page can name itself in one line and still render
 * entirely on the server.
 */
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
  // The gate, checked next to the render rather than only in the proxy:
  // every screen in the app group opens with this component, so a client
  // navigation cannot slip past it.
  const { user } = await requireProfile();

  const store = await cookies();
  const theme = parseTheme(store.get(THEME_COOKIE)?.value);

  // One width for the screen: the header bar and the content below it both
  // read it, so the title always sits directly above the first card.
  const screenWidth = { "--screen-max": `${maxWidth}px` } as CSSProperties;

  return (
    <>
      {/* Same nesting as <main> below — gutter on the outer element, cap and
          centring on the inner one — so the two line up to the pixel. */}
      <header
        style={screenWidth}
        className="screen-gutter border-divider bg-bg sticky top-0 z-50 flex-none border-b py-3.5"
      >
        <div className="mx-auto flex w-full max-w-[var(--screen-max)] flex-wrap items-center gap-3">
        <div className="min-w-0 flex-[1_1_240px]">
          <h1 className="text-[21px] leading-tight font-semibold tracking-[-0.025em]">
            {title}
          </h1>
          <p className="text-meta text-muted mt-0.5">{subtitle}</p>
        </div>

        <form
          action="/transactions"
          method="get"
          className="border-divider bg-surface text-muted flex h-[38px] w-[220px] flex-none items-center gap-[9px] rounded-[var(--radius-control)] border px-3"
        >
          <label htmlFor="global-search" className="sr-only">
            Search transactions
          </label>
          <Icon name="search" size={15} />
          <input
            id="global-search"
            name="q"
            type="search"
            placeholder="Search transactions"
            className="text-text min-w-0 flex-1 bg-transparent text-[13px] outline-none"
          />
        </form>

        <span className="tag tag-neutral h-[38px] flex-none px-3">
          {WORKSPACE.currency}
        </span>

        <NotificationBell reminders={NOTIFICATIONS} />
        <ThemeToggle initial={theme} />

        <OpenTransactionButton className="btn btn-primary min-h-[38px] flex-none">
          <Icon name="plus" size={15} />
          Add transaction
        </OpenTransactionButton>

          <span className="flex items-center gap-2">
            <span className="sr-only">Signed in as {user.fullName}</span>
            <Avatar name={user.fullName} />
          </span>
        </div>
      </header>

      {/* The column scrolls, not this element — that keeps the sticky header
          and the content in one box, so their left and right edges agree
          whether or not a scrollbar is showing. */}
      <main
        style={screenWidth}
        className="screen-gutter flex-1 pt-[30px] pb-20"
      >
        {children}
      </main>
    </>
  );
}

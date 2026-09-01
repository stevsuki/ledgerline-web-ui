import { NavDrawer } from "@/components/shell/nav-drawer";
import { NotificationBell } from "@/components/shell/notification-bell";
import { ThemeToggle } from "@/components/shell/theme-controls";
import { OpenTransactionButton } from "@/components/ui/action-button";
import { Icon } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/primitives";
import { NOTIFICATIONS } from "@/lib/data/reminders";
import { WORKSPACE } from "@/lib/nav";
import type { Theme } from "@/lib/preferences";

/** The sticky bar every screen opens with, and the controls that belong to no screen. */
export function AppHeader({
  title,
  subtitle,
  fullName,
  theme,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly fullName: string;
  readonly theme: Theme;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[var(--screen-max)] flex-wrap items-center gap-2 sm:gap-3">
      <NavDrawer />

      <div className="min-w-0 flex-[1_1_180px]">
        <h1 className="truncate text-[17px] leading-tight font-semibold tracking-[-0.025em] sm:text-[21px]">
          {title}
        </h1>
        <p className="text-meta text-muted mt-0.5 truncate">{subtitle}</p>
      </div>

      <form
        action="/transactions"
        method="get"
        className="border-divider bg-surface text-muted hidden h-[38px] w-[220px] flex-none items-center gap-[9px] rounded-[var(--radius-control)] border px-3 md:flex"
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

      <span className="tag tag-neutral hidden h-[38px] flex-none px-3 xl:inline-flex">
        {WORKSPACE.currency}
      </span>

      <NotificationBell reminders={NOTIFICATIONS} />
      <ThemeToggle initial={theme} />

      <OpenTransactionButton
        label="Add transaction"
        className="btn btn-primary btn-icon min-h-[38px] flex-none sm:w-auto sm:px-[15px]"
      >
        <Icon name="plus" size={15} />
        <span className="hidden sm:inline">Add transaction</span>
      </OpenTransactionButton>

      <span className="flex items-center gap-2">
        <span className="sr-only">Signed in as {fullName}</span>
        <Avatar name={fullName} />
      </span>
    </div>
  );
}

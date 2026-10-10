import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { AppChromeProvider } from "@/components/shell/app-chrome";
import { NavRail } from "@/components/shell/nav-rail";
import { TransactionSlideOver } from "@/components/shell/transaction-slide-over";
import { getBudgets } from "@/lib/data/budgets";
import { getTransactionComposer } from "@/lib/data/transactions";
import { formatDayHeading, todayInJakarta } from "@/lib/dates";
import { SHELL_ID } from "@/lib/nav";
import { requireProfile } from "@/lib/auth/session";
import { RAIL_COOKIE, parseRailOpen } from "@/lib/preferences";

export default async function AppLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  // The gate for the whole group.
  const { menus } = await requireProfile();

  const store = await cookies();
  const isRailOpen = parseRailOpen(store.get(RAIL_COOKIE)?.value);

  // The categories and wallets the add-transaction sheet offers, read live so
  // one added elsewhere is selectable on the very next transaction.
  const composer = await getTransactionComposer();

  // The sheet dates a new entry today, so it has to be today: the workspace
  // constant said 27 August 2026 whatever the calendar said.
  const todayIso = todayInJakarta();

  // The slide-over's impact line needs to know how full each budget is.
  const budgets = await getBudgets();
  const budgetWidths = Object.fromEntries(
    budgets.map((budget) => [budget.label, budget.width]),
  );

  return (
    <AppChromeProvider>
      <div
        id={SHELL_ID}
        data-rail={isRailOpen ? "open" : "closed"}
        // The drawer always starts shut, so the server and the first client render agree.
        data-nav="closed"
        className="flex h-dvh overflow-hidden"
      >
        <NavRail menus={menus} />
        {/* The gutter is reserved, so content growing past the fold cannot shift the page sideways. */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto [scrollbar-gutter:stable]">
          {children}
        </div>
      </div>

      <TransactionSlideOver
        categories={composer.categories}
        wallets={composer.wallets}
        budgetWidths={budgetWidths}
        today={formatDayHeading(todayIso)}
        todayIso={todayIso}
      />
    </AppChromeProvider>
  );
}

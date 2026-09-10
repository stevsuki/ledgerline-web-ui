import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { AppChromeProvider } from "@/components/shell/app-chrome";
import { NavRail } from "@/components/shell/nav-rail";
import { TransactionSlideOver } from "@/components/shell/transaction-slide-over";
import { getBudgets } from "@/lib/data/budgets";
import { getTransactionComposer } from "@/lib/data/transactions";
import { todayInJakarta } from "@/lib/dates";
import { SHELL_ID, WORKSPACE } from "@/lib/nav";
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
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </div>

      <TransactionSlideOver
        categories={composer.categories}
        fallbackCategoryId={composer.fallbackCategoryId}
        fallbackCategoryName={composer.fallbackCategoryName}
        wallets={composer.wallets}
        budgetWidths={budgetWidths}
        today={WORKSPACE.today}
        todayIso={todayInJakarta()}
      />
    </AppChromeProvider>
  );
}

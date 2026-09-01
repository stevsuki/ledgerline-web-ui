import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { AppChromeProvider } from "@/components/shell/app-chrome";
import { NavRail } from "@/components/shell/nav-rail";
import { TransactionSlideOver } from "@/components/shell/transaction-slide-over";
import { getBudgets } from "@/lib/data/budgets";
import { CATEGORY_LABELS } from "@/lib/data/categories";
import { WALLET_NAMES } from "@/lib/data/transactions";
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
        categories={CATEGORY_LABELS}
        wallets={WALLET_NAMES}
        budgetWidths={budgetWidths}
        today={WORKSPACE.today}
      />
    </AppChromeProvider>
  );
}

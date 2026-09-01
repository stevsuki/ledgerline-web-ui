import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { AppChromeProvider } from "@/components/shell/app-chrome";
import { NavRail } from "@/components/shell/nav-rail";
import { TransactionSlideOver } from "@/components/shell/transaction-slide-over";
import { getBudgets } from "@/lib/data/budgets";
import { CATEGORY_LABELS } from "@/lib/data/categories";
import { WALLET_NAMES } from "@/lib/data/transactions";
import { WORKSPACE } from "@/lib/nav";
import { requireProfile } from "@/lib/auth/session";
import { RAIL_COOKIE, parseRailOpen } from "@/lib/preferences";

/** The rail toggle addresses the shell by id to flip its collapsed state. */
const SHELL_ID = "app-shell";

export default async function AppLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  // The gate for the whole group. `cache` on the session means the header and
  // every screen below share this one call to `/auth/me`.
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
        className="flex h-dvh overflow-hidden"
      >
        <NavRail shellId={SHELL_ID} menus={menus} />
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

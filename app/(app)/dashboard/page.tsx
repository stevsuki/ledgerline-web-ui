import type { Metadata } from "next";
import Link from "next/link";

import { CategoryDonut } from "@/components/dashboard/category-donut";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { AppScreen } from "@/components/shell/app-screen";
import { RecentTransactionRow } from "@/components/transactions/rows";
import { Icon } from "@/components/ui/icon";
import { ScreenStack, SplitGrid } from "@/components/ui/layout";
import { Panel, PanelHeader, PanelNotice } from "@/components/ui/panel";
import { LegendItem, LegendList, MeterRow } from "@/components/ui/primitives";
import { StatGrid, SummaryStatCard } from "@/components/ui/stats";
import { getDashboardScreen, type DashboardScreen } from "@/lib/data/analytics";
import { getBudgetsPreview } from "@/lib/data/budgets";
import { getRecentTransactions } from "@/lib/data/transactions";
import { PAGE_META } from "@/lib/nav";
import { BG_TONE } from "@/lib/tone";
import type { TrendMode } from "@/types/ledger";

export const metadata: Metadata = { title: PAGE_META.dashboard.title };

const TREND_MODES = [
  "weekly",
  "monthly",
] as const satisfies readonly TrendMode[];

/**
 * Every panel here is read on its own, and says so on its own.
 *
 * Unlike `/budgets`, no panel on this screen states the sum of another, so one
 * unreadable answer is one panel explaining itself beside three that are still
 * true — taking the whole page down would be the wrong trade on the screen the
 * app opens to. The month's figures are the exception: the cards and the donut
 * come from a single read, so they carry one error between them.
 */
export default async function DashboardPage(
  props: Readonly<PageProps<"/dashboard">>,
) {
  const params = await props.searchParams;
  const rawTrend = Array.isArray(params.trend) ? params.trend[0] : params.trend;
  const mode: TrendMode = rawTrend === "monthly" ? "monthly" : "weekly";

  const [screen, recent, budgets] = await Promise.all([
    getDashboardScreen(mode),
    getRecentTransactions(),
    getBudgetsPreview(),
  ]);

  return (
    <AppScreen
      title={PAGE_META.dashboard.title}
      subtitle={screen.subtitle}
      maxWidth={1340}
    >
      <ScreenStack gap={20}>
        <MonthStats screen={screen} />

        <SplitGrid>
          <Panel className="panel-pad">
            <div className="border-divider flex flex-wrap items-start justify-between gap-3 border-b pb-3.5">
              <div className="min-w-0 flex-1">
                <h2 className="panel-title">Income vs expense</h2>
                <p className="text-meta text-muted mt-0.5">
                  {screen.trendLabel}
                </p>
              </div>
              {/* The range is a URL filter, so the bars come back from the server already scaled. */}
              <div className="seg" role="group" aria-label="Trend range">
                {TREND_MODES.map((option) => (
                  <Link
                    key={option}
                    href={
                      option === "weekly"
                        ? "/dashboard"
                        : `/dashboard?trend=${option}`
                    }
                    aria-current={option === mode ? "page" : undefined}
                    className="seg-opt capitalize"
                  >
                    {option}
                  </Link>
                ))}
              </div>
            </div>

            <TrendPanelBody screen={screen} />
          </Panel>

          <Panel className="panel-pad">
            <div className="border-divider border-b pb-3.5">
              <h2 className="panel-title">Spending by category</h2>
              <p className="text-meta text-muted mt-0.5">
                {screen.donutCaption}
              </p>
            </div>
            <CategoryPanelBody screen={screen} />
          </Panel>
        </SplitGrid>

        <SplitGrid>
          <Panel>
            <PanelHeader
              title="Recent transactions"
              action={
                <Link href="/transactions" className="btn btn-ghost text-note">
                  View all
                  <Icon name="right" size={14} />
                </Link>
              }
            />
            {recent.length === 0 ? (
              <PanelNotice>
                Nothing recorded yet. The first entry you add shows up here.
              </PanelNotice>
            ) : (
              <ul>
                {recent.map((transaction) => (
                  <RecentTransactionRow
                    key={transaction.id}
                    transaction={transaction}
                  />
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Budgets"
              action={
                <Link href="/budgets" className="btn btn-ghost text-note">
                  Manage
                </Link>
              }
            />
            {budgets.length === 0 ? (
              <PanelNotice>
                No budgets yet. Set one against a spending category to follow it
                here.
              </PanelNotice>
            ) : (
              <div className="panel-pad-x flex flex-col gap-3.5 py-[19px]">
                {budgets.map((budget) => (
                  <MeterRow
                    key={budget.id}
                    label={budget.label}
                    spent={budget.spent}
                    limit={budget.limit}
                    width={budget.width}
                    fillClass={BG_TONE[budget.tone]}
                  />
                ))}
              </div>
            )}
          </Panel>
        </SplitGrid>
      </ScreenStack>
    </AppScreen>
  );
}

/**
 * The four cards, or one line saying why there are none.
 *
 * Rows in another currency are named underneath rather than folded in, the same
 * way the wallets and budgets totals state what they cannot absorb.
 */
function MonthStats({ screen }: { readonly screen: DashboardScreen }) {
  if (screen.monthError) {
    return <PanelNotice tone="expense">{screen.monthError}</PanelNotice>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      <StatGrid>
        {screen.stats.map((stat) => (
          <SummaryStatCard key={stat.id} stat={stat} />
        ))}
      </StatGrid>
      {screen.uncountedNote ? (
        <p className="text-meta text-muted">{screen.uncountedNote}</p>
      ) : null}
    </div>
  );
}

/** Bars with nothing in them are a flat axis, which says less than a sentence. */
function TrendPanelBody({ screen }: { readonly screen: DashboardScreen }) {
  if (screen.trendError) {
    return <PanelNotice tone="expense">{screen.trendError}</PanelNotice>;
  }
  if (screen.bars.length === 0) {
    return <PanelNotice>No entries in this range yet.</PanelNotice>;
  }

  return (
    <>
      <LegendList className="mt-3.5">
        <LegendItem label="Income" fillClass="bg-income" />
        <LegendItem label="Expense" fillClass="bg-expense" />
      </LegendList>
      <TrendChart bars={screen.bars} />
    </>
  );
}

/** A ring with no spend in it is a circle of nothing, so it says that instead. */
function CategoryPanelBody({ screen }: { readonly screen: DashboardScreen }) {
  if (screen.monthError) {
    return <PanelNotice tone="expense">{screen.monthError}</PanelNotice>;
  }
  if (screen.donut.segments.length === 0) {
    return (
      <PanelNotice>
        No spending recorded this month, so there is nothing to split yet.
      </PanelNotice>
    );
  }
  return <CategoryDonut data={screen.donut} />;
}

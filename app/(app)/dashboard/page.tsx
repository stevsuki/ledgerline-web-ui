import type { Metadata } from "next";
import Link from "next/link";

import { CategoryDonut } from "@/components/dashboard/category-donut";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { AppScreen } from "@/components/shell/app-screen";
import { RecentTransactionRow } from "@/components/transactions/rows";
import { Icon } from "@/components/ui/icon";
import { ScreenStack, SplitGrid } from "@/components/ui/layout";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { LegendItem, LegendList, MeterRow } from "@/components/ui/primitives";
import { StatGrid, SummaryStatCard } from "@/components/ui/stats";
import {
  SUMMARY_STATS,
  TREND_RANGE_LABEL,
  getSpendDonut,
  getTrend,
} from "@/lib/data/analytics";
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

export default async function DashboardPage(
  props: Readonly<PageProps<"/dashboard">>,
) {
  const params = await props.searchParams;
  const rawTrend = Array.isArray(params.trend) ? params.trend[0] : params.trend;
  const mode: TrendMode = rawTrend === "monthly" ? "monthly" : "weekly";

  const [bars, donut, recent, budgets] = await Promise.all([
    getTrend(mode),
    getSpendDonut(),
    getRecentTransactions(),
    getBudgetsPreview(),
  ]);

  return (
    <AppScreen
      title={PAGE_META.dashboard.title}
      subtitle={PAGE_META.dashboard.subtitle}
      maxWidth={1340}
    >
      <ScreenStack gap={20}>
        <StatGrid>
          {SUMMARY_STATS.map((stat) => (
            <SummaryStatCard key={stat.id} stat={stat} />
          ))}
        </StatGrid>

        <SplitGrid>
          <Panel className="panel-pad">
            <div className="border-divider flex flex-wrap items-start justify-between gap-3 border-b pb-3.5">
              <div className="min-w-0 flex-1">
                <h2 className="panel-title">Income vs expense</h2>
                <p className="text-meta text-muted mt-0.5">
                  {TREND_RANGE_LABEL[mode]}
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
                    aria-current={option === mode ? "true" : undefined}
                    className="seg-opt capitalize"
                  >
                    {option}
                  </Link>
                ))}
              </div>
            </div>

            <LegendList className="mt-3.5">
              <LegendItem label="Income" fillClass="bg-income" />
              <LegendItem label="Expense" fillClass="bg-expense" />
            </LegendList>

            <TrendChart bars={bars} />
          </Panel>

          <Panel className="panel-pad">
            <div className="border-divider border-b pb-3.5">
              <h2 className="panel-title">Spending by category</h2>
              <p className="text-meta text-muted mt-0.5">
                August 2026 · {donut.totalValue}
              </p>
            </div>
            <CategoryDonut data={donut} />
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
            <ul>
              {recent.map((transaction) => (
                <RecentTransactionRow
                  key={transaction.id}
                  transaction={transaction}
                />
              ))}
            </ul>
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
          </Panel>
        </SplitGrid>
      </ScreenStack>
    </AppScreen>
  );
}

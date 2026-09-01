import type { Metadata } from "next";
import Link from "next/link";

import { CategoryDonut } from "@/components/dashboard/category-donut";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { AppScreen } from "@/components/shell/app-screen";
import { RecentTransactionRow } from "@/components/transactions/rows";
import { Icon } from "@/components/ui/icon";
import { ScreenStack, SplitGrid } from "@/components/ui/layout";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { ProgressTrack } from "@/components/ui/primitives";
import { StatGrid, SummaryStatCard } from "@/components/ui/stats";
import { SUMMARY_STATS, TREND_RANGE_LABEL, getSpendDonut, getTrend } from "@/lib/data/analytics";
import { getBudgetsPreview } from "@/lib/data/budgets";
import { getRecentTransactions } from "@/lib/data/transactions";
import { PAGE_META } from "@/lib/nav";
import { BG_TONE, cx } from "@/lib/tone";
import type { TrendMode } from "@/types/ledger";

export const metadata: Metadata = { title: PAGE_META.dashboard.title };

const TREND_MODES = ["weekly", "monthly"] as const satisfies readonly TrendMode[];

export default async function DashboardPage(props: Readonly<PageProps<"/dashboard">>) {
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
		<AppScreen title={PAGE_META.dashboard.title} subtitle={PAGE_META.dashboard.subtitle} maxWidth={1340}>
			<ScreenStack gap={20}>
				<StatGrid>
					{SUMMARY_STATS.map((stat) => (
						<SummaryStatCard key={stat.id} stat={stat} />
					))}
				</StatGrid>

				<SplitGrid>
					<Panel className="p-6">
						<div className="border-divider flex items-start justify-between gap-3 border-b pb-3.5">
							<div className="min-w-0 flex-1">
								<h2 className="panel-title whitespace-nowrap">Income vs expense</h2>
								<p className="text-meta text-muted mt-0.5">{TREND_RANGE_LABEL[mode]}</p>
							</div>
							{/* The range is a URL filter, so the bars come back from the
                  server already scaled — not re-derived in the browser. */}
							<div className="seg" role="group" aria-label="Trend range">
								{TREND_MODES.map((option) => (
									<Link
										key={option}
										href={option === "weekly" ? "/dashboard" : `/dashboard?trend=${option}`}
										aria-current={option === mode ? "true" : undefined}
										className="seg-opt capitalize"
									>
										{option}
									</Link>
								))}
							</div>
						</div>

						<div className="text-meta text-muted mt-3.5 flex gap-4.5">
							<LegendSwatch label="Income" className="bg-income" />
							<LegendSwatch label="Expense" className="bg-expense" />
						</div>

						<TrendChart bars={bars} />
					</Panel>

					<Panel className="p-6">
						<div className="border-divider border-b pb-3.5">
							<h2 className="panel-title">Spending by category</h2>
							<p className="text-meta text-muted mt-0.5">August 2026 · {donut.totalValue}</p>
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
								<RecentTransactionRow key={transaction.id} transaction={transaction} />
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
						<div className="flex flex-col gap-3.5 px-6 py-[19px]">
							{budgets.map((budget) => (
								<div key={budget.id}>
									<div className="flex items-baseline gap-2 text-note">
										<span className="min-w-0 flex-1">{budget.label}</span>
										<span className="text-muted tabular-nums">
											{budget.spent} / {budget.limit}
										</span>
									</div>
									<ProgressTrack small className="mt-1.5" width={budget.width} fillClass={BG_TONE[budget.tone]} />
								</div>
							))}
						</div>
					</Panel>
				</SplitGrid>
			</ScreenStack>
		</AppScreen>
	);
}

function LegendSwatch({ label, className }: { readonly label: string; readonly className: string }) {
	return (
		<span className="flex items-center gap-1.5">
			<span aria-hidden="true" className={cx("size-2.5 rounded-[3px]", className)} />
			{label}
		</span>
	);
}

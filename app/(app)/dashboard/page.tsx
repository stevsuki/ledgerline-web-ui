import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";

import { CategoryDonut } from "@/components/dashboard/category-donut";
import {
  EmptyDashboard,
  HiddenWidgets,
  LayoutToolbar,
  WidgetEditBar,
  WidgetSlot,
} from "@/components/dashboard/layout-editor";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { AppScreen } from "@/components/shell/app-screen";
import { RecentTransactionRow } from "@/components/transactions/rows";
import { OpenTransactionButton } from "@/components/ui/action-button";
import { Icon } from "@/components/ui/icon";
import { ScreenStack, SplitGrid } from "@/components/ui/layout";
import { Panel, PanelHeader, PanelNotice } from "@/components/ui/panel";
import { LegendItem, LegendList, MeterRow } from "@/components/ui/primitives";
import { StatGrid, SummaryStatCard } from "@/components/ui/stats";
import {
  getDashboardScreen,
  getSetupChecklist,
  type DashboardScreen,
  type SetupChecklist,
  type SetupStep,
} from "@/lib/data/analytics";
import { getBudgetsPreview, type BudgetRow } from "@/lib/data/budgets";
import {
  DASHBOARD_LAYOUT_COOKIE,
  hiddenWidgets,
  parseLayout,
  toRows,
  visibleWidgets,
  type DashboardLayout,
  type LayoutRow,
  type WidgetId,
} from "@/lib/dashboard-layout";
import {
  getRecentTransactions,
  type RecentTransactions,
} from "@/lib/data/transactions";
import { PAGE_META } from "@/lib/nav";
import { BG_TONE, cx } from "@/lib/tone";
import type { TrendMode } from "@/types/ledger";

export const metadata: Metadata = { title: PAGE_META.dashboard.title };

const TREND_MODES = [
  "weekly",
  "monthly",
] as const satisfies readonly TrendMode[];

/** The one flag this screen keeps in the URL besides the trend range. */
const EDIT_FLAG = "1";

/** `/dashboard` with only the params that differ from the default. */
function dashboardHref(mode: TrendMode, editing: boolean): string {
  const query = new URLSearchParams();
  if (mode !== "weekly") {
    query.set("trend", mode);
  }
  if (editing) {
    query.set("edit", EDIT_FLAG);
  }
  const search = query.toString();
  return search === "" ? "/dashboard" : `/dashboard?${search}`;
}

function firstOf(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Everything a panel may draw from; each takes the part it needs. */
type WidgetData = {
  readonly screen: DashboardScreen;
  readonly recent: RecentTransactions;
  readonly budgets: readonly BudgetRow[];
  readonly mode: TrendMode;
  readonly editing: boolean;
};

const WIDGET_BY_ID: Readonly<
  Record<WidgetId, (data: WidgetData) => ReactNode>
> = {
  stats: ({ screen }) => <MonthStats screen={screen} />,
  trend: (data) => <TrendWidget {...data} />,
  categories: ({ screen }) => <CategoriesWidget screen={screen} />,
  recent: ({ recent }) => <RecentWidget recent={recent} />,
  budgets: ({ budgets }) => <BudgetsWidget budgets={budgets} />,
};

/**
 * Every panel here is read on its own, and says so on its own.
 *
 * Unlike `/budgets`, no panel on this screen states the sum of another, so one
 * unreadable answer is one panel explaining itself beside three that are still
 * true — taking the whole page down would be the wrong trade on the screen the
 * app opens to. The month's figures are the exception: the cards and the donut
 * come from a single read, so they carry one error between them.
 *
 * That independence is also what lets the reader arrange them: which panels
 * show, in what order and how wide is `parseLayout` over a cookie, read here
 * so the first frame is already laid out the way it was left.
 */
export default async function DashboardPage(
  props: Readonly<PageProps<"/dashboard">>,
) {
  const params = await props.searchParams;
  const mode: TrendMode =
    firstOf(params.trend) === "monthly" ? "monthly" : "weekly";
  const editing = firstOf(params.edit) === EDIT_FLAG;

  const store = await cookies();
  const layout = parseLayout(store.get(DASHBOARD_LAYOUT_COOKIE)?.value);
  const shown = visibleWidgets(layout);
  const showsBudgets = shown.some((placement) => placement.id === "budgets");

  const [screen, recent, budgets] = await Promise.all([
    getDashboardScreen(mode),
    getRecentTransactions(),
    // A hidden panel is not worth its request.
    showsBudgets ? getBudgetsPreview() : NO_BUDGETS,
  ]);

  // Read last, because what is left to set up is partly what was just read.
  const setup = await getSetupChecklist(recent);

  const data: WidgetData = { screen, recent, budgets, mode, editing };
  const editHref = dashboardHref(mode, true);

  return (
    <AppScreen
      title={PAGE_META.dashboard.title}
      subtitle={screen.subtitle}
      maxWidth={1340}
    >
      <ScreenStack gap={20}>
        {setup.show ? <SetupPanel checklist={setup} /> : null}

        <LayoutToolbar
          editing={editing}
          editHref={editHref}
          doneHref={dashboardHref(mode, false)}
        />

        {toRows(layout).map((row) => (
          <WidgetRow key={row.key} row={row} shown={shown} data={data} />
        ))}

        {shown.length === 0 && !editing ? (
          <EmptyDashboard editHref={editHref} />
        ) : null}
        {editing ? <HiddenWidgets hidden={hiddenWidgets(layout)} /> : null}
      </ScreenStack>
    </AppScreen>
  );
}

const NO_BUDGETS: readonly BudgetRow[] = [];

/** One row of the arrangement: a panel alone, or two halves side by side. */
function WidgetRow({
  row,
  shown,
  data,
}: {
  readonly row: LayoutRow;
  readonly shown: DashboardLayout;
  readonly data: WidgetData;
}) {
  const slots = row.widgets.map((placement) => (
    <WidgetSlot
      key={placement.id}
      editBar={
        data.editing ? (
          <WidgetEditBar
            placement={placement}
            isFirst={shown[0]?.id === placement.id}
            isLast={shown.at(-1)?.id === placement.id}
          />
        ) : null
      }
    >
      {WIDGET_BY_ID[placement.id](data)}
    </WidgetSlot>
  ));

  return row.widgets.length > 1 ? <SplitGrid>{slots}</SplitGrid> : slots;
}

function TrendWidget({ screen, mode, editing }: WidgetData) {
  return (
    <Panel className="panel-pad">
      <div className="border-divider flex flex-wrap items-start justify-between gap-3 border-b pb-3.5">
        <div className="min-w-0 flex-1">
          <h2 className="panel-title">Income vs expense</h2>
          <p className="text-meta text-muted mt-0.5">{screen.trendLabel}</p>
        </div>
        {/* The range is a URL filter, so the bars come back from the server already scaled. */}
        <div className="seg" role="group" aria-label="Trend range">
          {TREND_MODES.map((option) => (
            <Link
              key={option}
              href={dashboardHref(option, editing)}
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
  );
}

function CategoriesWidget({ screen }: { readonly screen: DashboardScreen }) {
  return (
    <Panel className="panel-pad">
      <div className="border-divider border-b pb-3.5">
        <h2 className="panel-title">Spending by category</h2>
        <p className="text-meta text-muted mt-0.5">{screen.donutCaption}</p>
      </div>
      <CategoryPanelBody screen={screen} />
    </Panel>
  );
}

function RecentWidget({ recent }: { readonly recent: RecentTransactions }) {
  return (
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
      <RecentPanelBody recent={recent} />
    </Panel>
  );
}

function BudgetsWidget({ budgets }: { readonly budgets: readonly BudgetRow[] }) {
  return (
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
        <PanelNotice
          action={
            <Link href="/budgets" className="btn btn-secondary text-note">
              Set a budget
              <Icon name="right" size={14} />
            </Link>
          }
        >
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
  );
}

/**
 * The card that answers "where do I start".
 *
 * It sits above the stats rather than inside one of the panels below, because
 * the question it answers is about the whole screen and not about one panel on
 * it. `getSetupChecklist` takes it away for good once the last step is ticked.
 */
function SetupPanel({ checklist }: { readonly checklist: SetupChecklist }) {
  return (
    <Panel className="panel-pad">
      <div className="border-divider flex flex-wrap items-start justify-between gap-3 border-b pb-3.5">
        <div className="min-w-0 flex-1">
          <h2 className="panel-title">Set up your ledger</h2>
          <p className="text-meta text-muted mt-0.5">
            A few steps, and every panel below starts answering.
          </p>
        </div>
        <span className="tag tag-neutral flex-none">
          {checklist.doneCount} of {checklist.steps.length} done
        </span>
      </div>

      <ol>
        {checklist.steps.map((step) => (
          <SetupRow key={step.id} step={step} />
        ))}
      </ol>
    </Panel>
  );
}

function SetupRow({ step }: { readonly step: SetupStep }) {
  return (
    <li className="border-divider flex flex-wrap items-center gap-3 border-b py-3.5 last:border-b-0 last:pb-0">
      <span
        aria-hidden="true"
        className={cx(
          "grid size-[22px] flex-none place-items-center rounded-full border",
          step.done
            ? "border-income/45 bg-income/15 text-income"
            : "border-divider text-muted",
        )}
      >
        {step.done ? <Icon name="check" size={13} /> : null}
      </span>

      <div className="min-w-0 flex-1">
        <p className={cx("text-row font-semibold", step.done && "text-muted")}>
          {step.label}
        </p>
        <p className="text-meta text-muted mt-px">{step.hint}</p>
      </div>

      {step.done ? null : <SetupAction step={step} />}
    </li>
  );
}

/** The last step has no screen of its own — it opens the shared sheet. */
function SetupAction({ step }: { readonly step: SetupStep }) {
  if (step.href === "") {
    return (
      <OpenTransactionButton className="btn btn-primary text-note flex-none">
        <Icon name="plus" size={14} />
        {step.action}
      </OpenTransactionButton>
    );
  }

  return (
    <Link href={step.href} className="btn btn-secondary text-note flex-none">
      {step.action}
      <Icon name="right" size={14} />
    </Link>
  );
}

/**
 * The newest entries, or the one thing worth doing instead of reading them.
 *
 * An unreachable API and an account that has recorded nothing are not the same
 * empty panel, so they do not print the same line — and only the second is
 * something the reader can act on.
 */
function RecentPanelBody({ recent }: { readonly recent: RecentTransactions }) {
  if (recent.error) {
    return <PanelNotice tone="expense">{recent.error}</PanelNotice>;
  }
  if (recent.items.length === 0) {
    return (
      <PanelNotice
        action={
          <OpenTransactionButton className="btn btn-secondary text-note">
            <Icon name="plus" size={14} />
            Add transaction
          </OpenTransactionButton>
        }
      >
        Nothing recorded yet. The first entry you add shows up here.
      </PanelNotice>
    );
  }

  return (
    <ul>
      {recent.items.map((entry) => (
        <RecentTransactionRow key={entry.id} entry={entry} />
      ))}
    </ul>
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
    return (
      <PanelNotice
        action={
          <OpenTransactionButton className="btn btn-secondary text-note">
            <Icon name="plus" size={14} />
            Add transaction
          </OpenTransactionButton>
        }
      >
        No entries in this range yet.
      </PanelNotice>
    );
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
      <PanelNotice
        action={
          <Link href="/categories" className="btn btn-secondary text-note">
            See categories
            <Icon name="right" size={14} />
          </Link>
        }
      >
        No spending recorded this month, so there is nothing to split yet.
      </PanelNotice>
    );
  }
  return <CategoryDonut data={screen.donut} />;
}

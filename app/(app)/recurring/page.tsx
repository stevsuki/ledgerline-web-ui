import type { Metadata } from "next";
import Link from "next/link";

import {
  NewRecurringForm,
  RecurringConfirmButton,
  RecurringEditButton,
  RecurringEditorProvider,
} from "@/components/recurring/recurring-editor";
import { AppScreen } from "@/components/shell/app-screen";
import { ScreenStack, SplitGrid } from "@/components/ui/layout";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Panel, PanelNotice, SectionPanel } from "@/components/ui/panel";
import { IconTile } from "@/components/ui/primitives";
import { StatRow } from "@/components/ui/stats";
import {
  RECURRING_PAGE_SIZES,
  getRecurringScreen,
  type RecurringRow,
} from "@/lib/data/recurring-list";
import { PAGE_META } from "@/lib/nav";
import { readPage, readSize } from "@/lib/search-params";
import { BG_TONE, TEXT_TONE, cx } from "@/lib/tone";

export const metadata: Metadata = { title: PAGE_META.recurring.title };

const BASE_PATH = "/recurring";
const WALLETS_PATH = "/wallets";

/**
 * The list shares its row with the form, so it folds on the panel's own width
 * rather than the viewport's: narrow, only the item, its amount and its actions stay.
 */
const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto_66px] items-center gap-3 @2xl:grid-cols-[minmax(0,1fr)_96px_150px_110px_66px] @2xl:gap-3.5";

const WIDE_ONLY = "hidden @2xl:block";

export default async function RecurringPage(
  props: Readonly<PageProps<"/recurring">>,
) {
  const params = await props.searchParams;
  const screen = await getRecurringScreen(
    readPage(params),
    readSize(params, RECURRING_PAGE_SIZES),
  );

  return (
    <AppScreen title={PAGE_META.recurring.title} subtitle={screen.subtitle}>
      <RecurringEditorProvider
        wallets={screen.wallets}
        categories={screen.categories}
        today={screen.today}
      >
        <ScreenStack>
          {screen.error ? (
            <PanelNotice tone="expense">{screen.error}</PanelNotice>
          ) : null}

          {screen.stats.length > 0 ? (
            <StatRow stats={screen.stats} size="regular" />
          ) : null}

          <SplitGrid ratio={1.5}>
            <Panel className="@container">
              <div className={cx("column-head", ROW_GRID)}>
                <span>Item</span>
                <span className={WIDE_ONLY}>Frequency</span>
                <span className={WIDE_ONLY}>Next due</span>
                <span className="text-right">Amount</span>
                <span className="sr-only">Actions</span>
              </div>

              {screen.page.total === 0 && !screen.error ? (
                <PanelNotice>Nothing is scheduled yet.</PanelNotice>
              ) : null}

              <ul>
                {screen.page.items.map((item) => (
                  <RecurringListRow key={item.id} item={item} />
                ))}
              </ul>

              <PaginationBar
                paged={screen.page}
                basePath={BASE_PATH}
                params={params}
                unit="items"
                sizes={RECURRING_PAGE_SIZES}
                formId="recurring"
              />
            </Panel>

            <SectionPanel
              className="lg:sticky lg:top-[calc(var(--header-h)+24px)]"
              title="New recurring item"
              description="Nothing is recorded until you confirm each payment."
            >
              {screen.draft ? (
                <NewRecurringForm
                  key={screen.page.total}
                  draft={screen.draft}
                  wallets={screen.wallets}
                  categories={screen.categories}
                />
              ) : (
                <p className="text-muted text-note">
                  {screen.emptyNote}{" "}
                  <Link href={WALLETS_PATH} className="text-text underline">
                    Open wallets
                  </Link>
                </p>
              )}
            </SectionPanel>
          </SplitGrid>
        </ScreenStack>
      </RecurringEditorProvider>
    </AppScreen>
  );
}

function DueMark({
  item,
  className,
}: {
  readonly item: RecurringRow;
  readonly className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 font-medium whitespace-nowrap",
        TEXT_TONE[item.dueTone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cx("size-1.5 shrink-0 rounded-full", BG_TONE[item.dueTone])}
      />
      {item.dueLabel}
    </span>
  );
}

function RecurringListRow({ item }: { readonly item: RecurringRow }) {
  const isPaused = item.dueState === "paused";

  return (
    <li className={cx("panel-row-dense", ROW_GRID)}>
      <div className="flex min-w-0 items-center gap-3">
        <IconTile name={item.icon} dense />
        <div className="min-w-0">
          <p className="text-row truncate">{item.name}</p>
          <p className="text-meta text-muted truncate">
            {item.wallet}
            <span className="@2xl:hidden">
              {" · "}
              {item.frequency}
              {item.dueDate ? ` · ${item.dueDate}` : null}
            </span>
          </p>
        </div>
      </div>
      <span className={cx("text-muted text-note", WIDE_ONLY)}>
        {item.frequency}
      </span>
      <span className={WIDE_ONLY}>
        <DueMark item={item} className="text-note" />
        {item.dueDate ? (
          <span className="text-meta text-muted block pl-3">{item.dueDate}</span>
        ) : null}
      </span>
      <span className="flex flex-col items-end gap-0.5">
        <span
          className={cx(
            "text-row font-semibold tabular-nums",
            isPaused ? TEXT_TONE.muted : TEXT_TONE.text,
          )}
        >
          {item.amount}
        </span>
        <DueMark item={item} className="text-meta @2xl:hidden" />
      </span>
      <span className="flex justify-end gap-1.5">
        {isPaused ? null : <RecurringConfirmButton row={item} />}
        <RecurringEditButton row={item} />
      </span>
    </li>
  );
}

import type { Metadata } from "next";

import { AppScreen } from "@/components/shell/app-screen";
import { ActionButton } from "@/components/ui/action-button";
import { SelectField, TextField, ToggleRow } from "@/components/ui/form";
import { ScreenStack, SplitGrid } from "@/components/ui/layout";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Panel, SectionPanel } from "@/components/ui/panel";
import { IconTile, Tag } from "@/components/ui/primitives";
import { StatRow } from "@/components/ui/stats";
import {
  RECURRING_FREQUENCIES,
  RECURRING_PAGE_SIZES,
  getRecurringStats,
  recurringSubtitle,
  RECURRING_WALLETS,
  getRecurring,
} from "@/lib/data/recurring";
import { PAGE_META } from "@/lib/nav";
import { readPage, readSize } from "@/lib/search-params";
import { TEXT_TONE, cx } from "@/lib/tone";

export const metadata: Metadata = { title: PAGE_META.recurring.title };

const BASE_PATH = "/recurring";

/** Under `md` only the item and its amount stay; the rest folds into the row. */
const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[1fr_120px_130px_110px] md:gap-3.5";

const MD_ONLY = "hidden md:block";

export default async function RecurringPage(props: Readonly<PageProps<"/recurring">>) {
  const params = await props.searchParams;
  const page = await getRecurring(
    readPage(params),
    readSize(params, RECURRING_PAGE_SIZES),
  );

  return (
    <AppScreen
      title={PAGE_META.recurring.title}
      subtitle={recurringSubtitle()}
    >
      <ScreenStack>
        <StatRow stats={getRecurringStats()} size="regular" />

        <SplitGrid ratio={1.5}>
          <Panel>
            <div className={cx("column-head", ROW_GRID)}>
              <span>Item</span>
              <span className={MD_ONLY}>Frequency</span>
              <span className={MD_ONLY}>Next due</span>
              <span className="text-right">Amount</span>
            </div>

            <ul>
              {page.items.map((item) => (
                <li key={item.id} className={cx("panel-row-dense", ROW_GRID)}>
                  <div className="flex min-w-0 items-center gap-3">
                    <IconTile name={item.icon} dense />
                    <div className="min-w-0">
                      <p className="text-row truncate">{item.name}</p>
                      <p className="text-meta text-muted truncate">
                        {item.wallet}
                      </p>
                      <p className="text-meta text-muted truncate md:hidden">
                        {item.frequency} · {item.due}
                      </p>
                    </div>
                  </div>
                  <span className={cx("text-muted text-note", MD_ONLY)}>
                    {item.frequency}
                  </span>
                  <span className={MD_ONLY}>
                    <Tag variant={item.isDueSoon ? "accent" : "neutral"}>
                      {item.due}
                    </Tag>
                  </span>
                  <span
                    className={cx(
                      "text-row text-right font-semibold tabular-nums",
                      item.isPaused ? TEXT_TONE.muted : TEXT_TONE.text,
                    )}
                  >
                    {item.amount}
                  </span>
                </li>
              ))}
            </ul>

            <PaginationBar
              paged={page}
              basePath={BASE_PATH}
              params={params}
              unit="items"
              sizes={RECURRING_PAGE_SIZES}
              formId="recurring"
            />
          </Panel>

          <SectionPanel title="New recurring item">
            <TextField id="rec-name" label="Name" defaultValue="Notion Plus" />
            <TextField id="rec-amount" label="Amount" defaultValue="Rp150.000" />
            <SelectField
              id="rec-frequency"
              label="Frequency"
              options={RECURRING_FREQUENCIES}
            />
            <TextField
              id="rec-due"
              label="Next due"
              type="date"
              defaultValue="2026-09-05"
            />
            <SelectField
              id="rec-wallet"
              label="Wallet"
              options={RECURRING_WALLETS}
            />
            <ToggleRow
              id="rec-remind"
              label="Remind me 3 days before"
              defaultChecked
            />
            <ActionButton
              className="btn btn-primary btn-block"
              message="Recurring item scheduled"
            >
              Schedule item
            </ActionButton>
          </SectionPanel>
        </SplitGrid>
      </ScreenStack>
    </AppScreen>
  );
}

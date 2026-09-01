import type { Metadata } from "next";

import { AppScreen } from "@/components/shell/app-screen";
import { ActionButton } from "@/components/ui/action-button";
import { SelectField, TextField, ToggleRow } from "@/components/ui/form";
import { ScreenStack, SplitGrid } from "@/components/ui/layout";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Panel } from "@/components/ui/panel";
import { IconTile, Tag } from "@/components/ui/primitives";
import { StatRow } from "@/components/ui/stats";
import {
  RECURRING_FREQUENCIES,
  RECURRING_PAGE_SIZES,
  RECURRING_STATS,
  RECURRING_WALLETS,
  getRecurring,
} from "@/lib/data/recurring";
import { PAGE_META } from "@/lib/nav";
import { readPage, readSize } from "@/lib/search-params";
import { TEXT_TONE, cx } from "@/lib/tone";

export const metadata: Metadata = { title: PAGE_META.recurring.title };

const BASE_PATH = "/recurring";
const ROW_GRID = "grid grid-cols-[1fr_120px_130px_110px] items-center gap-3.5";

export default async function RecurringPage(props: PageProps<"/recurring">) {
  const params = await props.searchParams;
  const page = await getRecurring(
    readPage(params),
    readSize(params, RECURRING_PAGE_SIZES),
  );

  return (
    <AppScreen
      title={PAGE_META.recurring.title}
      subtitle={PAGE_META.recurring.subtitle}
    >
      <ScreenStack>
        <StatRow stats={RECURRING_STATS} size="regular" />

        <SplitGrid ratio={1.5}>
          <Panel>
            <div className={cx("column-head", ROW_GRID)}>
              <span>Item</span>
              <span>Frequency</span>
              <span>Next due</span>
              <span className="text-right">Amount</span>
            </div>

            <ul>
              {page.items.map((item) => (
                <li key={item.id} className={cx("panel-row-dense", ROW_GRID)}>
                  <div className="flex min-w-0 items-center gap-3">
                    <IconTile name={item.icon} dense />
                    <div className="min-w-0">
                      <p className="text-row truncate">{item.name}</p>
                      <p className="text-meta text-muted">{item.wallet}</p>
                    </div>
                  </div>
                  <span className="text-muted text-note">{item.frequency}</span>
                  <span>
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

          <Panel className="p-6">
            <h2 className="panel-title">New recurring item</h2>
            <div className="mt-4 flex flex-col gap-3">
              <TextField id="rec-name" label="Name" defaultValue="Notion Plus" />
              <TextField
                id="rec-amount"
                label="Amount"
                defaultValue="Rp150.000"
              />
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
            </div>
          </Panel>
        </SplitGrid>
      </ScreenStack>
    </AppScreen>
  );
}

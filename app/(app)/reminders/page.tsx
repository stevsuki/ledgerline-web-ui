import type { Metadata } from "next";

import { AppScreen } from "@/components/shell/app-screen";
import { ToggleRow } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { ScreenStack, SplitGrid } from "@/components/ui/layout";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Tag } from "@/components/ui/primitives";
import {
  DELIVERY_CHANNELS,
  getBills,
  getBudgetAlerts,
} from "@/lib/data/reminders";
import { PAGE_META } from "@/lib/nav";
import { TEXT_TONE, cx } from "@/lib/tone";

export const metadata: Metadata = { title: PAGE_META.reminders.title };

export default async function RemindersPage() {
  const [bills, alerts] = await Promise.all([getBills(), getBudgetAlerts()]);

  return (
    <AppScreen
      title={PAGE_META.reminders.title}
      subtitle={PAGE_META.reminders.subtitle}
    >
      <ScreenStack>
        <SplitGrid>
          <Panel>
            <PanelHeader
              title="Upcoming bills"
              action={<Tag>Next 30 days</Tag>}
            />
            <ul>
              {bills.map((bill) => (
                <li
                  key={bill.id}
                  className="panel-row flex items-center gap-3.5 py-4"
                >
                  <span className="inset grid size-[44px] flex-none place-content-center text-center leading-none">
                    <span className="text-muted text-[9.5px] tracking-[0.1em] uppercase">
                      {bill.month}
                    </span>
                    <span className="mt-0.5 text-[15px] font-semibold tabular-nums">
                      {bill.day}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-row truncate">{bill.name}</p>
                    <p className="text-meta text-muted mt-px">{bill.meta}</p>
                  </div>
                  <Tag variant={bill.isImminent ? "accent" : "neutral"}>
                    {bill.state}
                  </Tag>
                  <span className="text-row w-[110px] text-right font-semibold tabular-nums">
                    {bill.amount}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <div className="flex flex-col gap-5">
            <Panel>
              <h2 className="panel-head panel-title">Budget alerts</h2>
              <ul>
                {alerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="panel-row flex items-start gap-[11px] py-4"
                  >
                    <Icon
                      name={alert.icon}
                      className={cx("mt-0.5", TEXT_TONE[alert.tone])}
                    />
                    <div>
                      <p className="text-[13px] leading-snug">{alert.title}</p>
                      <p className="text-meta text-muted mt-0.5">
                        {alert.meta}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel className="p-6">
              <h2 className="panel-title">Delivery</h2>
              <div className="mt-3.5 flex flex-col gap-3">
                {DELIVERY_CHANNELS.map((channel) => (
                  <ToggleRow
                    key={channel.id}
                    id={`delivery-${channel.id}`}
                    label={channel.label}
                    defaultChecked={channel.enabled}
                  />
                ))}
              </div>
            </Panel>
          </div>
        </SplitGrid>
      </ScreenStack>
    </AppScreen>
  );
}

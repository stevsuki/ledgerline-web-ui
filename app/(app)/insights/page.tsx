import type { Metadata } from "next";

import { AppScreen } from "@/components/shell/app-screen";
import { ActionButton } from "@/components/ui/action-button";
import { Icon } from "@/components/ui/icon";
import { CardGrid, ScreenStack, SplitGrid } from "@/components/ui/layout";
import { Panel, PanelHeader, SectionPanel } from "@/components/ui/panel";
import { LegendItem, LegendList } from "@/components/ui/primitives";
import {
  COMPARE_LEGEND,
  getCategoryComparison,
  getCategoryRanking,
  getInsights,
} from "@/lib/data/analytics";
import { PAGE_META } from "@/lib/nav";
import { RAMP_BG, TEXT_TONE, cx } from "@/lib/tone";

export const metadata: Metadata = { title: PAGE_META.insights.title };

export default async function InsightsPage() {
  const [comparison, ranking, insights] = await Promise.all([
    getCategoryComparison(),
    getCategoryRanking(),
    getInsights(),
  ]);

  return (
    <AppScreen
      title={PAGE_META.insights.title}
      subtitle={PAGE_META.insights.subtitle}
    >
      <ScreenStack>
        <CardGrid>
          {insights.map((insight) => (
            <Panel key={insight.id} className="panel-pad flex flex-col gap-2">
              <p
                className={cx(
                  "flex items-center gap-2",
                  TEXT_TONE[insight.tone],
                )}
              >
                <Icon name={insight.icon} size={15} />
                <span className="text-kicker font-semibold tracking-[0.12em] uppercase">
                  {insight.kicker}
                </span>
              </p>
              <h2 className="text-lg leading-tight font-semibold tracking-[-0.02em]">
                {insight.title}
              </h2>
              <p className="text-muted text-note">{insight.body}</p>
            </Panel>
          ))}
        </CardGrid>

        <SplitGrid>
          <SectionPanel
            title="Category by month"
            description="Six months, top four categories"
            bodyClassName="mt-5"
          >
            <div className="flex h-[190px] items-end gap-2 sm:gap-3">
              {comparison.map((column) => (
                <div
                  key={column.label}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                >
                  <div className="flex h-full w-full flex-col justify-end">
                    {column.parts.map((part) => (
                      <span
                        key={part.id}
                        title={part.title}
                        className={cx("animate-grow w-full", RAMP_BG[part.step])}
                        style={{ height: part.height }}
                      />
                    ))}
                  </div>
                  <span className="text-muted truncate text-[11px] font-semibold">
                    {column.label}
                  </span>
                </div>
              ))}
            </div>

            <LegendList className="border-divider mt-4 border-t pt-3.5">
              {COMPARE_LEGEND.map((entry) => (
                <LegendItem
                  key={entry.id}
                  label={entry.label}
                  fillClass={RAMP_BG[entry.step]}
                />
              ))}
            </LegendList>
          </SectionPanel>

          <Panel>
            <PanelHeader title="Top categories" />
            <ol>
              {ranking.map((entry) => (
                <li
                  key={entry.label}
                  className="panel-row-dense flex items-center gap-3"
                >
                  <span className="text-muted w-[18px] flex-none text-[13px] font-semibold">
                    {entry.rank}
                  </span>
                  <span className="text-row min-w-0 flex-1 truncate">
                    {entry.label}
                  </span>
                  <span
                    className={cx(
                      "text-note flex-none font-semibold",
                      TEXT_TONE[entry.deltaTone],
                    )}
                  >
                    {entry.delta}
                  </span>
                  <span className="flex-none text-right text-[13px] tabular-nums sm:w-[104px]">
                    {entry.value}
                  </span>
                </li>
              ))}
            </ol>
            <div className="panel-pad-x py-[17px]">
              <ActionButton
                className="btn btn-secondary btn-block"
                message="Export queued — check your email"
              >
                <Icon name="download" size={15} />
                Export analysis (CSV)
              </ActionButton>
            </div>
          </Panel>
        </SplitGrid>
      </ScreenStack>
    </AppScreen>
  );
}

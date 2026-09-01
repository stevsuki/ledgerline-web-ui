import type { Metadata } from "next";

import { AppScreen } from "@/components/shell/app-screen";
import { ActionButton } from "@/components/ui/action-button";
import { Icon } from "@/components/ui/icon";
import { CardGrid, ScreenStack, SplitGrid } from "@/components/ui/layout";
import { Panel } from "@/components/ui/panel";
import {
  COMPARE_LEGEND,
  INSIGHTS,
  getCategoryComparison,
  getCategoryRanking,
} from "@/lib/data/analytics";
import { PAGE_META } from "@/lib/nav";
import { RAMP_BG, TEXT_TONE, cx } from "@/lib/tone";

export const metadata: Metadata = { title: PAGE_META.insights.title };

export default async function InsightsPage() {
  const [comparison, ranking] = await Promise.all([
    getCategoryComparison(),
    getCategoryRanking(),
  ]);

  return (
    <AppScreen
      title={PAGE_META.insights.title}
      subtitle={PAGE_META.insights.subtitle}
    >
      <ScreenStack>
        <CardGrid>
          {INSIGHTS.map((insight) => (
            <Panel key={insight.id} className="flex flex-col gap-2 p-6">
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
          <Panel className="p-6">
            <h2 className="panel-title">Category by month</h2>
            <p className="text-meta text-muted mt-0.5">
              Six months, top four categories
            </p>

            <div className="mt-5 flex h-[190px] items-end gap-3">
              {comparison.map((column) => (
                <div
                  key={column.label}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
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
                  <span className="text-muted text-[11px] font-semibold">
                    {column.label}
                  </span>
                </div>
              ))}
            </div>

            <ul className="border-divider text-meta text-muted mt-4 flex flex-wrap gap-3.5 border-t pt-3.5">
              {COMPARE_LEGEND.map((entry) => (
                <li key={entry.id} className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={cx(
                      "size-2.5 rounded-[3px]",
                      RAMP_BG[entry.step],
                    )}
                  />
                  {entry.label}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <h2 className="panel-head panel-title">Top categories</h2>
            <ol>
              {ranking.map((entry) => (
                <li
                  key={entry.label}
                  className="panel-row-dense flex items-center gap-3"
                >
                  <span className="text-muted w-[18px] text-[13px] font-semibold">
                    {entry.rank}
                  </span>
                  <span className="text-row min-w-0 flex-1">{entry.label}</span>
                  <span
                    className={cx(
                      "text-note font-semibold",
                      TEXT_TONE[entry.deltaTone],
                    )}
                  >
                    {entry.delta}
                  </span>
                  <span className="w-[104px] text-right text-[13px] tabular-nums">
                    {entry.value}
                  </span>
                </li>
              ))}
            </ol>
            <div className="px-6 py-[17px]">
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

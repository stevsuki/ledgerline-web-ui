import type { Metadata } from "next";

import { AppScreen } from "@/components/shell/app-screen";
import { ActionButton } from "@/components/ui/action-button";
import {
  SegmentedControl,
  SelectField,
  ToggleRow,
} from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { ScreenStack, SplitGrid } from "@/components/ui/layout";
import { Panel } from "@/components/ui/panel";
import { IconTile, ProgressTrack, Tag } from "@/components/ui/primitives";
import { getAllocationShares } from "@/lib/data/analytics";
import {
  BUDGET_ALLOCATION,
  BUDGET_ATTENTION,
  BUDGET_THRESHOLDS,
  NEW_BUDGET_CATEGORIES,
  getBudgets,
} from "@/lib/data/budgets";
import { PAGE_META } from "@/lib/nav";
import { BG_TONE, RAMP_BG, TEXT_TONE, cx } from "@/lib/tone";

export const metadata: Metadata = { title: PAGE_META.budgets.title };

export default async function BudgetsPage() {
  const [budgets, shares] = await Promise.all([
    getBudgets(),
    getAllocationShares(),
  ]);

  return (
    <AppScreen
      title={PAGE_META.budgets.title}
      subtitle={PAGE_META.budgets.subtitle}
    >
      <ScreenStack>
        <div className="border-divider grid overflow-hidden rounded-[var(--radius-panel)] border shadow-md [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1.6fr))]">
          <section className="bg-surface border-divider min-w-0 border-r p-6">
            <h2 className="panel-kicker">August allocated</h2>
            <p className="mt-2.5 flex items-baseline gap-3">
              <span className="text-[30px] font-semibold tracking-[-0.03em]">
                {BUDGET_ALLOCATION.total}
              </span>
              <span className="text-muted text-note">
                {BUDGET_ALLOCATION.categoryCount}
              </span>
            </p>
            <div className="track mt-4 flex">
              {shares.map((share) => (
                <span
                  key={share.id}
                  className={RAMP_BG[share.step]}
                  style={{ width: share.width }}
                />
              ))}
            </div>
            <p className="text-meta text-muted mt-2.5 flex justify-between">
              <span>{BUDGET_ALLOCATION.spentNote}</span>
              <span>{BUDGET_ALLOCATION.cycleNote}</span>
            </p>
          </section>

          <section className="bg-surface p-6">
            <h2 className="panel-kicker">Needs attention</h2>
            <ul className="mt-3 flex flex-col gap-[11px]">
              {BUDGET_ATTENTION.map((item) => (
                <li key={item.id} className="flex items-start gap-[9px]">
                  <Icon
                    name="warn"
                    size={15}
                    className={cx("mt-0.5", TEXT_TONE[item.tone])}
                  />
                  <p className="text-note leading-snug">
                    {item.parts.map((part) =>
                      part.strong ? (
                        <strong key={part.text} className="font-semibold">
                          {part.text}
                        </strong>
                      ) : (
                        <span key={part.text}>{part.text}</span>
                      ),
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <SplitGrid ratio={1.5}>
          <div className="flex flex-col gap-3.5">
            {budgets.map((budget) => (
              <Panel
                key={budget.id}
                className={cx(
                  "px-6 py-[19px]",
                  budget.isOver && "border-accent",
                )}
              >
                <div className="flex items-center gap-3">
                  <IconTile name={budget.icon} tone={budget.tone} dense />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold">{budget.label}</h3>
                    <p className="text-meta text-muted mt-px">
                      Alerts at {budget.threshold} of limit
                    </p>
                  </div>
                  <Tag variant={budget.isOver ? "accent" : "neutral"}>
                    {budget.status}
                  </Tag>
                </div>

                <ProgressTrack
                  className="mt-3.5"
                  width={budget.width}
                  fillClass={BG_TONE[budget.tone]}
                />

                <p className="mt-2 flex justify-between text-note tabular-nums">
                  <span>
                    <span
                      className={cx("font-semibold", TEXT_TONE[budget.tone])}
                    >
                      {budget.spent}
                    </span>
                    <span className="text-muted"> of {budget.limit}</span>
                  </span>
                  <span className="text-muted">{budget.remaining}</span>
                </p>
              </Panel>
            ))}
          </div>

          <Panel className="sticky top-[calc(var(--header-h)+24px)] p-6">
            <h2 className="panel-title">New budget</h2>
            <p className="text-meta text-muted mt-0.5">
              Applies from next cycle, 1 September.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <SelectField
                id="budget-category"
                label="Category"
                options={NEW_BUDGET_CATEGORIES}
              />
              <div className="field">
                <label htmlFor="budget-limit">Monthly limit</label>
                <div className="inset flex min-h-[38px] items-center gap-2 px-2.5">
                  <span className="text-muted text-[13px]">Rp</span>
                  <input
                    id="budget-limit"
                    name="budget-limit"
                    defaultValue="1.500.000"
                    className="text-text min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
              <div className="field">
                <span className="mb-[5px] block text-xs text-[color-mix(in_srgb,var(--color-text)_70%,transparent)]">
                  Notify me at
                </span>
                <SegmentedControl
                  fill
                  name="budget-threshold"
                  defaultValue="80%"
                  options={BUDGET_THRESHOLDS.map((value) => ({
                    value,
                    label: value,
                  }))}
                />
              </div>
              <ToggleRow
                id="budget-rollover"
                label="Roll unspent amount forward"
              />
              <ActionButton
                className="btn btn-primary btn-block"
                message="Budget created — active from 1 September"
              >
                Create budget
              </ActionButton>
            </div>
          </Panel>
        </SplitGrid>
      </ScreenStack>
    </AppScreen>
  );
}

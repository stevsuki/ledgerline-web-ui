import type { Metadata } from "next";

import {
  BudgetEditButton,
  BudgetEditorProvider,
  NewBudgetForm,
} from "@/components/budgets/budget-editor";
import { AppScreen } from "@/components/shell/app-screen";
import { Icon } from "@/components/ui/icon";
import { ScreenStack, SplitGrid } from "@/components/ui/layout";
import { Panel, SectionPanel } from "@/components/ui/panel";
import {
  IconTile,
  ProgressTrack,
  StackedBar,
  Tag,
} from "@/components/ui/primitives";
import {
  blankDraft,
  budgetableCategories,
  budgetsSubtitle,
  getAllocationShares,
  getBudgetAllocation,
  getBudgetAttention,
  getBudgets,
  type BudgetRow,
} from "@/lib/data/budgets";
import { PAGE_META } from "@/lib/nav";
import { BG_TONE, RAMP_BG, TEXT_TONE, cx } from "@/lib/tone";

export const metadata: Metadata = { title: PAGE_META.budgets.title };

export default async function BudgetsPage() {
  const [budgets, shares] = await Promise.all([
    getBudgets(),
    getAllocationShares(),
  ]);
  const allocation = getBudgetAllocation();
  const attention = getBudgetAttention();
  const categories = budgetableCategories();
  const draft = blankDraft();

  return (
    <AppScreen title={PAGE_META.budgets.title} subtitle={budgetsSubtitle()}>
      <BudgetEditorProvider>
        <ScreenStack>
          {/* Two sections in one panel shell. */}
          <div className="border-divider bg-divider grid gap-px overflow-hidden rounded-[var(--radius-panel)] border shadow-md [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1.6fr))]">
            <section className="bg-surface panel-pad min-w-0">
              <h2 className="panel-kicker">August allocated</h2>
              <p className="mt-2.5 flex flex-wrap items-baseline gap-x-3">
                <span className="text-[26px] font-semibold tracking-[-0.03em] sm:text-[30px]">
                  {allocation.total}
                </span>
                <span className="text-muted text-note">
                  {allocation.categoryCount}
                </span>
              </p>
              <StackedBar
                className="mt-4"
                segments={shares.map((share) => ({
                  id: share.id,
                  width: share.width,
                  fillClass: RAMP_BG[share.step],
                }))}
              />
              <p className="text-meta text-muted mt-2.5 flex flex-wrap justify-between gap-x-3">
                <span>{allocation.spentNote}</span>
                <span>{allocation.cycleNote}</span>
              </p>
            </section>

            <section className="bg-surface panel-pad">
              <h2 className="panel-kicker">Needs attention</h2>
              <ul className="mt-3 flex flex-col gap-[11px]">
                {attention.map((item) => (
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
                <BudgetCard key={budget.id} budget={budget} />
              ))}
            </div>

            {/* Sticky only once the split is really two columns. */}
            <SectionPanel
              className="lg:sticky lg:top-[calc(var(--header-h)+24px)]"
              title="New budget"
              description="Applies from next cycle, 1 September."
            >
              {draft ? (
                /* Keyed so a create resets the panel onto the next free category. */
                <NewBudgetForm
                  key={draft.category}
                  draft={draft}
                  categories={categories}
                />
              ) : (
                <p className="text-muted text-note">
                  Every category a transaction can be filed under already has a
                  budget. Edit one of them, or remove it first.
                </p>
              )}
            </SectionPanel>
          </SplitGrid>
        </ScreenStack>
      </BudgetEditorProvider>
    </AppScreen>
  );
}

function BudgetCard({ budget }: { readonly budget: BudgetRow }) {
  return (
    <Panel
      className={cx("panel-pad-x py-[19px]", budget.isOver && "border-accent")}
    >
      <div className="flex items-center gap-3">
        <IconTile name={budget.icon} tone={budget.tone} dense />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{budget.label}</h3>
          <p className="text-meta text-muted mt-px">{budget.meta}</p>
        </div>
        <Tag variant={budget.isOver ? "accent" : "neutral"}>{budget.status}</Tag>
        <BudgetEditButton budget={budget} />
      </div>

      <ProgressTrack
        className="mt-3.5"
        width={budget.width}
        fillClass={BG_TONE[budget.tone]}
      />

      <p className="mt-2 flex justify-between text-note tabular-nums">
        <span>
          <span className={cx("font-semibold", TEXT_TONE[budget.tone])}>
            {budget.spent}
          </span>
          <span className="text-muted"> of {budget.limit}</span>
        </span>
        <span className="text-muted">{budget.remaining}</span>
      </p>
    </Panel>
  );
}

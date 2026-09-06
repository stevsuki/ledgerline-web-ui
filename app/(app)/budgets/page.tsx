import type { Metadata } from "next";
import Link from "next/link";

import {
  BudgetEditButton,
  BudgetEditorProvider,
  NewBudgetForm,
} from "@/components/budgets/budget-editor";
import { AppScreen } from "@/components/shell/app-screen";
import { Icon } from "@/components/ui/icon";
import { ScreenStack, SplitGrid } from "@/components/ui/layout";
import {
  InsetBlock,
  Panel,
  PanelNotice,
  SectionPanel,
} from "@/components/ui/panel";
import {
  IconTile,
  ProgressTrack,
  StackedBar,
  Tag,
} from "@/components/ui/primitives";
import {
  getBudgetsScreen,
  type Allocation,
  type AttentionItem,
  type BudgetRow,
} from "@/lib/data/budgets";
import { PAGE_META } from "@/lib/nav";
import { BG_TONE, RAMP_BG, TEXT_TONE, cx } from "@/lib/tone";

export const metadata: Metadata = { title: PAGE_META.budgets.title };

/** The list a budget's category comes from — its own screen, one click away. */
const CATEGORIES_PATH = "/categories";

export default async function BudgetsPage() {
  const screen = await getBudgetsScreen();

  return (
    <AppScreen title={PAGE_META.budgets.title} subtitle={screen.subtitle}>
      <BudgetEditorProvider>
        <ScreenStack>
          {screen.error ? <PanelNotice>{screen.error}</PanelNotice> : null}

          {/* Two sections in one panel shell. */}
          <div className="border-divider bg-divider grid gap-px overflow-hidden rounded-[var(--radius-panel)] border shadow-md [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1.6fr))]">
            <section className="bg-surface panel-pad min-w-0">
              <h2 className="panel-kicker">Allocated this cycle</h2>
              <p className="mt-2.5 flex flex-wrap items-baseline gap-x-3">
                <span className="text-[26px] font-semibold tracking-[-0.03em] sm:text-[30px]">
                  {screen.allocation.total}
                </span>
                <span className="text-muted text-note">
                  {screen.allocation.categoryCount}
                </span>
              </p>
              <StackedBar
                className="mt-4"
                segments={screen.shares.map((share) => ({
                  id: share.id,
                  width: share.width,
                  fillClass: RAMP_BG[share.step],
                }))}
              />

              <SpentBlock allocation={screen.allocation} />

              {/* What the totals above cannot honestly absorb, stated. */}
              {screen.allocation.uncountedNote ? (
                <p className="text-meta text-muted mt-2.5">
                  {screen.allocation.uncountedNote}
                </p>
              ) : null}
            </section>

            <section className="bg-surface panel-pad">
              <h2 className="panel-kicker">Needs attention</h2>
              <AttentionList items={screen.attention} />
            </section>
          </div>

          <SplitGrid ratio={1.5}>
            <div className="flex flex-col gap-3.5">
              {screen.rows.map((budget) => (
                <BudgetCard key={budget.id} budget={budget} />
              ))}
            </div>

            {/* Sticky only once the split is really two columns. */}
            <SectionPanel
              className="lg:sticky lg:top-[calc(var(--header-h)+24px)]"
              title="New budget"
              description="Measured against this cycle, and every one after it."
              // A budget is a limit on a category, so the list it draws from
              // has to be one click away — including when the reason there is
              // nothing to add is that every category already has one.
              action={
                <Link href={CATEGORIES_PATH} className="btn btn-ghost text-note">
                  Categories
                </Link>
              }
            >
              {screen.draft ? (
                /* Keyed so a create resets the panel onto the next free category. */
                <NewBudgetForm
                  key={screen.draft.categoryId}
                  draft={screen.draft}
                  categories={screen.categories}
                />
              ) : (
                <p className="text-muted text-note">
                  {screen.emptyNote}{" "}
                  <Link href={CATEGORIES_PATH} className="text-text underline">
                    Add a category
                  </Link>{" "}
                  to budget against, or edit one of the budgets you have.
                </p>
              )}
            </SectionPanel>
          </SplitGrid>
        </ScreenStack>
      </BudgetEditorProvider>
    </AppScreen>
  );
}

/**
 * Nothing over its threshold is a result, not a blank panel — and it is the
 * answer this panel exists to give, so it says it rather than showing nothing.
 */
function AttentionList({
  items,
}: {
  readonly items: readonly AttentionItem[];
}) {
  if (items.length === 0) {
    return (
      <p className="text-muted text-note mt-3 leading-snug">
        Every budget is inside its own alert threshold.
      </p>
    );
  }

  return (
    <ul className="mt-3 flex flex-col gap-[11px]">
      {items.map((item) => (
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
  );
}

/**
 * What has actually been spent, given its own block.
 *
 * It used to be an 11.5px muted footnote under the bar — the smallest text on
 * the panel, for the figure people open the screen to read. An `InsetBlock`
 * makes it a fact of its own rather than a caption on the one above it, and
 * the pace line is what turns "90%" into something to act on: 90% of the
 * allocation with 87% of the cycle gone is early, and says so.
 *
 * The figure itself stays `text-text`. Tinting spend green when it is on plan
 * would collide with `--income`, which in this app means money coming in.
 */
function SpentBlock({ allocation }: { readonly allocation: Allocation }) {
  return (
    <InsetBlock className="mt-4 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <h3 className="panel-kicker">Spent so far</h3>
        <Tag variant={allocation.isOver ? "accent" : "neutral"}>
          {allocation.percentLabel}
        </Tag>
      </div>

      <p className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] tabular-nums sm:text-[24.5px]">
        {allocation.spent}
      </p>

      <p className="text-meta mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-muted">
          {allocation.remainingNote}
          {allocation.cycleNote ? ` · ${allocation.cycleNote}` : ""}
        </span>
        {allocation.paceNote ? (
          <span className={cx("font-semibold", TEXT_TONE[allocation.paceTone])}>
            {allocation.paceNote}
          </span>
        ) : null}
      </p>
    </InsetBlock>
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

      {/* The row states its threshold in words; the tick is where that lands. */}
      <ProgressTrack
        className="mt-3.5"
        width={budget.width}
        fillClass={BG_TONE[budget.tone]}
        marker={budget.thresholdWidth || undefined}
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

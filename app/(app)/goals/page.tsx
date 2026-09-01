import type { Metadata } from "next";

import { AppScreen } from "@/components/shell/app-screen";
import { ActionButton } from "@/components/ui/action-button";
import { SelectField, TextField, ToggleRow } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import {
  CardGrid,
  FieldGrid,
  ScreenStack,
  SplitGrid,
} from "@/components/ui/layout";
import { Panel, SectionPanel } from "@/components/ui/panel";
import { ProgressTrack } from "@/components/ui/primitives";
import {
  GOAL_FUNDING_WALLETS,
  STREAK_MONTHS,
  getGoals,
} from "@/lib/data/goals";
import { PAGE_META } from "@/lib/nav";
import { cx } from "@/lib/tone";

export const metadata: Metadata = { title: PAGE_META.goals.title };

export default async function GoalsPage() {
  const goals = await getGoals();

  return (
    <AppScreen title={PAGE_META.goals.title} subtitle={PAGE_META.goals.subtitle}>
      <ScreenStack>
        <CardGrid minWidth={316}>
          {goals.map((goal) => (
            <Panel key={goal.id} className="p-5">
              <div className="flex items-center gap-3">
                <span className="bg-accent/[0.16] text-accent grid size-[34px] flex-none place-items-center rounded-[var(--radius-tile)]">
                  <Icon name={goal.icon} size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[14.5px] font-semibold">
                    {goal.name}
                  </h2>
                  <p className="text-meta text-muted mt-px">{goal.deadline}</p>
                </div>
                <span className="flex-none text-[17px] font-semibold">
                  {goal.percent}
                </span>
              </div>

              <p className="mt-5 flex flex-wrap items-baseline gap-x-2">
                <span className="text-[25px] font-semibold tracking-[-0.03em] tabular-nums">
                  {goal.saved}
                </span>
                <span className="text-muted text-note">of {goal.target}</span>
              </p>

              <ProgressTrack
                className="mt-3"
                width={goal.percent}
                fillClass="bg-accent"
              />

              <p className="text-meta text-muted mt-[9px] flex flex-wrap justify-between gap-x-3">
                <span>{goal.monthly} / month</span>
                <span>{goal.eta}</span>
              </p>

              <div className="mt-4.5 flex flex-wrap gap-2">
                <ActionButton
                  className="btn btn-primary text-[13px]"
                  message="Rp1.000.000 moved into the goal"
                >
                  Add funds
                </ActionButton>
                <ActionButton
                  className="btn btn-secondary text-[13px]"
                  message={`Editing ${goal.name}`}
                >
                  Edit goal
                </ActionButton>
              </div>
            </Panel>
          ))}
        </CardGrid>

        <SplitGrid minWidth={320} ratio={1}>
          <SectionPanel title="New goal" bodyClassName="mt-4">
            <FieldGrid>
              <TextField
                id="goal-name"
                label="Goal name"
                defaultValue="Motorcycle service fund"
                className="col-span-full"
              />
              <TextField
                id="goal-target"
                label="Target amount"
                defaultValue="Rp8.000.000"
              />
              <TextField
                id="goal-date"
                label="Target date"
                type="date"
                defaultValue="2027-03-01"
              />
              <SelectField
                id="goal-wallet"
                label="Funding wallet"
                options={GOAL_FUNDING_WALLETS}
                className="col-span-full"
              />
              <div className="col-span-full">
                <ToggleRow
                  id="goal-autotransfer"
                  label="Auto-transfer on payday"
                  defaultChecked
                />
              </div>
            </FieldGrid>
            <ActionButton
              className="btn btn-primary btn-block mt-4"
              message="Goal created"
            >
              Create goal
            </ActionButton>
          </SectionPanel>

          <Panel className="border-accent/45 panel-pad">
            <p className="text-accent flex items-center gap-[9px]">
              <Icon name="flame" size={17} />
              <span className="text-[13px] font-semibold tracking-[0.08em] uppercase">
                Savings streak
              </span>
            </p>
            <p className="mt-3 text-[44px] leading-none font-semibold tracking-[-0.04em]">
              7 months
            </p>
            <p className="text-muted text-note mt-1">
              You have put aside at least 30% of income every month since
              February. Two more months matches your longest run.
            </p>
            <ol className="mt-4.5 flex gap-1">
              {STREAK_MONTHS.map((month) => (
                <li
                  key={month.id}
                  className={cx(
                    "flex h-[38px] flex-1 items-end justify-center rounded-lg pb-[3px] text-[9px] font-semibold",
                    month.isActive
                      ? "bg-accent text-bg"
                      : "text-muted bg-[color-mix(in_srgb,var(--color-text)_10%,transparent)]",
                  )}
                >
                  {month.label}
                </li>
              ))}
            </ol>
          </Panel>
        </SplitGrid>
      </ScreenStack>
    </AppScreen>
  );
}

import type { Metadata } from "next";

import { AppScreen } from "@/components/shell/app-screen";
import { ActionButton } from "@/components/ui/action-button";
import { Icon } from "@/components/ui/icon";
import { ScreenStack, SplitGrid } from "@/components/ui/layout";
import { Panel, PanelHeader, SectionPanel } from "@/components/ui/panel";
import {
  Avatar,
  LegendItem,
  LegendList,
  MeterRow,
  StackedBar,
  Tag,
} from "@/components/ui/primitives";
import {
  SHARED_BUDGET,
  getSharedCategories,
  getSharedMembers,
} from "@/lib/data/shared";
import { PAGE_META } from "@/lib/nav";
import { BG_TONE, RAMP_BG } from "@/lib/tone";

export const metadata: Metadata = { title: PAGE_META.shared.title };

export default async function SharedPage() {
  const [categories, members] = await Promise.all([
    getSharedCategories(),
    getSharedMembers(),
  ]);

  return (
    <AppScreen
      title={PAGE_META.shared.title}
      subtitle={PAGE_META.shared.subtitle}
    >
      <ScreenStack>
        <SplitGrid>
          <SectionPanel
            title={SHARED_BUDGET.title}
            description={SHARED_BUDGET.meta}
            action={<Tag variant="accent">{SHARED_BUDGET.role}</Tag>}
            bodyClassName="mt-4.5"
          >
            <p className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-[26px] font-semibold tracking-[-0.03em] sm:text-[30px]">
                {SHARED_BUDGET.spent}
              </span>
              <span className="text-muted text-note">
                {SHARED_BUDGET.spentNote}
              </span>
            </p>

            <StackedBar
              className="mt-3.5"
              segments={SHARED_BUDGET.splits.map((split) => ({
                id: split.id,
                width: split.width,
                fillClass: RAMP_BG[split.step],
              }))}
            />

            <LegendList className="mt-2.5">
              {SHARED_BUDGET.splits.map((split) => (
                <LegendItem
                  key={split.id}
                  label={split.label}
                  fillClass={RAMP_BG[split.step]}
                />
              ))}
            </LegendList>

            <div className="border-divider mt-5 border-t pt-4">
              <h3 className="panel-kicker">Shared categories</h3>
              <div className="mt-3 flex flex-col gap-3">
                {categories.map((category) => (
                  <MeterRow
                    key={category.id}
                    label={category.label}
                    spent={category.spent}
                    limit={category.limit}
                    width={category.width}
                    fillClass={BG_TONE[category.tone]}
                  />
                ))}
              </div>
            </div>
          </SectionPanel>

          <Panel>
            <PanelHeader title="Members" />
            <ul>
              {members.map((member) => (
                <li
                  key={member.id}
                  className="panel-row flex items-center gap-3 py-[17px]"
                >
                  <Avatar
                    name={member.name}
                    size={38}
                    highlight={member.isOwner}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-row truncate">{member.name}</p>
                    <p className="text-meta text-muted mt-px truncate">
                      {member.contribution}
                    </p>
                  </div>
                  <Tag variant={member.isOwner ? "accent" : "neutral"}>
                    {member.role}
                  </Tag>
                </li>
              ))}
            </ul>
            <div className="panel-pad-x py-[17px]">
              <ActionButton
                className="btn btn-secondary btn-block"
                message="Invite sent to Sari"
              >
                <Icon name="mail" size={15} />
                Invite member
              </ActionButton>
            </div>
          </Panel>
        </SplitGrid>
      </ScreenStack>
    </AppScreen>
  );
}

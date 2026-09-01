import type { Metadata } from "next";

import { AppScreen } from "@/components/shell/app-screen";
import { ActionButton } from "@/components/ui/action-button";
import { Icon } from "@/components/ui/icon";
import { ScreenStack, SplitGrid } from "@/components/ui/layout";
import { Panel } from "@/components/ui/panel";
import { Avatar, ProgressTrack, Tag } from "@/components/ui/primitives";
import {
  SHARED_BUDGET,
  getSharedCategories,
  getSharedMembers,
} from "@/lib/data/shared";
import { PAGE_META } from "@/lib/nav";
import { BG_TONE, RAMP_BG, cx } from "@/lib/tone";

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
          <Panel className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="panel-title">{SHARED_BUDGET.title}</h2>
                <p className="text-meta text-muted mt-0.5">
                  {SHARED_BUDGET.meta}
                </p>
              </div>
              <Tag variant="accent">{SHARED_BUDGET.role}</Tag>
            </div>

            <p className="mt-4.5 flex items-baseline gap-3">
              <span className="text-[30px] font-semibold tracking-[-0.03em]">
                {SHARED_BUDGET.spent}
              </span>
              <span className="text-muted text-note">
                {SHARED_BUDGET.spentNote}
              </span>
            </p>

            <div className="track mt-3.5 flex">
              {SHARED_BUDGET.splits.map((split) => (
                <span
                  key={split.id}
                  className={RAMP_BG[split.step]}
                  style={{ width: split.width }}
                />
              ))}
            </div>

            <ul className="text-meta text-muted mt-2.5 flex gap-4.5">
              {SHARED_BUDGET.splits.map((split) => (
                <li key={split.id} className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={cx(
                      "size-2.5 rounded-[3px]",
                      RAMP_BG[split.step],
                    )}
                  />
                  {split.label}
                </li>
              ))}
            </ul>

            <div className="border-divider mt-5 border-t pt-4">
              <h3 className="panel-kicker">Shared categories</h3>
              <div className="mt-3 flex flex-col gap-3">
                {categories.map((category) => (
                  <div key={category.id}>
                    <div className="flex items-baseline gap-2 text-note">
                      <span className="min-w-0 flex-1">{category.label}</span>
                      <span className="text-muted tabular-nums">
                        {category.spent} / {category.limit}
                      </span>
                    </div>
                    <ProgressTrack
                      small
                      className="mt-1.5"
                      width={category.width}
                      fillClass={BG_TONE[category.tone]}
                    />
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel>
            <h2 className="panel-head panel-title">Members</h2>
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
                    <p className="text-row">{member.name}</p>
                    <p className="text-meta text-muted mt-px">
                      {member.contribution}
                    </p>
                  </div>
                  <Tag variant={member.isOwner ? "accent" : "neutral"}>
                    {member.role}
                  </Tag>
                </li>
              ))}
            </ul>
            <div className="px-6 py-[17px]">
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

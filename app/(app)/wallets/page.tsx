import type { Metadata } from "next";

import { AppScreen } from "@/components/shell/app-screen";
import { CardGrid, ScreenStack, SplitGrid } from "@/components/ui/layout";
import { Panel, PanelNotice, SectionPanel } from "@/components/ui/panel";
import {
  IconTile,
  LegendItem,
  LegendList,
  StackedBar,
  Tag,
} from "@/components/ui/primitives";
import {
  AddWalletCard,
  EditWalletButton,
  WalletEditorProvider,
} from "@/components/wallets/wallet-editor";
import {
  WALLET_CURRENCY_OPTIONS,
  WALLET_KIND_OPTIONS,
  getWalletsScreen,
} from "@/lib/data/wallets";
import { PAGE_META } from "@/lib/nav";
import { RAMP_BG, TEXT_TONE, cx } from "@/lib/tone";
import type { WalletCard, WalletSummary } from "@/types/ledger";

export const metadata: Metadata = { title: PAGE_META.wallets.title };

function WalletTile({ wallet }: { readonly wallet: WalletCard }) {
  return (
    <Panel className="panel-pad flex min-h-[164px] flex-col">
      <div className="flex items-start justify-between gap-2">
        <IconTile
          name={wallet.icon}
          tone={wallet.isNegative ? "expense" : "text"}
        />
        <div className="flex items-center gap-1.5">
          <Tag variant="outline">{wallet.currency}</Tag>
          <EditWalletButton wallet={wallet} />
        </div>
      </div>
      <h2 className="text-row mt-4 font-semibold">{wallet.name}</h2>
      <p className="text-meta text-muted mt-0.5">{wallet.meta}</p>
      <div className="flex-1" />
      <p
        className={cx(
          "mt-3.5 text-[23px] font-semibold tracking-[-0.03em] tabular-nums",
          wallet.isNegative ? TEXT_TONE.expense : TEXT_TONE.text,
        )}
      >
        {wallet.balance}
      </p>
      <p className="text-meta text-muted mt-[3px]">{wallet.sub}</p>
    </Panel>
  );
}

/** The headline figure, and the two things a single total cannot honestly say. */
function MoneyHeld({ summary }: { readonly summary: WalletSummary }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="panel-kicker">Money held</span>
        <p className="text-stat mt-2 font-[family-name:var(--font-heading)] font-semibold tracking-[-0.03em] tabular-nums">
          {summary.total}
        </p>
        <p className="text-meta text-muted mt-1">{summary.meta}</p>
      </div>

      {summary.rows.length > 0 ? (
        <dl>
          {summary.rows.map((row) => (
            <div
              key={row.id}
              className="border-divider flex items-baseline justify-between gap-3 border-t py-[11px]"
            >
              <dt className="text-row">{row.label}</dt>
              <dd
                className={cx(
                  "text-row font-semibold tabular-nums",
                  TEXT_TONE[row.tone],
                )}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

/** Each wallet's share of the money held, in the order the cards sit below. */
function HeldSplit({ summary }: { readonly summary: WalletSummary }) {
  return (
    <div>
      <StackedBar
        segments={summary.shares.map((share) => ({
          id: share.id,
          width: share.width,
          fillClass: RAMP_BG[share.step],
        }))}
      />
      <LegendList className="mt-3">
        {summary.shares.map((share) => (
          <LegendItem
            key={share.id}
            label={share.label}
            fillClass={RAMP_BG[share.step]}
          />
        ))}
      </LegendList>
    </div>
  );
}

/**
 * The summary leads the screen: its split is a bar of the very cards printed
 * under it, so the legend and the grid read as one thing.
 */
function BalanceSummaryPanel({
  summary,
}: {
  readonly summary: WalletSummary;
}) {
  return (
    <SectionPanel
      title="Balance summary"
      description="Nothing here syncs — every figure is one you entered."
      bodyClassName="mt-4"
    >
      <SplitGrid minWidth={260} ratio={1} gap={28}>
        <MoneyHeld summary={summary} />
        {summary.shares.length > 0 ? <HeldSplit summary={summary} /> : null}
      </SplitGrid>
    </SectionPanel>
  );
}

export default async function WalletsPage() {
  const { wallets, summary, error } = await getWalletsScreen();

  return (
    <AppScreen
      title={PAGE_META.wallets.title}
      subtitle={PAGE_META.wallets.subtitle}
    >
      <WalletEditorProvider
        kinds={WALLET_KIND_OPTIONS}
        currencies={WALLET_CURRENCY_OPTIONS}
      >
        <ScreenStack>
          {/* A total of Rp0 would be a claim; when the API is silent, say so. */}
          {error ? (
            <Panel>
              <PanelNotice tone="expense">{error}</PanelNotice>
            </Panel>
          ) : (
            <BalanceSummaryPanel summary={summary} />
          )}

          <CardGrid minWidth={262}>
            {wallets.map((wallet) => (
              <WalletTile key={wallet.id} wallet={wallet} />
            ))}

            <AddWalletCard />
          </CardGrid>
        </ScreenStack>
      </WalletEditorProvider>
    </AppScreen>
  );
}

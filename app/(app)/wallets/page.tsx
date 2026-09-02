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
import {
  IconTile,
  LegendItem,
  LegendList,
  StackedBar,
  Tag,
} from "@/components/ui/primitives";
import {
  WALLET_CURRENCIES,
  WALLET_KINDS,
  getWalletSummary,
  getWallets,
} from "@/lib/data/wallets";
import { PAGE_META } from "@/lib/nav";
import { RAMP_BG, TEXT_TONE, cx } from "@/lib/tone";
import type { WalletCard, WalletSummary } from "@/types/ledger";

export const metadata: Metadata = { title: PAGE_META.wallets.title };

function WalletTile({ wallet }: { readonly wallet: WalletCard }) {
  return (
    <Panel className="panel-pad flex min-h-[164px] flex-col">
      <div className="flex items-start justify-between">
        <IconTile
          name={wallet.icon}
          tone={wallet.isNegative ? "expense" : "text"}
        />
        <Tag variant="outline">{wallet.currency}</Tag>
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

/**
 * The wallet form. Every field is one the owner fills in; there is no bank
 * connection to import any of it from.
 */
function AddWalletPanel() {
  return (
    <SectionPanel title="Add wallet" titleId="add-wallet" bodyClassName="mt-4">
      <FieldGrid>
        <TextField
          id="wallet-name"
          label="Wallet name"
          placeholder="Jenius savings"
          className="col-span-full"
        />
        <SelectField id="wallet-kind" label="Type" options={WALLET_KINDS} />
        <SelectField
          id="wallet-currency"
          label="Currency"
          options={WALLET_CURRENCIES}
        />
        <TextField
          id="wallet-opening"
          label="Opening balance"
          placeholder="Rp0"
          inputMode="numeric"
          className="col-span-full"
        />
        <div className="col-span-full">
          <ToggleRow
            id="wallet-in-total"
            label="Include in total balance"
            defaultChecked
          />
        </div>
      </FieldGrid>
      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton className="btn btn-primary" message="Wallet saved">
          Save wallet
        </ActionButton>
        <button type="reset" className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </SectionPanel>
  );
}

/** Where the money sits, and the two things a single total cannot honestly say. */
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
      <div>
        <span className="panel-kicker">Money held</span>
        <p className="text-stat mt-2 font-[family-name:var(--font-heading)] font-semibold tracking-[-0.03em] tabular-nums">
          {summary.total}
        </p>
        <p className="text-meta text-muted mt-1">{summary.meta}</p>
      </div>

      {summary.shares.length > 0 ? (
        <div className="mt-1">
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
      ) : null}

      {summary.rows.length > 0 ? (
        <dl className="mt-1">
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
    </SectionPanel>
  );
}

export default async function WalletsPage() {
  const [wallets, summary] = await Promise.all([
    getWallets(),
    getWalletSummary(),
  ]);

  return (
    <AppScreen
      title={PAGE_META.wallets.title}
      subtitle={PAGE_META.wallets.subtitle}
    >
      <ScreenStack>
        <CardGrid minWidth={262}>
          {wallets.map((wallet) => (
            <WalletTile key={wallet.id} wallet={wallet} />
          ))}

          <a
            href="#add-wallet"
            className="border-divider text-muted hover:border-accent hover:text-accent panel-pad flex min-h-[164px] flex-col items-start justify-end gap-2.5 rounded-[var(--radius-panel)] border border-dashed text-[13px] transition-colors"
          >
            <Icon name="plus" size={22} />
            Add wallet
          </a>
        </CardGrid>

        <SplitGrid minWidth={320} ratio={1}>
          <AddWalletPanel />
          <BalanceSummaryPanel summary={summary} />
        </SplitGrid>
      </ScreenStack>
    </AppScreen>
  );
}

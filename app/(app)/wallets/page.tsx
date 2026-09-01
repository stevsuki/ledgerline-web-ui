import type { Metadata } from "next";

import { AppScreen } from "@/components/shell/app-screen";
import { ActionButton } from "@/components/ui/action-button";
import { SelectField, TextField, ToggleRow } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { CardGrid, ScreenStack, SplitGrid } from "@/components/ui/layout";
import { Panel } from "@/components/ui/panel";
import { IconTile, Tag } from "@/components/ui/primitives";
import {
  WALLET_CURRENCIES,
  WALLET_TYPES,
  getIntegrations,
  getWallets,
} from "@/lib/data/wallets";
import { PAGE_META } from "@/lib/nav";
import { TEXT_TONE, cx } from "@/lib/tone";

export const metadata: Metadata = { title: PAGE_META.wallets.title };

export default async function WalletsPage() {
  const [wallets, integrations] = await Promise.all([
    getWallets(),
    getIntegrations(),
  ]);

  return (
    <AppScreen
      title={PAGE_META.wallets.title}
      subtitle={PAGE_META.wallets.subtitle}
    >
      <ScreenStack>
        <CardGrid minWidth={262}>
          {wallets.map((wallet) => (
            <Panel
              key={wallet.id}
              className="flex min-h-[164px] flex-col p-6"
            >
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
          ))}

          <a
            href="#add-wallet"
            className="border-divider text-muted hover:border-accent hover:text-accent flex min-h-[164px] flex-col items-start justify-end gap-2.5 rounded-[var(--radius-panel)] border border-dashed p-6 text-[13px] transition-colors"
          >
            <Icon name="plus" size={22} />
            Add wallet
          </a>
        </CardGrid>

        <SplitGrid minWidth={320} ratio={1}>
          <Panel className="p-6" >
            <h2 className="panel-title" id="add-wallet">
              Add wallet
            </h2>
            <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))]">
              <TextField
                id="wallet-name"
                label="Wallet name"
                defaultValue="Jenius savings"
                className="col-span-full"
              />
              <SelectField id="wallet-type" label="Type" options={WALLET_TYPES} />
              <SelectField
                id="wallet-currency"
                label="Currency"
                options={WALLET_CURRENCIES}
              />
              <TextField
                id="wallet-opening"
                label="Opening balance"
                defaultValue="Rp0"
                className="col-span-full"
              />
              <div className="col-span-full">
                <ToggleRow
                  id="wallet-in-total"
                  label="Include in total balance"
                  defaultChecked
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <ActionButton
                className="btn btn-primary"
                message="Wallet saved"
              >
                Save wallet
              </ActionButton>
              <button type="reset" className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </Panel>

          <Panel className="p-6">
            <h2 className="panel-title">Connected institutions</h2>
            <p className="text-meta text-muted mt-0.5">
              Synced transactions arrive tagged for review.
            </p>
            <ul className="mt-3.5">
              {integrations.map((integration) => (
                <li
                  key={integration.id}
                  className="border-divider flex items-center gap-3 border-b py-[11px]"
                >
                  <Icon
                    name={integration.icon}
                    size={17}
                    className="text-muted"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-row">{integration.name}</p>
                    <p className="text-meta text-muted">{integration.meta}</p>
                  </div>
                  <Tag variant={integration.needsAttention ? "accent" : "neutral"}>
                    {integration.status}
                  </Tag>
                </li>
              ))}
            </ul>
            <ActionButton
              className="btn btn-secondary btn-block mt-3.5"
              message="Redirecting to bank consent"
            >
              <Icon name="link" size={15} />
              Connect another account
            </ActionButton>
          </Panel>
        </SplitGrid>
      </ScreenStack>
    </AppScreen>
  );
}

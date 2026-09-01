import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppScreen } from "@/components/shell/app-screen";
import {
  SegmentedControl,
  SelectField,
  TextField,
  ToggleRow,
} from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon-sprite";
import { CATEGORIES } from "@/lib/data/categories";
import { getBudgetsPreview } from "@/lib/data/budgets";
import { getRecentTransactions, getTransactions } from "@/lib/data/transactions";
import { formatSignedRupiah } from "@/lib/format";
import { PAGE_META, WORKSPACE } from "@/lib/nav";
import { BG_TONE, TEXT_TONE, cx } from "@/lib/tone";

export const metadata: Metadata = { title: PAGE_META.mobile.title };

/** The PWA screens as the artboard frames them: 330 × 660, radius 20. */
const STATUS_TIME = "09:41";

const TAB_ICONS: readonly IconName[] = [
  "grid",
  "swap",
  "plus",
  "target",
  "gear",
];

export default async function MobilePage() {
  const [recent, budgets, ledger] = await Promise.all([
    getRecentTransactions(),
    getBudgetsPreview(),
    getTransactions({
      query: "",
      category: "All categories",
      wallet: "All wallets",
      range: "This month",
      amount: "Any amount",
      page: 1,
      size: 10,
    }),
  ]);

  return (
    <AppScreen
      title={PAGE_META.mobile.title}
      subtitle={PAGE_META.mobile.subtitle}
    >
      <div className="animate-fade mx-auto flex w-full max-w-[var(--screen-max)] flex-wrap gap-[26px]">
        <PhoneFrame label="Home">
          <StatusBar />

          <div className="border-divider border-b p-3.5">
            <p className="panel-kicker">Total balance</p>
            <p className="mt-1.5 text-[30px] font-semibold tracking-[-0.03em]">
              Rp84.320.000
            </p>
            <p className="text-meta mt-2 flex gap-3.5">
              <span className={TEXT_TONE.income}>+Rp21.450.000 in</span>
              <span className={TEXT_TONE.expense}>−Rp12.780.000 out</span>
            </p>
          </div>

          <div className="border-divider grid grid-cols-2 border-b">
            <div className="border-divider border-r px-3.5 py-3">
              <p className="text-muted text-[10px] tracking-[0.1em] uppercase">
                Net saved
              </p>
              <p className={cx("mt-1 text-[17px] font-semibold", TEXT_TONE.income)}>
                Rp8.670.000
              </p>
            </div>
            <div className="px-3.5 py-3">
              <p className="text-muted text-[10px] tracking-[0.1em] uppercase">
                Streak
              </p>
              <p className="mt-1 text-[17px] font-semibold">7 months</p>
            </div>
          </div>

          <div className="border-divider border-b px-3.5 py-3">
            <p className="panel-kicker">Budgets</p>
            <div className="mt-2.5 flex flex-col gap-2.5">
              {budgets.slice(0, 4).map((budget) => (
                <div key={budget.id}>
                  <p className="text-meta flex">
                    <span className="flex-1">{budget.label}</span>
                    <span className="text-muted">{budget.width}</span>
                  </p>
                  <div className="track mt-1 h-1.5">
                    <div
                      className={cx("track-fill", BG_TONE[budget.tone])}
                      style={{ width: budget.width }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {recent.slice(0, 4).map((transaction) => (
              <div
                key={transaction.id}
                className="border-divider flex items-center gap-2.5 border-b px-3.5 py-2.5"
              >
                <Icon
                  name={CATEGORIES[transaction.category].icon}
                  size={15}
                  className={
                    transaction.amount > 0 ? TEXT_TONE.income : TEXT_TONE.muted
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-note">{transaction.name}</p>
                  <p className="text-muted text-kicker">
                    {CATEGORIES[transaction.category].label}
                  </p>
                </div>
                <span
                  className={cx(
                    "text-note font-semibold",
                    transaction.amount > 0 ? TEXT_TONE.income : TEXT_TONE.text,
                  )}
                >
                  {formatSignedRupiah(transaction.amount)}
                </span>
              </div>
            ))}
          </div>

          <TabBar />
        </PhoneFrame>

        <PhoneFrame label="Transactions">
          <StatusBar />

          <div className="border-divider flex items-center gap-2.5 border-b p-3.5">
            <span className="inset text-muted flex h-9 flex-1 items-center gap-2 px-3 text-note">
              <Icon name="search" size={14} />
              Search
            </span>
            <span className="icon-tile icon-tile-sm text-muted">
              <Icon name="chart" size={15} />
            </span>
          </div>

          <div className="flex-1 overflow-hidden">
            {ledger.groups.slice(0, 3).map((group) => (
              <div key={group.day}>
                <p className="bg-panel text-muted border-divider text-kicker flex border-b px-3.5 py-2">
                  <span className="flex-1">{group.day}</span>
                  <span className="tabular-nums">
                    {formatSignedRupiah(group.net)}
                  </span>
                </p>
                {group.items.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="border-divider flex items-center gap-2.5 border-b px-3.5 py-2.5"
                  >
                    <Icon
                      name={CATEGORIES[transaction.category].icon}
                      size={15}
                      className={
                        transaction.amount > 0
                          ? TEXT_TONE.income
                          : TEXT_TONE.muted
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-note">{transaction.name}</p>
                      <p className="text-muted text-kicker">
                        {transaction.wallet}
                      </p>
                    </div>
                    <span
                      className={cx(
                        "text-note font-semibold",
                        transaction.amount > 0
                          ? TEXT_TONE.income
                          : TEXT_TONE.text,
                      )}
                    >
                      {formatSignedRupiah(transaction.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </PhoneFrame>

        <PhoneFrame label="Add transaction">
          <StatusBar />

          <div className="border-divider flex items-center justify-between border-b px-3.5 py-3">
            <span className="panel-kicker">New entry</span>
            <Icon name="x" size={15} className="text-muted" />
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3.5">
            <SegmentedControl
              fill
              name="mobile-kind"
              defaultValue="Expense"
              options={[
                { value: "Expense", label: "Expense" },
                { value: "Income", label: "Income" },
              ]}
            />
            <div>
              <p className="panel-kicker">Amount</p>
              <p className="mt-1 text-[28px] font-semibold tracking-[-0.03em] tabular-nums">
                Rp62.000
              </p>
            </div>
            <SelectField
              id="mobile-category"
              label="Category"
              options={["Food & drink", "Transport"]}
            />
            <SelectField
              id="mobile-wallet"
              label="Wallet"
              options={["GoPay", "Cash"]}
            />
            <TextField
              id="mobile-note"
              label="Note"
              defaultValue="Kopi Tuku, Tebet"
            />
            <ToggleRow id="mobile-recurring" label="Recurring" />
          </div>

          <div className="border-divider border-t p-3.5">
            <span className="btn btn-primary btn-block">Save transaction</span>
          </div>
        </PhoneFrame>
      </div>
    </AppScreen>
  );
}

function PhoneFrame({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="w-full max-w-[330px]">
      <h2 className="panel-kicker mb-2.5">{label}</h2>
      <div className="border-divider bg-bg animate-pop flex h-[660px] flex-col overflow-hidden rounded-[var(--radius-overlay)] border shadow-lg">
        {children}
      </div>
    </section>
  );
}

function StatusBar() {
  return (
    <div className="border-divider flex items-center justify-between border-b px-3.5 py-2 text-[11px] font-semibold">
      <span>{STATUS_TIME}</span>
      <span>{WORKSPACE.currency}</span>
    </div>
  );
}

function TabBar() {
  return (
    <div className="border-divider flex border-t">
      {TAB_ICONS.map((icon, index) => (
        <span
          key={icon}
          className={cx(
            "grid flex-1 place-items-center p-[11px]",
            index === 0
              ? "bg-accent/[0.16] text-accent"
              : "text-muted",
          )}
        >
          <Icon name={icon} size={18} />
        </span>
      ))}
    </div>
  );
}

import type { Metadata } from "next";

import { AppScreen } from "@/components/shell/app-screen";
import { LedgerRow } from "@/components/transactions/rows";
import { OpenTransactionButton } from "@/components/ui/action-button";
import { FilterForm } from "@/components/ui/filter-form";
import { Icon } from "@/components/ui/icon";
import { ScreenStack } from "@/components/ui/layout";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/primitives";
import { StatRow } from "@/components/ui/stats";
import {
  FilterReset,
  FilterSelect,
  FilterSubmit,
  SearchInput,
} from "@/components/ui/toolbar";
import {
  AMOUNT_FILTER_OPTIONS,
  CATEGORY_FILTER_OPTIONS,
  RANGE_FILTER_OPTIONS,
  TRANSACTION_PAGE_SIZES,
  WALLET_FILTER_OPTIONS,
  getTransactions,
} from "@/lib/data/transactions";
import { formatSignedRupiah } from "@/lib/format";
import { PAGE_META } from "@/lib/nav";
import { readOption, readPage, readSize, readText } from "@/lib/search-params";

export const metadata: Metadata = { title: PAGE_META.transactions.title };

const BASE_PATH = "/transactions";

export default async function TransactionsPage(
  props: Readonly<PageProps<"/transactions">>,
) {
  const params = await props.searchParams;

  const filters = {
    query: readText(params, "q"),
    category: readOption(params, "category", CATEGORY_FILTER_OPTIONS),
    wallet: readOption(params, "wallet", WALLET_FILTER_OPTIONS),
    range: readOption(params, "range", RANGE_FILTER_OPTIONS),
    amount: readOption(params, "amount", AMOUNT_FILTER_OPTIONS),
    page: readPage(params),
    size: readSize(params, TRANSACTION_PAGE_SIZES),
  };

  const { groups, stats, page, isEmpty } = await getTransactions(filters);

  return (
    <AppScreen
      title={PAGE_META.transactions.title}
      subtitle={PAGE_META.transactions.subtitle}
    >
      <ScreenStack>
        <Panel className="p-3.5">
          <FilterForm
            action={BASE_PATH}
            className="flex flex-wrap items-end gap-2.5"
          >
            <SearchInput
              id="tx-search"
              name="q"
              label="Search transactions"
              placeholder="Merchant or note"
              defaultValue={filters.query}
              className="min-w-[190px] flex-1"
            />
            <FilterSelect
              id="tx-filter-category"
              name="category"
              label="Category"
              options={CATEGORY_FILTER_OPTIONS}
              value={filters.category}
            />
            <FilterSelect
              id="tx-filter-wallet"
              name="wallet"
              label="Wallet"
              options={WALLET_FILTER_OPTIONS}
              value={filters.wallet}
            />
            <FilterSelect
              id="tx-filter-range"
              name="range"
              label="Date range"
              options={RANGE_FILTER_OPTIONS}
              value={filters.range}
              minWidth={140}
            />
            <FilterSelect
              id="tx-filter-amount"
              name="amount"
              label="Amount"
              options={AMOUNT_FILTER_OPTIONS}
              value={filters.amount}
              minWidth={170}
            />
            <FilterSubmit />
            <div className="ml-auto flex gap-2">
              <FilterReset href={BASE_PATH} />
              <OpenTransactionButton className="btn btn-primary h-[38px]">
                <Icon name="plus" size={15} />
                New
              </OpenTransactionButton>
            </div>
          </FilterForm>
        </Panel>

        <StatRow stats={stats} size="compact" />

        <Panel>
          {groups.map((group) => (
            <section key={group.day}>
              <h2 className="column-head flex items-center gap-2.5 normal-case">
                <span className="text-[11px] tracking-[0.12em] uppercase">
                  {group.day}
                </span>
                <span className="flex-1" />
                <span className="text-meta text-muted tabular-nums">
                  {formatSignedRupiah(group.net)}
                </span>
              </h2>
              <ul>
                {group.items.map((transaction) => (
                  <LedgerRow key={transaction.id} transaction={transaction} />
                ))}
              </ul>
            </section>
          ))}

          {isEmpty ? (
            <EmptyState
              message="No transactions match these filters."
              resetHref={BASE_PATH}
              resetLabel="Clear them"
            />
          ) : null}

          <PaginationBar
            paged={page}
            basePath={BASE_PATH}
            params={params}
            unit="entries"
            sizes={TRANSACTION_PAGE_SIZES}
            formId="tx"
          />
        </Panel>
      </ScreenStack>
    </AppScreen>
  );
}

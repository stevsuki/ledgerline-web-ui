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
  RANGE_FILTER_OPTIONS,
  TRANSACTION_PAGE_SIZES,
  TYPE_FILTER_OPTIONS,
  TYPE_FILTER_VALUES,
  getTransactionFilterOptions,
  getTransactions,
} from "@/lib/data/transactions";
import { transactionsSubtitle } from "@/lib/data/ledger";
import { formatSignedSums } from "@/lib/format";
import { PAGE_META } from "@/lib/nav";
import { readOption, readPage, readSize, readText } from "@/lib/search-params";

export const metadata: Metadata = { title: PAGE_META.transactions.title };

const BASE_PATH = "/transactions";

export default async function TransactionsPage(
  props: Readonly<PageProps<"/transactions">>,
) {
  const params = await props.searchParams;

  // The category and wallet dropdowns are read live, so their allowed values
  // are known before a filter can be validated against them.
  const options = await getTransactionFilterOptions();
  const categoryValues = options.categories.map((option) => option.value);
  const walletValues = options.wallets.map((option) => option.value);

  const filters = {
    query: readText(params, "q"),
    category: readOption(params, "category", categoryValues),
    wallet: readOption(params, "wallet", walletValues),
    type: readOption(params, "type", TYPE_FILTER_VALUES),
    range: readOption(params, "range", RANGE_FILTER_OPTIONS),
    page: readPage(params),
    size: readSize(params, TRANSACTION_PAGE_SIZES),
  };

  const { groups, stats, page, isEmpty, error } = await getTransactions(filters);

  return (
    <AppScreen
      title={PAGE_META.transactions.title}
      subtitle={transactionsSubtitle()}
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
              className="`min-w-47.5 flex-1"
            />
            <FilterSelect
              id="tx-filter-category"
              name="category"
              label="Category"
              options={options.categories}
              value={filters.category}
            />
            <FilterSelect
              id="tx-filter-wallet"
              name="wallet"
              label="Wallet"
              options={options.wallets}
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
              id="tx-filter-type"
              name="type"
              label="Type"
              options={TYPE_FILTER_OPTIONS}
              value={filters.type}
              minWidth={130}
            />
            <FilterSubmit />
            <div className="ml-auto flex gap-2">
              <FilterReset href={BASE_PATH} />
              <OpenTransactionButton className="btn btn-primary h-9.5">
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
                  {formatSignedSums(group.net)}
                </span>
              </h2>
              <ul>
                {group.items.map((item) => (
                  <LedgerRow key={item.id} item={item} />
                ))}
              </ul>
            </section>
          ))}

          {isEmpty ? (
            <EmptyState
              message={error || "No transactions match these filters."}
              resetHref={BASE_PATH}
              resetLabel={error ? "Try again" : "Clear them"}
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

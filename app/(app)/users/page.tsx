import type { Metadata } from "next";

import { AppScreen } from "@/components/shell/app-screen";
import {
  EditUserButton,
  NewUserButton,
  RemoveUserButton,
  UserEditorProvider,
} from "@/components/users/user-editor";
import { FilterForm } from "@/components/ui/filter-form";
import { ScreenStack, TableScroll } from "@/components/ui/layout";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Panel, PanelNotice } from "@/components/ui/panel";
import { Avatar, EmptyState, StatusCell, Tag } from "@/components/ui/primitives";
import { SortHeader } from "@/components/ui/sort-header";
import { StatRow } from "@/components/ui/stats";
import { FilterSelect, FilterSubmit, SearchInput } from "@/components/ui/toolbar";
import {
  ACCESS_PAGE_SIZES,
  ALL_ROLES,
  USER_SORT_COLUMNS,
  USER_STATUS_OPTIONS,
  getRoleOptions,
  getUsers,
} from "@/lib/data/access";
import { PAGE_META } from "@/lib/nav";
import {
  readOption,
  readPage,
  readSize,
  readSort,
  readText,
} from "@/lib/search-params";
import { cx } from "@/lib/tone";

export const metadata: Metadata = { title: PAGE_META.users.title };

const BASE_PATH = "/users";
const ROW_GRID =
  "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_130px_150px_110px_118px] items-center gap-3.5";

/** The built-in role that may reach everything, so its tag carries the accent. */
const ELEVATED_ROLE = "Admin";

export default async function UsersPage(props: Readonly<PageProps<"/users">>) {
  const params = await props.searchParams;
  const query = readText(params, "q");
  const sort = readSort(params, USER_SORT_COLUMNS);

  // The role select is filled from the roles the backend actually has.
  const roles = await getRoleOptions();
  const roleOptions = [ALL_ROLES, ...roles.map((role) => role.name)];

  const { page, stats, isEmpty, error } = await getUsers({
    query,
    role: readOption(params, "role", roleOptions),
    status: readOption(params, "status", USER_STATUS_OPTIONS),
    sort,
    page: readPage(params),
    size: readSize(params, ACCESS_PAGE_SIZES),
  });

  return (
    <AppScreen
      title={PAGE_META.users.title}
      subtitle={PAGE_META.users.subtitle}
      maxWidth={1240}
    >
      <UserEditorProvider roles={roles}>
        <ScreenStack>
          <StatRow stats={stats} size="large" />

          <Panel>
            <FilterForm
              action={BASE_PATH}
              className="panel-head flex flex-wrap items-center gap-3"
            >
              <SearchInput
                id="user-search"
                name="q"
                label="Search users"
                placeholder="Search name or email"
                defaultValue={query}
                className="min-w-[220px] flex-1"
              />
              <FilterSelect
                id="user-filter-role"
                name="role"
                label="Role"
                options={roleOptions}
                value={readOption(params, "role", roleOptions)}
              />
              <FilterSelect
                id="user-filter-status"
                name="status"
                label="Status"
                options={USER_STATUS_OPTIONS}
                value={readOption(params, "status", USER_STATUS_OPTIONS)}
              />
              <FilterSubmit />
              <NewUserButton />
            </FilterForm>

            <TableScroll minWidth={880}>
              <div className={cx("column-head-access", ROW_GRID)}>
                <SortHeader
                  column="full_name"
                  label="Full name"
                  sort={sort}
                  basePath={BASE_PATH}
                  params={params}
                />
                <SortHeader
                  column="email"
                  label="Email"
                  sort={sort}
                  basePath={BASE_PATH}
                  params={params}
                />
                <SortHeader
                  column="role"
                  label="Role"
                  sort={sort}
                  basePath={BASE_PATH}
                  params={params}
                />
                <SortHeader
                  column="updated_at"
                  label="Last updated"
                  sort={sort}
                  basePath={BASE_PATH}
                  params={params}
                />
                <span>Status</span>
                <span className="text-right">Action</span>
              </div>

              <ul>
                {page.items.map((user) => (
                  <li
                    key={user.id}
                    className={cx("panel-row row-hover py-3", ROW_GRID)}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        name={user.name}
                        highlight={user.role === ELEVATED_ROLE}
                      />
                      <p className="text-row min-w-0 truncate">{user.name}</p>
                    </div>
                    <span className="text-note text-muted truncate">
                      {user.email}
                    </span>
                    <span>
                      <Tag
                        variant={
                          user.role === ELEVATED_ROLE ? "accent" : "neutral"
                        }
                      >
                        {user.role}
                      </Tag>
                    </span>
                    <span className="text-note text-muted tabular-nums">
                      {user.updated}
                    </span>
                    <StatusCell status={user.status} />
                    <div className="flex justify-end gap-1.5">
                      <EditUserButton user={user} />
                      <RemoveUserButton user={user} />
                    </div>
                  </li>
                ))}
              </ul>
            </TableScroll>

            {error ? <PanelNotice tone="expense">{error}</PanelNotice> : null}

            {isEmpty && !error ? (
              <EmptyState
                message="No users match this search."
                resetHref={BASE_PATH}
                resetLabel="Clear filters"
              />
            ) : null}

            <PaginationBar
              paged={page}
              basePath={BASE_PATH}
              params={params}
              unit="users"
              sizes={ACCESS_PAGE_SIZES}
              formId="users"
            />
          </Panel>
        </ScreenStack>
      </UserEditorProvider>
    </AppScreen>
  );
}

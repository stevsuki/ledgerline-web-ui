import Link from "next/link";
import type { Metadata } from "next";

import { RemoveRoleButton } from "@/components/roles/remove-role-button";
import { AppScreen } from "@/components/shell/app-screen";
import { FilterForm } from "@/components/ui/filter-form";
import { Icon } from "@/components/ui/icon";
import { ScreenStack, TableScroll } from "@/components/ui/layout";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Panel, PanelNotice } from "@/components/ui/panel";
import { IconTile, Tag } from "@/components/ui/primitives";
import { SortHeader } from "@/components/ui/sort-header";
import { FilterSubmit, SearchInput } from "@/components/ui/toolbar";
import { ACCESS_PAGE_SIZES, ROLE_SORT_COLUMNS, getRoles } from "@/lib/data/access";
import { PAGE_META } from "@/lib/nav";
import { readPage, readSize, readSort, readText } from "@/lib/search-params";
import { cx } from "@/lib/tone";

export const metadata: Metadata = { title: PAGE_META.roles.title };

const BASE_PATH = "/roles";
const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_130px_150px_110px_130px] items-center gap-3.5";

export default async function RolesPage(props: Readonly<PageProps<"/roles">>) {
  const params = await props.searchParams;
  const query = readText(params, "q");
  const sort = readSort(params, ROLE_SORT_COLUMNS);

  const { page, isEmpty, error } = await getRoles({
    query,
    sort,
    page: readPage(params),
    size: readSize(params, ACCESS_PAGE_SIZES),
  });

  return (
    <AppScreen
      title={PAGE_META.roles.title}
      subtitle={PAGE_META.roles.subtitle}
      maxWidth={1240}
    >
      <ScreenStack>
        <Panel>
          <FilterForm
            action={BASE_PATH}
            className="panel-head flex flex-wrap items-center gap-3"
          >
            <SearchInput
              id="role-search"
              name="q"
              label="Search roles"
              placeholder="Search role"
              defaultValue={query}
              className="min-w-[220px] flex-1"
            />
            <FilterSubmit />
            <Link href="/roles/new" className="btn btn-primary h-[38px]">
              <Icon name="plus" size={15} />
              Add new role
            </Link>
          </FilterForm>

          <TableScroll minWidth={900}>
            <div className={cx("column-head-access", ROW_GRID)}>
              <SortHeader
                column="name"
                label="Role name"
                sort={sort}
                basePath={BASE_PATH}
                params={params}
              />
              <span>Description</span>
              <SortHeader
                column="user_count"
                label="Members"
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
              <SortHeader
                column="is_system"
                label="Type"
                sort={sort}
                basePath={BASE_PATH}
                params={params}
              />
              <span className="text-right">Action</span>
            </div>

            <ul>
              {page.items.map((role) => (
                <li
                  key={role.id}
                  className={cx("panel-row row-hover", ROW_GRID)}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <IconTile name={role.icon} tone="accent" dense />
                    <p className="text-row min-w-0 truncate">{role.name}</p>
                  </div>
                  <span className="text-note text-muted truncate">
                    {role.description}
                  </span>
                  <span className="text-muted flex items-center gap-1.5 text-note tabular-nums">
                    <Icon name="users" size={14} />
                    {role.members}
                  </span>
                  <span className="text-note text-muted tabular-nums">
                    {role.updated}
                  </span>
                  <span>
                    <Tag variant={role.isSystem ? "accent" : "neutral"}>
                      {role.isSystem ? "Built-in" : "Custom"}
                    </Tag>
                  </span>
                  <div className="flex justify-end gap-1.5">
                    <Link
                      href={`/roles/${role.id}`}
                      className="btn btn-secondary text-note"
                    >
                      Edit
                    </Link>
                    {/* A built-in role is what every account falls back to; the backend refuses to delete one. */}
                    {role.isSystem ? null : (
                      <RemoveRoleButton id={role.id} name={role.name} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </TableScroll>

          {error ? <PanelNotice tone="expense">{error}</PanelNotice> : null}

          {isEmpty && !error ? (
            <PanelNotice>No roles match this search.</PanelNotice>
          ) : null}

          <PaginationBar
            paged={page}
            basePath={BASE_PATH}
            params={params}
            unit="roles"
            sizes={ACCESS_PAGE_SIZES}
            formId="roles"
          />
        </Panel>
      </ScreenStack>
    </AppScreen>
  );
}

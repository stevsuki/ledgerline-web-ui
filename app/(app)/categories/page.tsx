import type { Metadata } from "next";
import Link from "next/link";

import {
  AddCategoryButton,
  CategoryEditorProvider,
  EditCategoryButton,
} from "@/components/categories/category-editor";
import { AppScreen } from "@/components/shell/app-screen";
import { ScreenStack } from "@/components/ui/layout";
import { Panel, PanelHeader, PanelNotice } from "@/components/ui/panel";
import { IconTile } from "@/components/ui/primitives";
import { StatRow } from "@/components/ui/stats";
import { CATEGORY_KIND_OPTIONS } from "@/lib/category-fields";
import {
  getCategoriesScreen,
  type CategoryRow,
} from "@/lib/data/category-list";
import { PAGE_META } from "@/lib/nav";
import { RAMP_BG, cx } from "@/lib/tone";

export const metadata: Metadata = { title: PAGE_META.categories.title };

/**
 * This screen manages the list and nothing else — no money figure appears on
 * it. What was spent per category is the dashboard's donut and the insights
 * ranking; what is left of a limit is the budgets screen. Printing any of that
 * again here would be a second copy of a number that already has an owner.
 */
const LIST_SUBTITLE =
  "Every transaction, budget and chart in the app is filed against this list.";

/** Where a category's limit is set, which is a screen of its own. */
const BUDGETS_PATH = "/budgets";

export default async function CategoriesPage() {
  const { rows, stats, draft, error } = await getCategoriesScreen();

  return (
    <AppScreen
      title={PAGE_META.categories.title}
      subtitle={PAGE_META.categories.subtitle}
    >
      <CategoryEditorProvider blank={draft} kinds={CATEGORY_KIND_OPTIONS}>
        <ScreenStack>
          <StatRow stats={stats} size="large" />

          <Panel>
            <PanelHeader
              title="All categories"
              subtitle={LIST_SUBTITLE}
              action={
                <div className="flex flex-none items-center gap-2">
                  {/* The other half of the pair: a limit is set per category,
                      so the two screens link rather than merge. */}
                  <Link href={BUDGETS_PATH} className="btn btn-ghost text-note">
                    Budgets
                  </Link>
                  <AddCategoryButton />
                </div>
              }
            />

            <CategoryList rows={rows} error={error} />
          </Panel>
        </ScreenStack>
      </CategoryEditorProvider>
    </AppScreen>
  );
}

/** An empty list is a real answer here; an unreachable API is not the same one. */
function CategoryList({
  rows,
  error,
}: {
  readonly rows: readonly CategoryRow[];
  readonly error: string;
}) {
  if (error) {
    return <PanelNotice tone="expense">{error}</PanelNotice>;
  }
  if (rows.length === 0) {
    return (
      <PanelNotice>
        This workspace has no categories yet. Add the first one to file a
        transaction against it.
      </PanelNotice>
    );
  }

  return (
    <ul>
      {rows.map((row) => (
        <CategoryListRow key={row.id} row={row} />
      ))}
    </ul>
  );
}

/**
 * One row of the list. Everything but the name and the pencil folds into the
 * meta line rather than scrolling sideways, so a phone loses nothing.
 */
function CategoryListRow({ row }: { readonly row: CategoryRow }) {
  return (
    <li className="panel-row flex items-center gap-3.5 last:border-b-0">
      <IconTile name={row.icon} dense />

      <div className="min-w-0 flex-1">
        <p className="text-row flex items-center gap-2 font-semibold">
          <span
            aria-hidden="true"
            className={cx(
              "size-2.5 flex-none rounded-[3px]",
              RAMP_BG[row.step],
            )}
          />
          <span className="truncate">{row.name}</span>
        </p>
        <p className="text-meta text-muted mt-px">{row.meta}</p>
      </div>

      <EditCategoryButton row={row} />
    </li>
  );
}

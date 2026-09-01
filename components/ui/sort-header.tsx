import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import {
  DESC_PREFIX,
  buildHref,
  isDescending,
  sortColumn,
  type RawSearchParams,
} from "@/lib/search-params";
import { cx } from "@/lib/tone";

/**
 * A column head that sorts.
 *
 * Ordering is the backend's job — `dto.userSort` and `dto.roleSort` whitelist
 * the columns — so this is a link that rewrites `?sort=`, not a handler. It
 * ships no JavaScript, survives a reload, and can be opened in a new tab.
 *
 * One click sorts ascending, a second flips to descending, a third clears the
 * column and hands the list back to the backend's own default order.
 */

const ARROW_SIZE = 12;

function nextSort(column: string, current: string): string | undefined {
  if (sortColumn(current) !== column) {
    return column;
  }
  return isDescending(current) ? undefined : `${DESC_PREFIX}${column}`;
}

function hint(isActive: boolean, isDesc: boolean): string {
  if (!isActive) {
    return "sort ascending";
  }
  return isDesc ? "clear sorting" : "sort descending";
}

export function SortHeader({
  column,
  label,
  sort,
  basePath,
  params,
  align = "start",
}: {
  readonly column: string;
  readonly label: string;
  /** The active `?sort=` value, already validated by `readSort`. */
  readonly sort: string;
  readonly basePath: string;
  readonly params: RawSearchParams;
  readonly align?: "start" | "end";
}) {
  const isActive = sortColumn(sort) === column;
  const isDesc = isActive && isDescending(sort);

  return (
    <Link
      href={buildHref(basePath, params, { sort: nextSort(column, sort) })}
      aria-label={`${label} — ${hint(isActive, isDesc)}`}
      className={cx(
        "hover:text-text focus-visible:text-text inline-flex items-center gap-1 transition-colors",
        align === "end" && "justify-end",
        isActive && "text-text",
      )}
    >
      {label}
      <Icon
        name={isDesc ? "down" : "up"}
        size={ARROW_SIZE}
        className={cx("flex-none transition-opacity", !isActive && "opacity-30")}
      />
    </Link>
  );
}

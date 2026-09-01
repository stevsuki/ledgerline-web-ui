/**
 * Every filter, sort and page lives in the URL, so a Server Component can
 * render the exact list the user asked for and a reload reproduces it.
 *
 * Nothing here trusts a raw query string: a value that is not on the allow
 * list falls back to the default.
 */

import { parseIsoDate } from "@/lib/dates";

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function readText(params: RawSearchParams, key: string): string {
  return first(params[key])?.trim() ?? "";
}

/** Returns `options[0]` unless the query names another allowed option. */
export function readOption<T extends string>(
  params: RawSearchParams,
  key: string,
  options: readonly T[],
): T {
  const raw = first(params[key]);
  const match = options.find((option) => option === raw);
  return match ?? options[0];
}

/**
 * An ISO day (`2026-08-27`) or nothing. A stamp that is not a real calendar
 * day is dropped rather than clamped, so a broken link shows the unfiltered
 * list instead of a range nobody asked for.
 */
export function readIsoDate(params: RawSearchParams, key: string): string {
  const raw = first(params[key])?.trim() ?? "";
  return parseIsoDate(raw) ? raw : "";
}

export function readPage(params: RawSearchParams): number {
  const parsed = Number.parseInt(first(params.page) ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function readSize(
  params: RawSearchParams,
  allowed: readonly number[],
): number {
  const parsed = Number.parseInt(first(params.size) ?? "", 10);
  return allowed.includes(parsed) ? parsed : allowed[0];
}

/**
 * Builds an href that keeps the current filters and changes only what is
 * passed in. Setting anything other than `page` sends the list back to page 1.
 */
export function buildHref(
  pathname: string,
  current: RawSearchParams,
  changes: Record<string, string | number | undefined>,
): string {
  const next = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    const single = first(value);
    if (single) {
      next.set(key, single);
    }
  }

  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === "") {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  }

  if (!("page" in changes)) {
    next.delete("page");
  }

  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Descending is the backend's `-column` convention, on both list endpoints. */
export const DESC_PREFIX = "-";

export function sortColumn(sort: string): string {
  return sort.startsWith(DESC_PREFIX) ? sort.slice(1) : sort;
}

export function isDescending(sort: string): boolean {
  return sort.startsWith(DESC_PREFIX);
}

/**
 * Reads `?sort=`, keeping it only when the column is one the backend will
 * order by — anything else comes back as 400 from there, so it never leaves.
 */
export function readSort(
  params: RawSearchParams,
  columns: readonly string[],
): string {
  const raw = first(params.sort)?.trim() ?? "";
  return columns.includes(sortColumn(raw)) ? raw : "";
}

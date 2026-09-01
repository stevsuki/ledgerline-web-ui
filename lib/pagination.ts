/**
 * One pagination engine for every growing list, ported from the artboard's
 * `pager()` (Finance App.dc.html, lines ~1690-1725).
 *
 * It runs on the server: the page slice is computed before render, so the
 * browser only ever receives the rows it is showing.
 */

export type PageNumber =
  | { readonly kind: "page"; readonly key: string; readonly value: number; readonly isCurrent: boolean }
  | { readonly kind: "gap"; readonly key: string };

export type Paged<T> = {
  readonly items: readonly T[];
  readonly page: number;
  readonly pages: number;
  readonly size: number;
  readonly total: number;
  /** "1–10 of 14", or "0 of 0" when the filters match nothing. */
  readonly rangeLabel: string;
  readonly numbers: readonly PageNumber[];
  readonly hasPrevious: boolean;
  readonly hasNext: boolean;
};

/** How many pages either side of the current one stay visible. */
const WINDOW = 1;

function buildNumbers(pages: number, current: number): PageNumber[] {
  const numbers: PageNumber[] = [];

  for (let n = 1; n <= pages; n += 1) {
    const isEdge = n === 1 || n === pages;
    const isNearCurrent = Math.abs(n - current) <= WINDOW;

    if (isEdge || isNearCurrent) {
      numbers.push({ kind: "page", key: `p${n}`, value: n, isCurrent: n === current });
      continue;
    }

    const previous = numbers[numbers.length - 1];
    if (previous?.kind !== "gap") {
      numbers.push({ kind: "gap", key: `gap-${n}` });
    }
  }

  return numbers;
}

export function paginate<T>(
  list: readonly T[],
  requestedPage: number,
  size: number,
): Paged<T> {
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, requestedPage), pages);
  const from = (page - 1) * size;
  const items = list.slice(from, from + size);
  const rangeLabel = total
    ? `${from + 1}–${Math.min(from + size, total)} of ${total}`
    : "0 of 0";

  return {
    items,
    page,
    pages,
    size,
    total,
    rangeLabel,
    numbers: buildNumbers(pages, page),
    hasPrevious: page > 1,
    hasNext: page < pages,
  };
}

/**
 * The same shape, for a list the API has already paged.
 *
 * `items` is one page, and `total` comes from the response's `meta` — nothing
 * else knows how many rows there are, so it cannot be derived here.
 */
export function pagedFromTotal<T>(
  items: readonly T[],
  requestedPage: number,
  size: number,
  total: number,
): Paged<T> {
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, requestedPage), pages);
  const from = (page - 1) * size;
  const rangeLabel = total
    ? `${from + 1}–${Math.min(from + items.length, total)} of ${total}`
    : "0 of 0";

  return {
    items,
    page,
    pages,
    size,
    total,
    rangeLabel,
    numbers: buildNumbers(pages, page),
    hasPrevious: page > 1,
    hasNext: page < pages,
  };
}

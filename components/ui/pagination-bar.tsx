import Link from "next/link";

import { FilterForm } from "@/components/ui/filter-form";
import { FilterSubmit } from "@/components/ui/toolbar";
import { Icon } from "@/components/ui/icon";
import { buildHref, type RawSearchParams } from "@/lib/search-params";
import type { Paged } from "@/lib/pagination";
import { cx } from "@/lib/tone";

/** Params the bar owns itself and must not echo back as hidden inputs. */
const OWNED = new Set(["size", "page"]);

const ARROW_CLASS =
  "border-divider text-muted grid size-[34px] place-items-center rounded-[var(--radius-tile)] border transition-colors";

const NUMBER_CLASS =
  "grid h-[34px] min-w-[34px] place-items-center rounded-[var(--radius-tile)] border px-[9px] font-[family-name:var(--font-heading)] text-[12.5px] font-semibold tabular-nums transition-colors";

type PaginationBarProps = {
  readonly paged: Paged<unknown>;
  readonly basePath: string;
  readonly params: RawSearchParams;
  /** The noun after the range, e.g. "entries", "users", "events". */
  readonly unit: string;
  readonly sizes: readonly number[];
  readonly formId: string;
};

export function PaginationBar({
  paged,
  basePath,
  params,
  unit,
  sizes,
  formId,
}: PaginationBarProps) {
  const hidden = Object.entries(params).filter(
    ([key, value]) => !OWNED.has(key) && typeof value === "string" && value,
  );

  return (
    <div className="panel-pad-x flex flex-wrap items-center justify-between gap-3.5 py-4">
      <FilterForm
        action={basePath}
        className="flex items-center gap-2.5"
      >
        {hidden.map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={String(value)} />
        ))}
        <label className="text-note text-muted" htmlFor={`${formId}-size`}>
          Show
        </label>
        <select
          id={`${formId}-size`}
          name="size"
          defaultValue={String(paged.size)}
          className="input h-[34px] w-auto min-w-[72px] px-2.5"
        >
          {sizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="text-note text-muted">
          {paged.rangeLabel} {unit}
        </span>
        <FilterSubmit />
      </FilterForm>

      {paged.pages > 1 ? (
        <nav aria-label="Pagination" className="flex items-center gap-1.5">
          <PageArrow
            direction="previous"
            enabled={paged.hasPrevious}
            href={buildHref(basePath, params, { page: paged.page - 1 })}
          />
          {paged.numbers.map((entry) =>
            entry.kind === "gap" ? (
              <span
                key={entry.key}
                className="text-muted min-w-[22px] text-center text-note"
              >
                …
              </span>
            ) : (
              <Link
                key={entry.key}
                href={buildHref(basePath, params, { page: entry.value })}
                aria-current={entry.isCurrent ? "page" : undefined}
                aria-label={`Page ${entry.value}`}
                className={cx(
                  NUMBER_CLASS,
                  entry.isCurrent
                    ? "bg-accent border-transparent text-white"
                    : "border-divider text-muted hover:border-accent",
                )}
              >
                {entry.value}
              </Link>
            ),
          )}
          <PageArrow
            direction="next"
            enabled={paged.hasNext}
            href={buildHref(basePath, params, { page: paged.page + 1 })}
          />
        </nav>
      ) : null}
    </div>
  );
}

function PageArrow({
  direction,
  enabled,
  href,
}: {
  readonly direction: "previous" | "next";
  readonly enabled: boolean;
  readonly href: string;
}) {
  const label = direction === "previous" ? "Previous page" : "Next page";
  const icon = (
    <Icon
      name="right"
      size={14}
      className={direction === "previous" ? "rotate-180" : undefined}
    />
  );

  if (!enabled) {
    return (
      <span
        aria-disabled="true"
        aria-label={label}
        className={cx(ARROW_CLASS, "cursor-not-allowed opacity-[0.38]")}
      >
        {icon}
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} className={cx(ARROW_CLASS, "hover:border-accent")}>
      {icon}
    </Link>
  );
}

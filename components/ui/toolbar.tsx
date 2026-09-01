import { Icon } from "@/components/ui/icon";
import { cx } from "@/lib/tone";

/**
 * The pieces every filter bar is made of. They are named form controls, so
 * they submit themselves — no state, no handlers, no client bundle.
 */

export function SearchInput({
  id,
  name,
  placeholder,
  defaultValue,
  label,
  className,
}: {
  readonly id: string;
  readonly name: string;
  readonly placeholder: string;
  readonly defaultValue: string;
  readonly label: string;
  readonly className?: string;
}) {
  return (
    <div
      className={cx(
        "border-divider bg-panel text-muted flex h-[38px] items-center gap-[9px] rounded-[var(--radius-control)] border px-3",
        className,
      )}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Icon name="search" size={15} />
      <input
        id={id}
        name={name}
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="text-text min-w-0 flex-1 bg-transparent text-row outline-none"
      />
    </div>
  );
}

/**
 * A filter option. Most screens filter on the label itself, so a plain string
 * is accepted and stands for both halves; the audit log filters on ids and
 * codes the backend owns, and passes the pair.
 */
export type FilterOption = { readonly value: string; readonly label: string };

function toOption(option: string | FilterOption): FilterOption {
  return typeof option === "string" ? { value: option, label: option } : option;
}

/**
 * By default a select is pinned to `minWidth` and sized to its content, which
 * is what a bar with three or four filters wants.
 *
 * A `className` takes the width over completely — `minWidth` is then not
 * applied at all. That is for a crowded bar: six pinned controls add up past
 * the panel and drop the last one onto a line of its own, whereas six flexible
 * ones share what there is and simply get narrower.
 */
export function FilterSelect({
  id,
  name,
  label,
  options,
  value,
  minWidth = 150,
  className,
}: {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly options: readonly (string | FilterOption)[];
  readonly value: string;
  readonly minWidth?: number;
  readonly className?: string;
}) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={value}
        className={cx("input h-[38px]", className ?? "w-auto")}
        style={className ? undefined : { minWidth }}
      >
        {options.map(toOption).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  );
}

/** Shown only when JavaScript is off; the form otherwise submits on change. */
export function FilterSubmit() {
  return (
    <button type="submit" className="btn btn-secondary sr-only">
      Apply filters
    </button>
  );
}

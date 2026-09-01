"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { Calendar } from "@/components/ui/calendar";
import { Icon } from "@/components/ui/icon";
import {
  formatRangeChip,
  formatRangeLabel,
  type DateRange,
} from "@/lib/dates";
import { cx } from "@/lib/tone";

/** The filter bar's range control: one button that prints the current range. */

const FALLBACK_LABEL = "All dates";

/** Whether the grid may take over from the native inputs. */
const NEVER_CHANGES = () => () => {};
const ON_CLIENT = () => true;
const ON_SERVER = () => false;

type DateRangeFieldProps = {
  readonly from: string;
  readonly to: string;
  /** Resolved on the server, so the first and second renders agree. */
  readonly todayIso: string;
  readonly min: string;
  readonly max: string;
  readonly label: string;
  readonly className?: string;
};

export function DateRangeField({
  from,
  to,
  todayIso,
  min,
  max,
  label,
  className,
}: DateRangeFieldProps) {
  const isEnhanced = useSyncExternalStore(NEVER_CHANGES, ON_CLIENT, ON_SERVER);
  const [isOpen, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>({ from, to });

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wantsSubmit = useRef(false);
  const panelId = useId();
  const headingId = useId();

  useEffect(() => {
    if (!wantsSubmit.current) {
      return;
    }
    wantsSubmit.current = false;
    containerRef.current?.closest("form")?.requestSubmit();
  }, [draft]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  /** Into the hidden inputs first, then submit. */
  function handleRangeChange(next: DateRange) {
    setDraft(next);
    wantsSubmit.current = true;
    setOpen(false);
  }

  if (!isEnhanced) {
    return (
      <NativeRangeFallback
        from={from}
        to={to}
        min={min}
        max={max}
        className={className}
      />
    );
  }

  return (
    <div ref={containerRef} className={cx("relative flex-none", className)}>
      <input type="hidden" name="from" value={draft.from} />
      <input type="hidden" name="to" value={draft.to} />

      <button
        ref={triggerRef}
        type="button"
        className="input text-muted flex h-[38px] w-auto max-w-[172px] items-center gap-[9px]"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setOpen((previous) => !previous)}
      >
        <Icon name="calendar" size={15} />
        <span className="text-text text-row truncate">
          {formatRangeChip(draft, todayIso, FALLBACK_LABEL)}
        </span>
        {/* No chevron in the sprite — the app turns the arrow, as pagination does. */}
        <Icon name="right" size={13} className="rotate-90" />
      </button>

      {isOpen ? (
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={headingId}
          className="overlay-surface animate-rise absolute top-11 left-0 z-60 w-[min(300px,calc(100vw-2rem))] p-4"
        >
          <p id={headingId} className="sr-only">
            {label}
          </p>

          <Calendar
            value={draft}
            onChange={handleRangeChange}
            todayIso={todayIso}
            min={min}
            max={max}
            labelledBy={headingId}
          />

          <div className="border-divider mt-3.5 flex items-center justify-between border-t pt-3.5">
            <span className="text-meta text-muted">
              {formatRangeLabel(draft, FALLBACK_LABEL)}
            </span>
            <button
              type="button"
              className="btn btn-ghost text-note"
              onClick={() => handleRangeChange({ from: "", to: "" })}
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** What the field is before JavaScript arrives, and what it stays without it. */
function NativeRangeFallback({
  from,
  to,
  min,
  max,
  className,
}: {
  readonly from: string;
  readonly to: string;
  readonly min: string;
  readonly max: string;
  readonly className?: string;
}) {
  return (
    <div className={cx("flex flex-none items-center gap-2", className)}>
      <label htmlFor="range-from" className="sr-only">
        From date
      </label>
      <input
        id="range-from"
        type="date"
        name="from"
        defaultValue={from}
        min={min}
        max={max}
        className="input h-[38px] w-auto"
      />
      <span aria-hidden="true" className="text-muted text-note">
        –
      </span>
      <label htmlFor="range-to" className="sr-only">
        To date
      </label>
      <input
        id="range-to"
        type="date"
        name="to"
        defaultValue={to}
        min={min}
        max={max}
        className="input h-[38px] w-auto"
      />
    </div>
  );
}

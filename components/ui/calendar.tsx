"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import {
  DAYS_PER_WEEK,
  RANGE_PRESETS,
  WEEKDAYS,
  addDays,
  clampIso,
  matchingPreset,
  monthGrid,
  monthLabel,
  orderRange,
  parseIsoDate,
  presetRange,
  shiftMonth,
  startOfMonth,
  toIsoDate,
  type DateRange,
  type RangePresetId,
} from "@/lib/dates";
import { cx } from "@/lib/tone";

/**
 * A two-ended date range grid.
 *
 * The artboard never drew a calendar, so every value here comes out of the
 * shape contract rather than out of nowhere — the `.cal-*` block in
 * `globals.css` records where each one is taken from.
 *
 * It is controlled and presentational: it owns which month is on screen and
 * which day the keyboard is on, and nothing else. Whoever renders it owns the
 * range, which is what lets the filter bar and the export popover put the
 * same control over the same URL state.
 *
 * Clicking sets one end and then the other. The half-picked state in between
 * is kept here rather than pushed at the parent: it is interaction, not a
 * value, and a parent that stored it would have to hold a range that is not
 * yet a range. So `onChange` only ever fires with both ends set — or with
 * neither, from a preset — and the ends are ordered on the way out, so
 * picking backwards through the month works as well as picking forwards.
 *
 * The pending end needs no clearing: it lives exactly one click, and both
 * popovers unmount this when they close.
 */

/** Arrow keys walk the grid; the vertical pair is one week. */
const DAY_STEP: Readonly<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -DAYS_PER_WEEK,
  ArrowDown: DAYS_PER_WEEK,
};

const MONTH_STEP: Readonly<Record<string, number>> = {
  PageUp: -1,
  PageDown: 1,
};

type CalendarProps = {
  readonly value: DateRange;
  readonly onChange: (range: DateRange) => void;
  /** From the server, so both renders agree on what today means. */
  readonly todayIso: string;
  readonly min: string;
  readonly max: string;
  readonly labelledBy: string;
};

export function Calendar({
  value,
  onChange,
  todayIso,
  min,
  max,
  labelledBy,
}: CalendarProps) {
  const anchor = parseIsoDate(value.from) ?? parseIsoDate(todayIso);
  const [month, setMonth] = useState(() => startOfMonth(anchor ?? new Date()));
  const [cursor, setCursor] = useState(() =>
    clampIso(value.from || todayIso, min, max),
  );

  const [pendingStart, setPendingStart] = useState<string | null>(null);

  /** What the grid paints: the pending end while there is one, else the value. */
  const shown: DateRange = pendingStart
    ? { from: pendingStart, to: "" }
    : value;

  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const wantsFocus = useRef(false);

  useEffect(() => {
    if (!wantsFocus.current) {
      return;
    }
    wantsFocus.current = false;
    dayRefs.current.get(cursor)?.focus();
  }, [cursor]);

  const weeks = useMemo(() => {
    const days = monthGrid(month);
    return Array.from({ length: days.length / DAYS_PER_WEEK }, (_, index) =>
      days.slice(index * DAYS_PER_WEEK, (index + 1) * DAYS_PER_WEEK),
    );
  }, [month]);

  const activePreset = matchingPreset(shown, todayIso);

  /** Moves the keyboard cursor, with the visible month following it. */
  function moveCursor(from: string, days: number) {
    const date = parseIsoDate(from);
    if (!date) {
      return;
    }

    const next = clampIso(toIsoDate(addDays(date, days)), min, max);
    const nextDate = parseIsoDate(next);
    if (nextDate) {
      setMonth(startOfMonth(nextDate));
    }
    wantsFocus.current = true;
    setCursor(next);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTableSectionElement>) {
    const dayStep = DAY_STEP[event.key];
    if (dayStep !== undefined) {
      event.preventDefault();
      moveCursor(cursor, dayStep);
      return;
    }

    const monthStep = MONTH_STEP[event.key];
    if (monthStep === undefined) {
      return;
    }

    event.preventDefault();
    const date = parseIsoDate(cursor);
    if (date) {
      moveCursor(toIsoDate(shiftMonth(date, monthStep)), 0);
    }
  }

  /**
   * First click marks one end, second closes the range and reports it, and a
   * later click starts over — so there is no mode to be in and no start/end
   * toggle to read.
   */
  function selectDay(iso: string) {
    setCursor(iso);

    if (pendingStart === null) {
      setPendingStart(iso);
      return;
    }

    setPendingStart(null);
    onChange(orderRange(pendingStart, iso));
  }

  function applyPreset(id: RangePresetId) {
    const range = presetRange(id, todayIso);
    setPendingStart(null);
    onChange(range);

    const focus = parseIsoDate(range.from || todayIso);
    if (focus) {
      setMonth(startOfMonth(focus));
      setCursor(toIsoDate(focus));
    }
  }

  function isInsideRange(iso: string): boolean {
    return Boolean(shown.from && shown.to && iso > shown.from && iso < shown.to);
  }

  return (
    <div className="grid gap-3">
      <div className="seg w-full">
        {RANGE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="seg-opt flex-1"
            aria-current={activePreset === preset.id}
            onClick={() => applyPreset(preset.id)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          className="btn btn-secondary btn-icon size-8"
          aria-label="Previous month"
          onClick={() => setMonth((current) => shiftMonth(current, -1))}
        >
          <Icon name="right" size={14} className="rotate-180" />
        </button>

        <span
          aria-live="polite"
          className="text-row font-[family-name:var(--font-heading)] font-semibold"
        >
          {monthLabel(month)}
        </span>

        <button
          type="button"
          className="btn btn-secondary btn-icon size-8"
          aria-label="Next month"
          onClick={() => setMonth((current) => shiftMonth(current, 1))}
        >
          <Icon name="right" size={14} />
        </button>
      </div>

      <table className="cal-grid" role="grid" aria-labelledby={labelledBy}>
        <thead>
          <tr>
            {WEEKDAYS.map((weekday) => (
              <th key={weekday.key} scope="col" className="cal-head">
                <abbr title={weekday.label} className="no-underline">
                  {weekday.initial}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>

        <tbody onKeyDown={handleKeyDown}>
          {weeks.map((week) => (
            <tr key={toIsoDate(week[0])}>
              {week.map((day) => (
                <CalendarCell
                  key={toIsoDate(day)}
                  day={day}
                  iso={toIsoDate(day)}
                  isEdge={
                    toIsoDate(day) === shown.from || toIsoDate(day) === shown.to
                  }
                  isInside={isInsideRange(toIsoDate(day))}
                  isOutsideMonth={day.getMonth() !== month.getMonth()}
                  isToday={toIsoDate(day) === todayIso}
                  isCursor={toIsoDate(day) === cursor}
                  isDisabled={toIsoDate(day) < min || toIsoDate(day) > max}
                  dayRefs={dayRefs}
                  onSelect={selectDay}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type CalendarCellProps = {
  readonly day: Date;
  readonly iso: string;
  readonly isEdge: boolean;
  readonly isInside: boolean;
  readonly isOutsideMonth: boolean;
  readonly isToday: boolean;
  readonly isCursor: boolean;
  readonly isDisabled: boolean;
  readonly dayRefs: React.RefObject<Map<string, HTMLButtonElement>>;
  readonly onSelect: (iso: string) => void;
};

/**
 * One day. Split out so the grid above stays readable and so the band
 * rounding — which only the first and last column of a week can carry — sits
 * next to the classes it belongs to.
 */
function CalendarCell({
  day,
  iso,
  isEdge,
  isInside,
  isOutsideMonth,
  isToday,
  isCursor,
  isDisabled,
  dayRefs,
  onSelect,
}: CalendarCellProps) {
  const weekday = day.getDay();

  return (
    <td
      role="gridcell"
      aria-selected={isEdge || isInside}
      className={cx(
        "cal-cell",
        isInside && "cal-cell-inside",
        isInside && weekday === 0 && "cal-cell-start",
        isInside && weekday === DAYS_PER_WEEK - 1 && "cal-cell-end",
      )}
    >
      <button
        type="button"
        ref={(node) => {
          if (node) {
            dayRefs.current.set(iso, node);
          } else {
            dayRefs.current.delete(iso);
          }
        }}
        tabIndex={isCursor ? 0 : -1}
        disabled={isDisabled}
        aria-label={day.toDateString()}
        className={cx(
          "cal-day",
          isOutsideMonth && "cal-day-outside",
          isToday && "cal-day-today",
          isEdge && "cal-day-edge",
        )}
        onClick={() => onSelect(iso)}
      >
        {day.getDate()}
      </button>
    </td>
  );
}

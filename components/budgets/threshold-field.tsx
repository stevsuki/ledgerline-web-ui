"use client";

import { useId, useState } from "react";

import {
  BUDGET_FIELD,
  CUSTOM_THRESHOLD,
  THRESHOLD_PRESETS,
} from "@/lib/budget-fields";
import { formatPercent, formatRupiah, parseFigure, parsePercent } from "@/lib/format";
import { cx } from "@/lib/tone";

/**
 * "Notify me at" — three one-tap thresholds and a way past them.
 *
 * The artboard offered exactly three fixed percentages, one of which nothing
 * used and none of which could reach the 75% a budget was already set to. The
 * presets stay, because one tap is the common case; Custom reveals a field for
 * everything else, the same way a card's extra fields appear only for a card.
 *
 * The presets post `alert_threshold` themselves, so the three common answers
 * still work with JavaScript off. Custom is the only path that needs it.
 */

const CUSTOM_LABEL = "Custom";

export function ThresholdField({
  defaultThreshold,
  defaultIsCustom,
  limitText,
  error,
}: {
  /** A whole percentage, e.g. "80". */
  readonly defaultThreshold: string;
  readonly defaultIsCustom: boolean;
  /** What the limit field currently holds, so the note can price the alert. */
  readonly limitText: string;
  readonly error?: string;
}) {
  const groupId = useId();
  const customId = `${groupId}-custom`;
  const noteId = `${groupId}-note`;

  const [isCustom, setCustom] = useState(defaultIsCustom);
  const [custom, setCustomValue] = useState(defaultIsCustom ? defaultThreshold : "");
  const [preset, setPreset] = useState(defaultIsCustom ? "" : defaultThreshold);

  const threshold = isCustom ? custom : preset;

  return (
    <fieldset className="field">
      <legend>Notify me at</legend>

      <div className="seg w-full">
        {THRESHOLD_PRESETS.map((ratio) => {
          const value = String(Math.round(ratio * 100));
          return (
            <label key={value} className="seg-opt flex-1 justify-center">
              <input
                type="radio"
                name={BUDGET_FIELD.threshold}
                value={value}
                checked={!isCustom && preset === value}
                onChange={() => {
                  setCustom(false);
                  setPreset(value);
                }}
              />
              {formatPercent(ratio)}
            </label>
          );
        })}

        <label className="seg-opt flex-1 justify-center">
          <input
            type="radio"
            name={BUDGET_FIELD.threshold}
            value={CUSTOM_THRESHOLD}
            checked={isCustom}
            onChange={() => setCustom(true)}
            aria-controls={isCustom ? customId : undefined}
          />
          {CUSTOM_LABEL}
        </label>
      </div>

      {isCustom ? (
        <div
          id={customId}
          className={cx(
            "inset mt-2 flex min-h-[38px] items-center gap-2 px-2.5",
            error && "border-expense",
          )}
        >
          <input
            id={`${customId}-input`}
            name={BUDGET_FIELD.thresholdCustom}
            value={custom}
            onChange={(event) => setCustomValue(event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            aria-label="Custom alert threshold, in percent"
            aria-invalid={error ? true : undefined}
            aria-describedby={noteId}
            placeholder="85"
            className="text-text min-w-0 flex-1 bg-transparent text-sm tabular-nums outline-none"
          />
          <span className="text-muted text-[13px]">%</span>
        </div>
      ) : null}

      <p
        id={noteId}
        className={cx("text-meta mt-1.5", error ? "text-expense" : "text-muted")}
      >
        {error ?? alertNote(threshold, limitText)}
      </p>
    </fieldset>
  );
}

/**
 * What the chosen percentage actually costs, in the currency the limit is in.
 * Nobody thinks "85%" — they think about when they will be told, and the limit
 * is already on screen to say it with.
 */
function alertNote(threshold: string, limitText: string): string {
  const ratio = parsePercent(threshold);
  const limit = parseFigure(limitText, "IDR");

  if (ratio === null) {
    return "A whole percentage between 1 and 100.";
  }
  if (limit === null || limit <= 0) {
    return `Alerts once ${formatPercent(ratio)} of the limit is spent.`;
  }
  return `Alerts at ${formatRupiah(Math.round(limit * ratio))} of ${formatRupiah(limit)}.`;
}

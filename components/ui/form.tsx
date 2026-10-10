import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { DEFAULT_CUSTOM_COLOR, colorOrBlank } from "@/lib/category-fields";
import { RAMP_BG, cx, isHexColor, paintStyle } from "@/lib/tone";
import type { ColorKey, RampStep } from "@/types/ledger";

const CUSTOM_COLOR_LABEL = "Your own colour";

/** Native form controls on the design system's classes. */

/** Suffix for the id of a field's error line, so the input can point at it. */
function errorId(id: string): string {
  return `${id}-error`;
}

export function Field({
  id,
  label,
  error,
  children,
  className,
}: {
  readonly id: string;
  readonly label: string;
  readonly error?: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cx("field", className)}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p id={errorId(id)} className="text-expense text-meta mt-1.5">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  id,
  label,
  defaultValue,
  placeholder,
  type = "text",
  name,
  className,
  inputClassName,
  autoComplete,
  inputMode,
  maxLength,
  minLength,
  required = false,
  error,
}: {
  readonly id: string;
  readonly label: string;
  readonly defaultValue?: string;
  readonly placeholder?: string;
  readonly type?: "text" | "password" | "email" | "date" | "time";
  readonly name?: string;
  readonly className?: string;
  readonly inputClassName?: string;
  readonly autoComplete?: string;
  readonly inputMode?: "text" | "numeric";
  readonly maxLength?: number;
  readonly minLength?: number;
  readonly required?: boolean;
  readonly error?: string;
}) {
  return (
    <Field id={id} label={label} error={error} className={className}>
      <input
        className={cx("input", error && "input-invalid", inputClassName)}
        id={id}
        name={name ?? id}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        minLength={minLength}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId(id) : undefined}
      />
    </Field>
  );
}

export function TextAreaField({
  id,
  label,
  defaultValue,
  placeholder,
  rows = 3,
  className,
}: {
  readonly id: string;
  readonly label: string;
  readonly defaultValue?: string;
  readonly placeholder?: string;
  readonly rows?: number;
  readonly className?: string;
}) {
  return (
    <Field id={id} label={label} className={className}>
      <textarea
        className="input"
        id={id}
        name={id}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </Field>
  );
}

/**
 * A bare string is both the value and the label; a pair separates them, for the
 * lists whose value is a stored code rather than the words on screen.
 */
export type SelectOption =
  | string
  | { readonly value: string; readonly label: string };

function optionValue(option: SelectOption): string {
  return typeof option === "string" ? option : option.value;
}

function optionLabel(option: SelectOption): string {
  return typeof option === "string" ? option : option.label;
}

export function SelectField({
  id,
  label,
  options,
  defaultValue,
  value,
  onChange,
  className,
  name,
  error,
}: {
  readonly id: string;
  readonly label: string;
  readonly options: readonly SelectOption[];
  readonly defaultValue?: string;
  /** Pass both to drive the select from state; omit both for a plain form. */
  readonly value?: string;
  readonly onChange?: (next: string) => void;
  readonly className?: string;
  readonly name?: string;
  readonly error?: string;
}) {
  return (
    <Field id={id} label={label} error={error} className={className}>
      <select
        className={cx("input", error && "input-invalid")}
        id={id}
        name={name ?? id}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId(id) : undefined}
      >
        {options.map((option) => (
          <option key={optionValue(option)} value={optionValue(option)}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
    </Field>
  );
}

/**
 * The colour a record is drawn with: a step of the seven-colour ramp, or one
 * of the person's own.
 *
 * The steps are native radios — a swatch is the whole label, since a step has
 * no name a person would recognise and naming it by hue would lie in one of
 * the two themes, so each radio carries its position instead. The last tile is
 * the browser's own colour well. A colour chosen there unticks every radio, so
 * it posts through a hidden input of the same name.
 */
export function ColorChoiceField({
  id,
  label,
  choices,
  value,
  onChange,
  name,
  note,
  optionLabel,
}: {
  readonly id: string;
  readonly label: string;
  readonly choices: readonly RampStep[];
  readonly value: ColorKey;
  readonly onChange: (next: ColorKey) => void;
  readonly name?: string;
  /** The line under the row, saying where the choice shows up. */
  readonly note?: string;
  /** What a swatch is called, for the radio nobody can see the colour of. */
  readonly optionLabel: (choice: RampStep) => string;
}) {
  const custom = isHexColor(value) ? value : undefined;
  const field = name ?? id;

  function readWell(raw: string): void {
    const next = colorOrBlank(raw);
    if (next !== "") {
      onChange(next);
    }
  }

  return (
    <fieldset className="field" id={id}>
      <legend>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => (
          <label
            key={choice}
            className="icon-choice"
            title={optionLabel(choice)}
          >
            <input
              type="radio"
              name={field}
              value={choice}
              aria-label={optionLabel(choice)}
              checked={value === choice}
              onChange={() => onChange(choice)}
            />
            <span
              aria-hidden="true"
              className={cx("glass-fill size-4 rounded-[5px]", RAMP_BG[choice])}
            />
          </label>
        ))}

        <label
          className="icon-choice"
          title={CUSTOM_COLOR_LABEL}
          data-current={custom !== undefined}
        >
          <input
            type="color"
            aria-label={custom ? `${CUSTOM_COLOR_LABEL}, ${custom}` : CUSTOM_COLOR_LABEL}
            value={custom ?? DEFAULT_CUSTOM_COLOR}
            // Opening the well is already choosing it: a browser fires no
            // change when the colour it opened on is the one that is kept.
            onClick={(event) => readWell(event.currentTarget.value)}
            onChange={(event) => readWell(event.target.value)}
          />
          {custom ? (
            <span
              aria-hidden="true"
              className="glass-fill size-4 rounded-[5px]"
              style={paintStyle(custom)}
            />
          ) : (
            <Icon name="plus" size={15} />
          )}
        </label>
      </div>

      {custom ? <input type="hidden" name={field} value={custom} /> : null}
      {custom ? (
        <p className="text-meta text-muted mt-1.5">
          Your own colour, {custom.toUpperCase()} — it stays the same in light
          and dark.
        </p>
      ) : null}
      {note ? <p className="text-meta text-muted mt-1.5">{note}</p> : null}
    </fieldset>
  );
}

/** A label-first switch row — the artboard's `.radio` used as a checkbox. */
export function ToggleRow({
  id,
  label,
  name,
  defaultChecked = false,
  labelFirst = true,
  required = false,
  onChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly name?: string;
  readonly defaultChecked?: boolean;
  /** Set when something on the form appears or disappears with the toggle. */
  readonly onChange?: (next: boolean) => void;
  readonly labelFirst?: boolean;
  readonly required?: boolean;
}) {
  const control = (
    <>
      <input
        id={id}
        name={name ?? id}
        type="checkbox"
        defaultChecked={defaultChecked}
        required={required}
        onChange={
          onChange ? (event) => onChange(event.target.checked) : undefined
        }
      />
      <span className="dot" />
    </>
  );

  return (
    <label
      className={cx(
        "radio text-[13px]",
        labelFirst && "w-full justify-between",
      )}
      htmlFor={id}
    >
      {labelFirst ? (
        <>
          <span>{label}</span>
          {control}
        </>
      ) : (
        <>
          {control}
          <span>{label}</span>
        </>
      )}
    </label>
  );
}

export type SegmentOption = {
  readonly value: string;
  readonly label: string;
};

export function SegmentedControl({
  name,
  options,
  defaultValue,
  className,
  fill = false,
}: {
  readonly name: string;
  readonly options: readonly SegmentOption[];
  readonly defaultValue: string;
  readonly className?: string;
  readonly fill?: boolean;
}) {
  return (
    <div className={cx("seg", fill && "w-full", className)} role="group">
      {options.map((option) => (
        <label
          key={option.value}
          className={cx("seg-opt", fill && "flex-1 justify-center")}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            defaultChecked={option.value === defaultValue}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon-sprite";

import { cx } from "@/lib/tone";

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
}) {
  return (
    <Field id={id} label={label} className={className}>
      <select
        className="input"
        id={id}
        name={name ?? id}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
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
 * The icon a record wears, as a row of tiles. A radio group rather than a
 * select, because the whole point of the field is seeing the icon — and native
 * radios mean the arrow keys work and the choice posts with no state at all.
 *
 * Pass `value` + `onChange` to drive it from state, exactly as `SelectField`
 * does; omit both for a plain form.
 */
export function IconChoiceField({
  id,
  label,
  choices,
  defaultValue,
  value,
  onChange,
  name,
  note,
}: {
  readonly id: string;
  readonly label: string;
  readonly choices: readonly IconName[];
  readonly defaultValue?: IconName;
  readonly value?: IconName;
  readonly onChange?: (next: IconName) => void;
  readonly name?: string;
  /** The line under the row, saying where the icon shows up. */
  readonly note?: string;
}) {
  const isControlled = value !== undefined;

  return (
    <fieldset className="field" id={id}>
      <legend>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => (
          <label key={choice} className="icon-choice" title={choice}>
            <input
              type="radio"
              name={name ?? id}
              value={choice}
              aria-label={choice}
              {...(isControlled
                ? { checked: value === choice, onChange: () => onChange?.(choice) }
                : { defaultChecked: defaultValue === choice })}
            />
            <Icon name={choice} size={16} />
          </label>
        ))}
      </div>
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
}: {
  readonly id: string;
  readonly label: string;
  readonly name?: string;
  readonly defaultChecked?: boolean;
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

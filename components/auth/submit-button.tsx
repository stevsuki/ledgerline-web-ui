import { cx } from "@/lib/tone";

/** A submit that reports the action's pending state. */
export function SubmitButton({
  children,
  pendingLabel,
  pending,
  className = "btn btn-primary btn-block",
  name,
  value,
  formNoValidate = false,
}: {
  readonly children: string;
  readonly pendingLabel: string;
  readonly pending: boolean;
  readonly className?: string;
  readonly name?: string;
  readonly value?: string;
  /** For the second button on a card whose required fields belong to the other one. */
  readonly formNoValidate?: boolean;
}) {
  return (
    <button
      type="submit"
      name={name}
      value={value}
      formNoValidate={formNoValidate}
      disabled={pending}
      aria-busy={pending}
      className={cx(className)}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

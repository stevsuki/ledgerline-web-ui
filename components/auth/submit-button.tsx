import { cx } from "@/lib/tone";

/**
 * A submit that reports the action's pending state.
 *
 * `useActionState` already hands the form its `pending` flag, so it is passed
 * in rather than read again through `useFormStatus` — one source, and this
 * component stays free of hooks.
 */
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
  /**
   * For the second button on a card whose required fields belong to the other
   * one — the reset card's "Send OTP" must not be blocked by an empty code.
   */
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

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon-sprite";
import type { AuthFormState } from "@/lib/auth/form-state";
import { cx } from "@/lib/tone";

/** The one line an auth card says back to the person filling it in. */

export type BannerTone = "error" | "notice";

const BANNER: Readonly<
  Record<BannerTone, { readonly className: string; readonly icon: IconName }>
> = {
  error: {
    className: "border-expense/40 bg-expense/10 text-expense",
    icon: "warn",
  },
  notice: {
    className: "border-income/40 bg-income/10 text-income",
    icon: "check",
  },
};

export function FormBanner({
  tone,
  message,
}: {
  readonly tone: BannerTone;
  readonly message: string;
}) {
  const style = BANNER[tone];

  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "text-note flex items-start gap-2 rounded-[var(--radius-control)] border px-3.5 py-2.5",
        style.className,
      )}
    >
      <Icon name={style.icon} size={15} className="mt-px flex-none" />
      <span>{message}</span>
    </p>
  );
}

/** The form-level half of an action's result. Field errors sit on the fields. */
export function FormFeedback({ state }: { readonly state: AuthFormState }) {
  if (state.error) {
    return <FormBanner tone="error" message={state.error} />;
  }
  if (state.notice) {
    return <FormBanner tone="notice" message={state.notice} />;
  }
  return null;
}

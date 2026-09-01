"use client";

import type { ReactNode } from "react";

import { useAppChrome } from "@/components/shell/app-chrome";

/**
 * The artboard's demo actions all end in a confirmation toast rather than a
 * mutation. This is the one component that does that, so no screen grows its
 * own handler.
 *
 * The auth flows have outgrown it: they post to real Server Actions in
 * `lib/auth/actions.ts`. What is left here are the screens still on fixtures.
 */
export function ActionButton({
  message,
  className,
  children,
  title,
}: {
  readonly message: string;
  readonly className: string;
  readonly children: ReactNode;
  readonly title?: string;
}) {
  const { showToast } = useAppChrome();

  return (
    <button
      type="button"
      title={title}
      className={className}
      onClick={() => showToast(message)}
    >
      {children}
    </button>
  );
}

/** Opens the shared add-transaction slide-over from anywhere in the app. */
export function OpenTransactionButton({
  className,
  children,
}: {
  readonly className: string;
  readonly children: ReactNode;
}) {
  const { openTransaction } = useAppChrome();

  return (
    <button type="button" className={className} onClick={openTransaction}>
      {children}
    </button>
  );
}

"use client";

import type { ReactNode } from "react";

import { useAppChrome } from "@/components/shell/app-chrome";

/** The artboard's demo actions all end in a confirmation toast rather than a mutation. */
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
  label,
}: {
  readonly className: string;
  readonly children: ReactNode;
  readonly label?: string;
}) {
  const { openTransaction } = useAppChrome();

  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onClick={openTransaction}
    >
      {children}
    </button>
  );
}

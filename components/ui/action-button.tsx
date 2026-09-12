"use client";

import type { ReactNode } from "react";

import { useAppChrome } from "@/components/shell/app-chrome";
import { Icon } from "@/components/ui/icon";
import type { TransactionDraft } from "@/types/ledger";

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
      // Wrapped rather than passed straight through: the handler takes an
      // optional draft, and a click event is not one.
      onClick={() => openTransaction()}
    >
      {children}
    </button>
  );
}

/** The pencil on a ledger row. Icon-only, so it carries the entry's name. */
export function EditTransactionButton({
  draft,
  name,
}: {
  readonly draft: TransactionDraft;
  readonly name: string;
}) {
  const { openTransaction } = useAppChrome();

  return (
    <button
      type="button"
      aria-label={`Edit ${name}`}
      className="btn btn-secondary btn-icon text-muted hover:text-text size-[30px]"
      onClick={() => openTransaction(draft)}
    >
      <Icon name="pencil" size={14} />
    </button>
  );
}

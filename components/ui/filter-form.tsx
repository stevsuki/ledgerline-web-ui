"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition, type ReactNode } from "react";

/** A plain GET form. Filters live in the URL, so submitting is what re-runs the query. */

/** Long enough to cover ordinary typing, short enough not to feel laggy. */
const DEBOUNCE_MS = 350;

export function FilterForm({
  action,
  children,
  className,
}: {
  readonly action: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function cancelPending() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  // A keystroke that lands just before the screen unmounts must not navigate.
  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  /** The form's own fields, as the query. */
  function hrefFromForm(form: HTMLFormElement): string {
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (typeof value === "string" && value !== "") {
        params.set(key, value);
      }
    }
    const query = params.toString();
    return query ? `${action}?${query}` : action;
  }

  function apply() {
    cancelPending();
    const form = formRef.current;
    if (!form) {
      return;
    }

    const href = hrefFromForm(form);
    // `scroll: false` keeps the page still.
    startTransition(() => router.replace(href, { scroll: false }));
  }

  /** A select has no intermediate states to wait through, so it applies at once. */
  function handleChangedControl(target: EventTarget) {
    if (target instanceof HTMLSelectElement) {
      apply();
      return;
    }

    cancelPending();
    timerRef.current = setTimeout(apply, DEBOUNCE_MS);
  }

  return (
    <form
      ref={formRef}
      action={action}
      method="get"
      aria-busy={isPending}
      onChange={(event) => handleChangedControl(event.target)}
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
      className={className}
    >
      {children}
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition, type ReactNode } from "react";

/**
 * A plain GET form. Filters live in the URL, so submitting is what re-runs the
 * query — on the server, against the full dataset.
 *
 * With JavaScript off it is exactly that: a `<form method="get">` whose submit
 * button is the sr-only `<FilterSubmit>`. What this adds on top is the timing.
 *
 * - Picking from a `<select>` applies straight away.
 * - Typing waits for `DEBOUNCE_MS` of quiet, so a six-letter search is one
 *   request rather than six.
 * - Enter applies immediately and cancels whatever the debounce had queued.
 *
 * Each of those routes through `router.replace` rather than a native submit,
 * for two reasons: the search box keeps focus and caret while results update
 * behind it — a full navigation would remount the input and drop both — and
 * the filter history stays out of the back button, so Back leaves the screen
 * instead of walking a keystroke at a time.
 */

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

  /**
   * The form's own fields, as the query. An empty field is left out rather
   * than written as `?q=`, so clearing a filter clears it from the URL too.
   *
   * `page` is never among these fields, which is what sends a changed filter
   * back to page one.
   */
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
    // `scroll: false` keeps the page still: the rows update under a search box
    // that stays exactly where the person is typing.
    startTransition(() => router.replace(href, { scroll: false }));
  }

  /**
   * A select has no intermediate states to wait through, so it applies at
   * once. Anything typed into gets the debounce.
   */
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

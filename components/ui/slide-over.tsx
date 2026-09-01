"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { Icon } from "@/components/ui/icon";

/**
 * The right-hand sheet from the artboard (lines 1380 and 1437): full height,
 * 440px wide, page ground behind a divider edge.
 *
 * Keyboard behaviour is the part the design could not express — Escape closes,
 * focus moves in on open and returns to the opener on close, and Tab is kept
 * inside the sheet while it is up.
 */
export function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 440,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly subtitle: string;
  readonly children: ReactNode;
  readonly footer: ReactNode;
  readonly width?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    openerRef.current = document.activeElement;
    panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
      if (openerRef.current instanceof HTMLElement) {
        openerRef.current.focus();
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      onClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    if (!focusable || focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="animate-fade fixed inset-0 z-90 flex justify-end bg-[color-mix(in_srgb,#03050a_55%,transparent)]">
      <button
        type="button"
        aria-label="Close panel"
        className="flex-1 cursor-default"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        style={{ width }}
        className="border-divider bg-bg animate-slide flex max-w-full flex-col border-l shadow-lg"
      >
        <div className="border-divider flex items-center justify-between gap-3 border-b px-[26px] py-[22px]">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-[19px] font-semibold tracking-[-0.025em]"
            >
              {title}
            </h2>
            <p className="text-meta text-muted mt-0.5">{subtitle}</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="btn btn-secondary btn-icon"
            onClick={onClose}
          >
            <Icon name="x" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          {children}
        </div>

        <div className="border-divider flex gap-2 border-t px-[26px] py-5">
          {footer}
        </div>
      </div>
    </div>
  );
}

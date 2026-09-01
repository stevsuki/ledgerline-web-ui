"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { TEXT_TONE, cx } from "@/lib/tone";
import type { Reminder } from "@/types/ledger";

/** The header's reminder popover; the list itself is server data, passed in. */
export function NotificationBell({
  reminders,
}: {
  readonly reminders: readonly Reminder[];
}) {
  const [isOpen, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative flex-none">
      <button
        type="button"
        className="btn btn-secondary btn-icon relative"
        aria-label={`Reminders, ${reminders.length} new`}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setOpen((previous) => !previous)}
      >
        <Icon name="bell" size={17} />
        <span
          aria-hidden="true"
          className="bg-accent absolute top-[5px] right-1.5 size-[7px]"
        />
      </button>

      {isOpen ? (
        <div
          id={panelId}
          className="overlay-surface animate-rise absolute top-11 right-0 z-60 w-[min(330px,calc(100vw-2rem))]"
        >
          <div className="border-divider flex items-center justify-between border-b px-3.5 py-3">
            <span className="font-[family-name:var(--font-heading)] text-[11px] font-semibold tracking-[0.1em] uppercase">
              Reminders
            </span>
            <span className="tag tag-accent">{reminders.length} new</span>
          </div>

          <ul>
            {reminders.map((reminder) => (
              <li
                key={reminder.id}
                className="border-divider flex gap-2.5 border-b px-3.5 py-[11px]"
              >
                <Icon
                  name={reminder.icon}
                  className={cx("mt-0.5", TEXT_TONE[reminder.tone])}
                />
                <div className="min-w-0">
                  <p className="text-[13px] leading-snug">{reminder.title}</p>
                  <p className="text-meta text-muted mt-0.5">{reminder.meta}</p>
                </div>
              </li>
            ))}
          </ul>

          <Link
            href="/reminders"
            className="btn btn-ghost btn-block px-3.5 py-[11px]"
            onClick={() => setOpen(false)}
          >
            View all reminders
          </Link>
        </div>
      ) : null}
    </div>
  );
}

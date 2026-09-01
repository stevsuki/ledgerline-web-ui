"use client";

import { Icon } from "@/components/ui/icon";
import { SHELL_ID } from "@/lib/nav";
import { RAIL_COOKIE, persistPreference } from "@/lib/preferences";

/** Flips `data-rail` on the shell, which is all the width change needs. */
export function RailToggle() {
  function toggle() {
    const shell = document.getElementById(SHELL_ID);
    if (!shell) {
      return;
    }

    const next = shell.dataset.rail === "open" ? "closed" : "open";
    shell.dataset.rail = next;
    persistPreference(RAIL_COOKIE, next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="text-muted hidden items-center gap-3 px-2 py-2.5 text-[13px] lg:flex"
    >
      <Icon name="panel" size={17} />
      <span className="rail-label whitespace-nowrap">Collapse</span>
    </button>
  );
}

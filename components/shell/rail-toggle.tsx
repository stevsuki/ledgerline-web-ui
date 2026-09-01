"use client";

import { Icon } from "@/components/ui/icon";
import { RAIL_COOKIE, persistPreference } from "@/lib/preferences";

/**
 * Flips `data-rail` on the shell, which is all the width change needs — the
 * cookie write is only so the server renders the same width next time.
 */
export function RailToggle({ shellId }: { readonly shellId: string }) {
  function toggle() {
    const shell = document.getElementById(shellId);
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
      className="text-muted flex items-center gap-3 px-2 py-2.5 text-[13px]"
    >
      <Icon name="panel" size={17} />
      <span className="rail-label whitespace-nowrap">Collapse</span>
    </button>
  );
}

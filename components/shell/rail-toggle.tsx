"use client";

import { Icon } from "@/components/ui/icon";
import { NAV_ID, SHELL_ID } from "@/lib/nav";
import { RAIL_COOKIE, persistPreference } from "@/lib/preferences";

/**
 * Flips `data-rail` on the shell, which is all the width change needs.
 *
 * It sits in the header, not at the foot of the rail: down there it scrolled
 * out of sight on a long menu, and collapsed it was one unlabelled icon among
 * the others — so the way back to the full menu could not be found. Below `lg`
 * the rail is a drawer and `<NavDrawer>` owns this spot instead.
 */
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
      aria-label="Collapse or expand the menu"
      title="Collapse or expand the menu"
      aria-controls={NAV_ID}
      className="btn btn-secondary btn-icon hidden lg:inline-flex"
    >
      <Icon name="panel" size={17} />
    </button>
  );
}

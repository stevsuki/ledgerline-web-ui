"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { NAV_ID, SHELL_ID } from "@/lib/nav";

/** Below `lg` the rail is a drawer; this opens it and closes it again. */
export function NavDrawer() {
  const pathname = usePathname();

  // Held as the route the drawer was opened on rather than a boolean.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const isOpen = openedAt === pathname;

  // Whether it is out is `data-nav` on the shell, as the docked width is `data-rail`.
  useEffect(() => {
    const shell = document.getElementById(SHELL_ID);
    if (shell) {
      shell.dataset.nav = isOpen ? "open" : "closed";
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenedAt(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation"
        aria-expanded={isOpen}
        aria-controls={NAV_ID}
        onClick={() => setOpenedAt(pathname)}
        className="btn btn-secondary btn-icon lg:hidden"
      >
        <Icon name="menu" size={17} />
      </button>

      {/* Fixed, so where it sits in the DOM makes no difference to the page. */}
      <button
        type="button"
        aria-label="Close navigation"
        onClick={() => setOpenedAt(null)}
        className="nav-backdrop animate-fade cursor-default"
      />
    </>
  );
}

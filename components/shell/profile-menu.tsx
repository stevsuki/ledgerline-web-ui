"use client";

import Link from "next/link";

import { usePopover } from "@/components/shell/use-popover";
import { Icon } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/primitives";
import { signOutAction } from "@/lib/auth/actions";

/**
 * The avatar, and what belongs to the person rather than to a screen: the way
 * to their settings and the way out. Signing out lives here and nowhere else —
 * it is an action on the account, so it sits on the account, not in a list of
 * places to go. It is still a plain form over the Server Action.
 */
export function ProfileMenu({ fullName }: { readonly fullName: string }) {
  const { isOpen, toggle, close, containerRef, panelId } = usePopover();

  return (
    <div ref={containerRef} className="relative flex-none">
      <button
        type="button"
        className="grid cursor-pointer rounded-full"
        aria-label={`Account menu, signed in as ${fullName}`}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={toggle}
      >
        <Avatar name={fullName} highlight={isOpen} />
      </button>

      {isOpen ? (
        <div
          id={panelId}
          className="overlay-surface animate-rise absolute top-11 right-0 z-60 w-[min(240px,calc(100vw-2rem))] p-1.5"
        >
          <div className="border-divider mb-1.5 border-b px-2.5 pt-1.5 pb-3">
            <p className="panel-kicker">Signed in as</p>
            <p className="text-row mt-1 truncate font-semibold">{fullName}</p>
          </div>

          <Link href="/settings" className="rail-item" onClick={close}>
            <Icon name="gear" size={16} />
            Settings
          </Link>

          <form action={signOutAction}>
            <button type="submit" className="rail-item w-full">
              <Icon name="lock" size={16} />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

import { NavLink } from "@/components/shell/nav-link";
import { RailToggle } from "@/components/shell/rail-toggle";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { Icon } from "@/components/ui/icon";
import { navGroupsFromMenus } from "@/lib/access/menus";
import { NAV_ID, STREAK_CARD, WORKSPACE } from "@/lib/nav";
import type { MenuNode } from "@/types/access";

/** The rail: a Server Component, save for the active link and the collapse button. */
export function NavRail({
  menus,
}: {
  readonly menus: readonly MenuNode[];
}) {
  const groups = navGroupsFromMenus(menus);

  return (
    <nav
      id={NAV_ID}
      aria-label="Main"
      className="nav-rail bg-rail border-divider flex flex-none flex-col gap-[3px] overflow-x-hidden overflow-y-auto border-r px-3 py-[18px] transition-[width] duration-200"
    >
      <div className="flex items-center gap-2.5 px-2 pt-1 pb-4">
        <span
          aria-hidden="true"
          className="bg-accent text-bg grid size-7 flex-none place-items-center rounded-[var(--radius-tile)] font-[family-name:var(--font-heading)] text-sm font-semibold"
        >
          {WORKSPACE.initial}
        </span>
        <span className="rail-label text-base font-semibold tracking-[-0.02em] whitespace-nowrap">
          {WORKSPACE.brand}
        </span>
      </div>

      {groups.map((group, index) => (
        <div key={group.id} className="contents">
          <span
            aria-hidden="true"
            className={
              index === 0
                ? "mx-2 mt-0.5 mb-1.5 h-px bg-transparent"
                : "bg-divider mx-2 mt-2.5 mb-1.5 h-px"
            }
          />
          <span className="rail-label text-muted px-3 pb-[5px] font-[family-name:var(--font-heading)] text-[9.5px] font-semibold tracking-[0.14em] whitespace-nowrap uppercase opacity-70">
            {group.label}
          </span>
          {group.items.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </div>
      ))}

      <SignOutButton />

      <div className="flex-1" />

      <div className="rail-label border-accent/45 bg-accent/[0.09] mb-3 rounded-[var(--radius-panel)] border p-3">
        <p className="text-accent flex items-center gap-[7px] font-[family-name:var(--font-heading)] text-[11px] font-semibold tracking-[0.06em] uppercase">
          <Icon name="flame" size={14} />
          <span>{STREAK_CARD.kicker}</span>
        </p>
        <p className="text-meta text-muted mt-1.5">{STREAK_CARD.body}</p>
      </div>

      <RailToggle />
    </nav>
  );
}

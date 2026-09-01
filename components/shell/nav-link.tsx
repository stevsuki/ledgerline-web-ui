"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon-sprite";

/** The one part of the rail that has to know where the browser is. */
export function NavLink({
  href,
  label,
  icon,
}: {
  readonly href: string;
  readonly label: string;
  readonly icon: IconName;
}) {
  const pathname = usePathname();
  const isCurrent = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      title={label}
      aria-current={isCurrent ? "page" : undefined}
      className="rail-item"
    >
      <Icon name={icon} size={17} />
      <span className="rail-label overflow-hidden whitespace-nowrap">
        {label}
      </span>
    </Link>
  );
}

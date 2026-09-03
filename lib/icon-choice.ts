import { ICON_NAMES, type IconName } from "@/components/ui/icon-sprite";

/**
 * Both halves of the icon-key contract, in one place because two screens now
 * hold it: `roles.icon` and `wallets.icon` are both `VARCHAR(50)` taking any
 * string, so the client is what keeps the value meaningful — nothing outside
 * this app's sprite is ever sent, and nothing outside it is ever drawn.
 *
 * It lives at the top of `lib/` rather than beside either domain because the
 * pickers are client components, which may never import `lib/data/`.
 */

/**
 * What a form posted, as an icon the sprite can actually draw. Anything else
 * becomes `""` — the column's own way of saying "no icon of its own", which
 * each domain's read path resolves into its own default.
 */
export function iconNameOrBlank(value: string): IconName | "" {
  return ICON_NAMES.find((icon) => icon === value) ?? "";
}

/**
 * A picker's shortlist, plus whatever the record is wearing if that is not on
 * it. A value set through the API stays selectable rather than silently
 * swapping for something else the next time the form is saved.
 */
export function withCurrent(
  choices: readonly IconName[],
  current: IconName,
): readonly IconName[] {
  return choices.includes(current) ? choices : [current, ...choices];
}

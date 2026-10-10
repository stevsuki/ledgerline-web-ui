import { ICON_NAMES, type IconName } from "@/components/ui/icon-sprite";

/**
 * Both halves of the icon-key contract, in one place because every record that
 * wears an icon holds it: `roles.icon`, `wallets.icon` and `categories.icon`
 * are each a `VARCHAR(50)` taking any string, so the client is what keeps the
 * value meaningful — nothing this app cannot draw is ever sent, and nothing it
 * cannot draw is ever drawn.
 *
 * It lives at the top of `lib/` rather than beside either domain because the
 * pickers are client components, which may never import `lib/data/`.
 */

/**
 * An icon from the catalogue rather than from the inlined sprite. The prefix
 * is stored with the name: the sprite's own names were coined for this app
 * (`gear`, `cup`, `bag`) and several collide with a catalogue icon that is a
 * different drawing, so a bare name always means the sprite.
 */
export const CATALOGUE_PREFIX = "lucide:";

export type CatalogueIconName = `lucide:${string}`;

/** Anything a record may wear: a sprite symbol or a catalogue icon. */
export type IconKey = IconName | CatalogueIconName;

const CATALOGUE_SHAPE = /^lucide:[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Whether a value is shaped like a catalogue icon. Shape only — whether the
 * catalogue really carries it is the server's question (`knownIconOrBlank`),
 * because answering it here would ship two thousand names to every form.
 */
export function isCatalogueIconName(value: string): value is CatalogueIconName {
  return CATALOGUE_SHAPE.test(value);
}

export function catalogueIconName(symbol: string): CatalogueIconName {
  return `${CATALOGUE_PREFIX}${symbol}`;
}

/** The id of the `<symbol>` in the catalogue file. */
export function catalogueSymbol(name: CatalogueIconName): string {
  return name.slice(CATALOGUE_PREFIX.length);
}

/**
 * What a form posted, as an icon this app can draw. Anything else becomes
 * `""` — the column's own way of saying "no icon of its own", which each
 * domain's read path resolves into its own default.
 */
export function iconNameOrBlank(value: string): IconKey | "" {
  if (isCatalogueIconName(value)) {
    return value;
  }
  return ICON_NAMES.find((icon) => icon === value) ?? "";
}

/**
 * A picker's shortlist, plus whatever the record is wearing if that is not on
 * it. A value set through the API or found by searching stays selectable
 * rather than silently swapping for something else the next time the form is
 * saved.
 */
export function withCurrent(
  choices: readonly IconKey[],
  current: IconKey,
): readonly IconKey[] {
  return choices.includes(current) ? choices : [current, ...choices];
}

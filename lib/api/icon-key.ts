import { CATALOGUE_NAMES } from "@/lib/api/icon-catalogue-names.generated";
import {
  catalogueSymbol,
  iconNameOrBlank,
  isCatalogueIconName,
  type IconKey,
} from "@/lib/icon-choice";

/**
 * The strict half of the icon contract: a sprite symbol, or a catalogue icon
 * the catalogue file really carries. Every reader and every action goes
 * through it, so a name that would draw an empty tile is never stored and
 * never rendered. Server-only — the name list behind it is two thousand
 * strings no form needs.
 */
export function knownIconOrBlank(value: string): IconKey | "" {
  const icon = iconNameOrBlank(value);
  if (icon === "" || !isCatalogueIconName(icon)) {
    return icon;
  }
  return CATALOGUE_NAMES.has(catalogueSymbol(icon)) ? icon : "";
}

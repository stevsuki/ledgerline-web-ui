import { CATALOGUE_SPRITE_URL } from "@/lib/icon-catalogue.generated";
import {
  catalogueSymbol,
  isCatalogueIconName,
  type IconKey,
} from "@/lib/icon-choice";

type IconProps = {
  readonly name: IconKey;
  readonly size?: number;
  readonly className?: string;
  /** Set when the icon carries meaning the surrounding text does not. */
  readonly title?: string;
};

/**
 * A sprite symbol is in the page already; a catalogue icon lives in one static
 * file the browser fetches the first time any of them is drawn, then keeps.
 */
function hrefFor(name: IconKey): string {
  return isCatalogueIconName(name)
    ? `${CATALOGUE_SPRITE_URL}#${catalogueSymbol(name)}`
    : `#i-${name}`;
}

/** References a symbol from <IconSprite /> or from the icon catalogue. */
export function Icon({ name, size = 16, className, title }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      aria-hidden={title ? undefined : "true"}
      role={title ? "img" : undefined}
      aria-label={title}
      focusable="false"
      style={{ flex: "none" }}
    >
      <use href={hrefFor(name)} />
    </svg>
  );
}

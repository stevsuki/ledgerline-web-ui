import type { IconName } from "./icon-sprite";

type IconProps = {
  readonly name: IconName;
  readonly size?: number;
  readonly className?: string;
  /** Set when the icon carries meaning the surrounding text does not. */
  readonly title?: string;
};

/** References a symbol from <IconSprite />. */
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
      <use href={`#i-${name}`} />
    </svg>
  );
}

/** Chrome preferences that must be correct in the very first painted frame. */

export type Theme = "dark" | "light";

export const THEME_COOKIE = "ll-theme";
export const RAIL_COOKIE = "ll-rail";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export const DEFAULT_THEME: Theme = "dark";

export function parseTheme(value: string | undefined): Theme {
  return value === "light" ? "light" : DEFAULT_THEME;
}

export function parseRailOpen(value: string | undefined): boolean {
  return value !== "closed";
}

/** Client-side write. Same-site, not http-only: it is a display preference. */
export function persistPreference(name: string, value: string): void {
  document.cookie = `${name}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

/** Rail widths from the artboard's `railStyle` (line ~2050). */
export const RAIL_WIDTH_OPEN = 208;
export const RAIL_WIDTH_CLOSED = 62;

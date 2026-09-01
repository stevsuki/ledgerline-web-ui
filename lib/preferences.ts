/**
 * Chrome preferences that must be correct in the very first painted frame.
 *
 * They live in cookies so the server can stamp `data-theme` on <html> and give
 * the rail its width before any JavaScript runs — no flash, no layout shift.
 * The client half only writes; it never needs to read back.
 *
 * This module is imported from both sides of the boundary, so it must not
 * pull in `next/headers`.
 */

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

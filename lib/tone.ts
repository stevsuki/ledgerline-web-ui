import type { CSSProperties } from "react";

import type { ColorKey, HexColor, RampStep, Tone } from "@/types/ledger";

/** Tailwind needs whole class names at build time. */

export const TEXT_TONE: Readonly<Record<Tone, string>> = {
  text: "text-text",
  muted: "text-muted",
  income: "text-income",
  expense: "text-expense",
  warn: "text-warn",
  accent: "text-accent",
};

export const BG_TONE: Readonly<Record<Tone, string>> = {
  text: "bg-text",
  muted: "bg-muted",
  income: "bg-income",
  expense: "bg-expense",
  warn: "bg-warn",
  accent: "bg-accent",
};

export const RAMP_BG: Readonly<Record<RampStep, string>> = {
  c1: "bg-c1",
  c2: "bg-c2",
  c3: "bg-c3",
  c4: "bg-c4",
  c5: "bg-c5",
  c6: "bg-c6",
  c7: "bg-c7",
};

export const RAMP_FILL: Readonly<Record<RampStep, string>> = {
  c1: "fill-c1",
  c2: "fill-c2",
  c3: "fill-c3",
  c4: "fill-c4",
  c5: "fill-c5",
  c6: "fill-c6",
  c7: "fill-c7",
};

export const RAMP_STROKE: Readonly<Record<RampStep, string>> = {
  c1: "stroke-c1",
  c2: "stroke-c2",
  c3: "stroke-c3",
  c4: "stroke-c4",
  c5: "stroke-c5",
  c6: "stroke-c6",
  c7: "stroke-c7",
};

const HEX_COLOR = /^#[0-9a-f]{6}$/;

export function isHexColor(value: string): value is HexColor {
  return HEX_COLOR.test(value);
}

/**
 * How a `ColorKey` reaches an element. A ramp step is a class, so it follows
 * the theme; a colour of the person's own cannot be a class Tailwind saw at
 * build time, so it is the one inline style in the app. Always spread both —
 * each answers nothing for the half it does not own.
 */
export function paintClass(color: ColorKey): string | undefined {
  return isHexColor(color) ? undefined : RAMP_BG[color];
}

export function paintStyle(color: ColorKey): CSSProperties | undefined {
  return isHexColor(color) ? { backgroundColor: color } : undefined;
}

/** The same pair for an SVG mark, where the edge is a stroke. */
export function sliceClass(color: ColorKey): string | undefined {
  return isHexColor(color)
    ? undefined
    : `${RAMP_FILL[color]} ${RAMP_STROKE[color]}`;
}

export function sliceStyle(color: ColorKey): CSSProperties | undefined {
  return isHexColor(color) ? { fill: color, stroke: color } : undefined;
}

/** Joins class names, dropping anything falsy. */
export function cx(...values: readonly (string | false | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}

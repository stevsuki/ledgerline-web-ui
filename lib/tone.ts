import type { RampStep, Tone } from "@/types/ledger";

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

/** Joins class names, dropping anything falsy. */
export function cx(...values: readonly (string | false | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}

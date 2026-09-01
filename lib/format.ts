/** Money formatting, ported from the artboard's `F()` helper. */

const GROUPED = new Intl.NumberFormat("de-DE");

/** U+2212. The artboard uses a true minus, never a hyphen. */
export const MINUS_SIGN = "−";

export function formatRupiah(value: number): string {
  return `Rp${GROUPED.format(Math.abs(value))}`;
}

/** "+ Rp6.800.000" / "− Rp62.000" — the ledger row format. */
export function formatSignedRupiah(value: number): string {
  const sign = value >= 0 ? "+" : MINUS_SIGN;
  return `${sign} ${formatRupiah(value)}`;
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/** Clamped to 100 so an over-limit budget never overflows its track. */
export function toTrackWidth(ratio: number): string {
  return `${Math.min(100, ratio * 100).toFixed(0)}%`;
}

/** "Rangga Aditama" -> "RA". Used by every avatar in the app. */
export function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .slice(0, 2)
    .join("");
}

/** "27-08-2026 19:40" — the stamp the access tables print. */
const TIMESTAMP = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatTimestamp(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
  // en-GB groups with slashes; the artboard writes the date with dashes.
  return TIMESTAMP.format(parsed).replace(",", "").replaceAll("/", "-");
}

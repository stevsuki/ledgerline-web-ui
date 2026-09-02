import type { CurrencyCode } from "@/types/ledger";

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

/* ── other currencies ──────────────────────────────────────────────────── */

/** The artboard groups every currency the German way — "$1.480,00". */
const GROUPED_CENTS = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CURRENCY_PREFIX: Readonly<Record<CurrencyCode, string>> = {
  IDR: "Rp",
  USD: "$",
  SGD: "S$",
};

/** Rupiah is quoted whole; the rest carry cents. */
const CURRENCY_HAS_CENTS: Readonly<Record<CurrencyCode, boolean>> = {
  IDR: false,
  USD: true,
  SGD: true,
};

export function formatMoney(value: number, currency: CurrencyCode): string {
  const grouped = CURRENCY_HAS_CENTS[currency] ? GROUPED_CENTS : GROUPED;
  return `${CURRENCY_PREFIX[currency]}${grouped.format(Math.abs(value))}`;
}

/**
 * "−Rp3.240.000" — a balance that is owed rather than held. The minus is glued
 * to the figure here, unlike the spaced sign a ledger row prints.
 */
export function formatBalance(value: number, currency: CurrencyCode): string {
  const money = formatMoney(value, currency);
  return value < 0 ? `${MINUS_SIGN}${money}` : money;
}

/**
 * The bare grouped figure a text field edits — no currency symbol, and a plain
 * hyphen rather than the print minus, because the field is typed back into and
 * a keyboard has no U+2212 on it.
 */
export function formatFigure(value: number, currency: CurrencyCode): string {
  const grouped = CURRENCY_HAS_CENTS[currency] ? GROUPED_CENTS : GROUPED;
  const digits = grouped.format(Math.abs(value));
  return value < 0 ? `-${digits}` : digits;
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

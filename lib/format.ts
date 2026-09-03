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

/**
 * "+13.5%" / "−18%" / "0%" — a change, carrying the same true minus a money
 * figure does. Rounded first, so a change that lands on zero prints unsigned
 * rather than claiming a direction it does not have.
 */
export function formatSignedPercent(ratio: number, fractionDigits = 0): string {
  const rounded = Number((ratio * 100).toFixed(fractionDigits));
  if (rounded === 0) {
    return "0%";
  }
  const sign = rounded > 0 ? "+" : MINUS_SIGN;
  return `${sign}${Math.abs(rounded).toFixed(fractionDigits)}%`;
}

/** A rate quoted to one decimal, the way the artboard quotes a savings rate. */
export function formatPrecisePercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/** A percentage as a whole number, for the field someone types one into. */
export function toWholePercent(ratio: number): number {
  return Math.round(ratio * 100);
}

/** Below this an alert fires almost at once; above it, never usefully. */
export const PERCENT_MIN = 1;
export const PERCENT_MAX = 100;

/** A trailing sign the field prints and a person may well type back. */
const TRAILING_PERCENT = /%$/;

/**
 * A whole percentage typed into a field, as a ratio — the inverse of
 * `formatPercent`. Like `parseFigure` it answers `null` rather than 0, and for
 * the same reason: a threshold read as 0% would alert on every budget the
 * moment it was saved, which is wrong in the noisiest possible way and gives
 * no sign that what was typed could not be read.
 *
 * Anything outside 1–100 is `null` too. Past 100 the alert can only fire after
 * the row already says "Over limit", which is the stronger word for it.
 */
export function parsePercent(text: string): number | null {
  const digits = text.trim().replace(TRAILING_PERCENT, "").trim();
  if (!DIGITS.test(digits)) {
    return null;
  }

  const percent = Number(digits);
  if (percent < PERCENT_MIN || percent > PERCENT_MAX) {
    return null;
  }
  return percent / 100;
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

/* ── reading a typed figure back ───────────────────────────────────────── */

/** Anything that is not a digit once the separators have been taken out. */
const DIGITS = /^\d+$/;

/** Both minus signs: the print one the app writes, the keyboard one it accepts. */
const LEADING_SIGN = /^[-−+]/;

/**
 * The inverse of `formatFigure`: what the person typed, as a whole number of
 * the currency's own units. Grouping dots are dropped and — for the currencies
 * quoted with cents — a comma is read as the decimal point, because that is
 * exactly how the field printed the figure it is being typed over.
 *
 * `null` means it could not be read at all, which is a field error rather than
 * a zero: silently saving 0 over a balance would lose money on screen.
 */
export function parseFigure(
  text: string,
  currency: CurrencyCode,
): number | null {
  const trimmed = text.trim();
  if (trimmed === "") {
    return null;
  }

  const isNegative = trimmed.startsWith("-") || trimmed.startsWith(MINUS_SIGN);
  const body = trimmed
    .replace(LEADING_SIGN, "")
    .replaceAll(".", "")
    .replaceAll(" ", "");

  // Only a cents currency has a decimal separator to read; the rest is grouping.
  const parts = CURRENCY_HAS_CENTS[currency]
    ? body.split(",")
    : [body.replaceAll(",", "")];
  if (parts.length > 2) {
    return null;
  }

  const [units, fraction = ""] = parts;
  if (!DIGITS.test(units) || (fraction !== "" && !DIGITS.test(fraction))) {
    return null;
  }

  const value = Math.round(Number(`${units}.${fraction || "0"}`));
  if (!Number.isSafeInteger(value)) {
    return null;
  }

  return isNegative && value !== 0 ? -value : value;
}

/** Narrowing helpers for JSON that has just come off the wire. */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readString(
  source: Record<string, unknown>,
  key: string,
): string | null {
  const value = source[key];
  return typeof value === "string" ? value : null;
}

export function readNumber(
  source: Record<string, unknown>,
  key: string,
): number | null {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Reads a value that must be one of a fixed set, else the given fallback. */
export function readEnum<T extends string>(
  source: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = source[key];
  const match = allowed.find((option) => option === value);
  return match ?? fallback;
}

/** Absent or non-boolean reads as false, which is what a missing grant means. */
export function readBoolean(
  source: Record<string, unknown>,
  key: string,
): boolean {
  return source[key] === true;
}

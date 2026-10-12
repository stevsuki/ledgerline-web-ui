/** What a mask keeps: digits, the decimal comma and a leading minus. */
const SIGNIFICANT = /[\d,-]/;

function countSignificant(text: string): number {
  let count = 0;
  for (const char of text) {
    if (SIGNIFICANT.test(char)) {
      count += 1;
    }
  }
  return count;
}

/** The index just past the first `count` significant characters. */
function indexAfter(text: string, count: number): number {
  if (count === 0) {
    return 0;
  }

  let seen = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (SIGNIFICANT.test(text[index])) {
      seen += 1;
      if (seen === count) {
        return index + 1;
      }
    }
  }
  return text.length;
}

/**
 * Rewrites a field through `mask` as it is typed and answers the new text.
 * The value is written to the element first, so the caret stays where the
 * person was typing instead of jumping to the end when React re-renders.
 */
export function applyMask(
  input: HTMLInputElement,
  mask: (text: string) => string,
): string {
  const caret = input.selectionStart ?? input.value.length;
  const before = countSignificant(input.value.slice(0, caret));
  const next = mask(input.value);

  if (next !== input.value) {
    input.value = next;
    const position = indexAfter(next, before);
    input.setSelectionRange(position, position);
  }
  return next;
}

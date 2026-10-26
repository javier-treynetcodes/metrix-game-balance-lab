const INTEGER_PATTERN = /^[+-]?\d+$/;

/**
 * Strict whole-number parser. Returns `undefined` for empty cells and `NaN` for anything that is
 * not a whole number (text, decimals, units). Negative numbers are returned so callers can report them.
 */
export function parseInteger(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  if (!INTEGER_PATTERN.test(trimmed)) return Number.NaN;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) ? value : Number.NaN;
}

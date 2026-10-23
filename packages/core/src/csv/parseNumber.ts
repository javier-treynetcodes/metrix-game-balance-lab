const NUMBER_PATTERN = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;

/**
 * Strict numeric parser. Returns `undefined` for empty cells and `NaN` for text.
 * With `decimalComma`, `0,65` is read as 0.65 (spreadsheets exported with `;`).
 */
export function parseNumber(raw: string, decimalComma: boolean): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const normalized = decimalComma ? trimmed.replace(',', '.') : trimmed;
  return NUMBER_PATTERN.test(normalized) ? Number(normalized) : Number.NaN;
}

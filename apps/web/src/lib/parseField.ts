import { parseInteger } from '@metrix/core';

export type Parsed = { ok: true; value: number | undefined } | { ok: false; error: string };

/** Reads a number typed in the editor: whole numbers only, and 0 or more unless negatives are allowed. */
export function parseField(text: string, { required = false, allowNegative = false } = {}): Parsed {
  const value = parseInteger(text);
  if (value === undefined) return required ? { ok: false, error: 'Enter a whole number, e.g. 48.' } : { ok: true, value };
  if (Number.isNaN(value)) return { ok: false, error: 'Whole numbers only: write 48, not 48.5 or "48 hp".' };
  if (value < 0 && !allowNegative) return { ok: false, error: 'Use 0 or more.' };
  return { ok: true, value };
}

/**
 * @file Meaning of each CSV header, shared by the importer and the exporter.
 */

/** Columns from older versions of the template, reported with how to move their values. */
export type RetiredColumn = 'category' | 'hybrid';

/** What a CSV column means. Shared by the importer and the exporter so both read headers the same way. */
export type ColumnRole =
  | { kind: 'id' | 'kind' | 'name' | 'character' | 'class' | 'cost' | 'hp' | 'speed' | 'move' }
  | { kind: 'atk' | 'def'; channel: string }
  | { kind: 'tag'; key: string }
  | { kind: 'stat'; key: string }
  | { kind: 'retired'; column: RetiredColumn }
  | { kind: 'unsupported' | 'rate' };

const FIXED_COLUMNS = ['id', 'kind', 'name', 'character', 'class', 'cost', 'hp', 'speed', 'move'] as const;

/** Word that hybrid columns of older templates used after `atk:` or `def:`. */
const HYBRID = 'hybrid';

/** Role of a header, given in lower case and trimmed. */
export function classifyHeader(canonical: string): ColumnRole {
  if ((FIXED_COLUMNS as readonly string[]).includes(canonical)) {
    return { kind: canonical as (typeof FIXED_COLUMNS)[number] };
  }
  if (canonical === 'category') return { kind: 'retired', column: 'category' };
  if (canonical === 'rate') return { kind: 'rate' };
  const separator = canonical.indexOf(':');
  if (separator <= 0) return { kind: 'stat', key: canonical };

  const prefix = canonical.slice(0, separator);
  const rest = canonical.slice(separator + 1).trim();
  if (prefix === 'atk' || prefix === 'def') {
    if (rest === HYBRID || rest.startsWith(`${HYBRID}:`)) return { kind: 'retired', column: 'hybrid' };
    if (rest !== '') return { kind: prefix, channel: rest };
  }
  if (prefix === 'tag' && rest !== '') return { kind: 'tag', key: rest };
  if (prefix === 'pen') return { kind: 'unsupported' };
  return { kind: 'stat', key: canonical };
}

/** Header text for a role, using the current channel names. */
export function headerFor(role: ColumnRole, original: string, channelName: (key: string) => string): string {
  if (role.kind === 'atk' || role.kind === 'def') return `${role.kind}:${channelName(role.channel)}`;
  return original;
}

/**
 * @file Meaning of each CSV header, shared by the importer and the exporter.
 */

/** What a CSV column means. Shared by the importer and the exporter so both read headers the same way. */
export type ColumnRole =
  | { kind: 'id' | 'name' | 'category' | 'cost' | 'hp' }
  | { kind: 'atk' | 'def' | 'hybridAtk' | 'hybridDef'; channel: string }
  | { kind: 'tag'; key: string }
  | { kind: 'stat'; key: string }
  | { kind: 'unsupported' | 'rate' | 'reserved' };

const FIXED_COLUMNS = ['id', 'name', 'category', 'cost', 'hp'] as const;

/** Reserved word for hybrid columns; it cannot be the name of a channel. */
export const HYBRID = 'hybrid';

/** Role of a header, given in lower case and trimmed. */
export function classifyHeader(canonical: string): ColumnRole {
  if ((FIXED_COLUMNS as readonly string[]).includes(canonical)) {
    return { kind: canonical as (typeof FIXED_COLUMNS)[number] };
  }
  if (canonical === 'rate') return { kind: 'rate' };
  const separator = canonical.indexOf(':');
  if (separator <= 0) return { kind: 'stat', key: canonical };

  const prefix = canonical.slice(0, separator);
  const rest = canonical.slice(separator + 1).trim();
  if (prefix === 'atk' || prefix === 'def') {
    if (rest === HYBRID) return { kind: 'reserved' };
    if (rest.startsWith(`${HYBRID}:`)) {
      const channel = rest.slice(HYBRID.length + 1).trim();
      if (channel === '' || channel === HYBRID) return { kind: 'reserved' };
      return { kind: prefix === 'atk' ? 'hybridAtk' : 'hybridDef', channel };
    }
    if (rest !== '') return { kind: prefix, channel: rest };
  }
  if (prefix === 'tag' && rest !== '') return { kind: 'tag', key: rest };
  if (prefix === 'pen') return { kind: 'unsupported' };
  return { kind: 'stat', key: canonical };
}

/** Header text for a role, using the current channel names. */
export function headerFor(role: ColumnRole, original: string, channelName: (key: string) => string): string {
  switch (role.kind) {
    case 'atk':
    case 'def':
      return `${role.kind}:${channelName(role.channel)}`;
    case 'hybridAtk':
      return `atk:${HYBRID}:${channelName(role.channel)}`;
    case 'hybridDef':
      return `def:${HYBRID}:${channelName(role.channel)}`;
    default:
      return original;
  }
}

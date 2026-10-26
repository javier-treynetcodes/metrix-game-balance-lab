import type { Channel, DamageBreakdown, DamageRow } from '@metrix/core';
import { channelLabel } from './schema';

/** The subtraction of one row, written out: "30 − (20 + 10) = 0". */
export function rowExpression(row: DamageRow): string {
  const defense = row.hybridDefense > 0 ? `(${row.defense} + ${row.hybridDefense})` : String(row.defense);
  return `${row.attack} − ${defense} = ${row.damage}`;
}

/** Plain-language reasons behind a damage breakdown. */
export function damageReasons(
  attacker: string,
  defender: string,
  breakdown: DamageBreakdown,
  channels: readonly Channel[],
): string[] {
  if (breakdown.attack === 0) return [`${attacker} has no attack, so it cannot damage ${defender}.`];
  return breakdown.rows.flatMap((row) => {
    if (row.attack === 0) return [];
    const label = channelLabel(channels, row.channel);
    const kind = row.source === 'hybrid' ? `hybrid ${label} part` : `${label} attack`;
    if (row.fullDamage) return [`${defender} has no ${label} defense, so ${attacker}'s ${kind} (${row.attack}) lands in full.`];
    if (row.damage === 0) {
      const armor = row.hybridDefense > 0 ? ` plus ${row.hybridDefense} hybrid armor` : '';
      return [`${defender}'s ${label} defense (${row.defense}${armor}) stops ${attacker}'s ${kind} (${row.attack}) completely.`];
    }
    return [];
  });
}

/** Short reason why an attack does no damage, for the walls list. */
export function wallReason(breakdown: DamageBreakdown, channels: readonly Channel[]): string {
  if (breakdown.attack === 0) return 'no attack';
  return breakdown.rows
    .filter((row) => row.attack > 0)
    .map((row) => {
      const label = channelLabel(channels, row.channel);
      const defense = row.hybridDefense > 0 ? `${row.defense} + ${row.hybridDefense} hybrid` : String(row.defense);
      return `${label} ${row.attack} vs defense ${defense}`;
    })
    .join(', ');
}

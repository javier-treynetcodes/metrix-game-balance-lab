/**
 * @file Plain-language explanations of damage results, used by Versus and the walls list.
 */

import type { Channel, DamageBreakdown } from '@metrix/core';
import { statCode } from './codes';

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
    const attack = statCode(row.source === 'hybrid' ? 'hyb' : 'atk', channels, row.channel);
    const defense = statCode('def', channels, row.channel);
    if (row.fullDamage) {
      const armor = row.source === 'hybrid' ? ` or ${statCode('arm', channels, row.channel)}` : '';
      return [`${defender} has no ${defense}${armor}, so ${attacker}'s ${attack} (${row.attack}) lands in full.`];
    }
    if (row.damage === 0) {
      const armor = row.hybridDefense > 0 ? ` + ${statCode('arm', channels, row.channel)} ${row.hybridDefense}` : '';
      return [`${defender}'s ${defense} ${row.defense}${armor} stops ${attacker}'s ${attack} (${row.attack}) completely.`];
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
      const attack = statCode(row.source === 'hybrid' ? 'hyb' : 'atk', channels, row.channel);
      const armor = row.hybridDefense > 0 ? ` + ${statCode('arm', channels, row.channel)} ${row.hybridDefense}` : '';
      return `${attack} ${row.attack} vs ${statCode('def', channels, row.channel)} ${row.defense}${armor}`;
    })
    .join(', ');
}

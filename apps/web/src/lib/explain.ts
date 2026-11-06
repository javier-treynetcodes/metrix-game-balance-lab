/**
 * @file Plain-language explanations of damage results, used by Versus and the walls list.
 */

import type { Channel, DamageBreakdown, DamageRow } from '@metrix/core';
import { statCode } from './codes';

/** "DEF 1 30 x 20 % + DEF 2 10": the armors behind a defense, with their share when it is not 100%. */
export function armorText(row: DamageRow, channels: readonly Channel[]): string {
  return row.armor
    .map(({ armor, value, percent }) => `${statCode('def', channels, armor)} ${value}${percent === 100 ? '' : ` × ${percent} %`}`)
    .join(' + ');
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
    const attack = statCode('atk', channels, row.channel);
    if (row.fullDamage) {
      return [`No armor of ${defender} covers ${attack}, so ${attacker}'s ${attack} (${row.attack}) lands in full.`];
    }
    if (row.damage === 0) {
      return [`${defender}'s armor (${armorText(row, channels)} = ${row.defense}) stops ${attacker}'s ${attack} (${row.attack}) completely.`];
    }
    return [];
  });
}

/** Short reason why an attack does no damage, for the walls list. */
export function wallReason(breakdown: DamageBreakdown, channels: readonly Channel[]): string {
  if (breakdown.attack === 0) return 'no attack';
  return breakdown.rows
    .map((row) => `${statCode('atk', channels, row.channel)} ${row.attack} vs armor ${row.defense}`)
    .join(', ');
}

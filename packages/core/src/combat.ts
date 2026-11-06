/**
 * @file Damage of one hit and hits to defeat. Only whole numbers, never below 0.
 */

import { armorAgainst, type ArmorPart } from './coverage';
import type { ArmorCoverage, AttackType, Channel, Entity } from './types';

/** Kind of damage the entity deals: none, one channel, or both channels at once (mixed). */
export function attackType(entity: Entity): AttackType {
  const channels = Object.values(entity.atk).filter((value) => value > 0).length;
  if (channels === 0) return 'none';
  return channels === 1 ? 'channel' : 'mixed';
}

/** One subtraction of the damage calculation: attack on a channel minus the defense against it. */
export interface DamageRow {
  channel: string;
  attack: number;
  /** Defender's armor against this channel, after coverage and rounding down. */
  defense: number;
  /** Armors behind `defense`, with the share of this channel each one stops. */
  armor: ArmorPart[];
  /** attack - defense, never below 0. */
  damage: number;
  /** True when no armor covers this channel: the attack lands in full. */
  fullDamage: boolean;
}

/**
 * Full damage calculation of one hit, ready to be shown step by step.
 * `rows` holds one subtraction per channel the attacker hits; the totals summarize them.
 */
export interface DamageBreakdown {
  rows: DamageRow[];
  /** Sum of the attack values. */
  attack: number;
  /** How much of the attack the defender's armor stopped. */
  blocked: number;
  /** Damage per hit: sum of the rows. */
  damage: number;
}

/**
 * Damage of one hit of `attacker` on `defender`, step by step. For every channel the attacker
 * hits, the defender's armors stop their coverage share of it (rounded down) and the rest lands,
 * never below 0. A mixed attack adds up both channels.
 */
export function damageBreakdown(
  attacker: Entity,
  defender: Entity,
  channels: readonly Channel[],
  coverage: ArmorCoverage = {},
): DamageBreakdown {
  const rows: DamageRow[] = [];
  for (const { key } of channels) {
    const attack = attacker.atk[key] ?? 0;
    if (attack <= 0) continue;
    const { total, parts } = armorAgainst(defender, key, channels, coverage);
    rows.push({
      channel: key,
      attack,
      defense: total,
      armor: parts,
      damage: Math.max(attack - total, 0),
      fullDamage: total === 0,
    });
  }
  const attack = rows.reduce((sum, row) => sum + row.attack, 0);
  const damage = rows.reduce((sum, row) => sum + row.damage, 0);
  return { rows, attack, blocked: attack - damage, damage };
}

/** Outcome of `attacker` trying to defeat `defender`, counted in hits (attacks, shots, strikes...). */
export type HitsToDefeat =
  | { kind: 'defeats'; hits: number }
  | { kind: 'cannot-damage' }
  | { kind: 'no-hp' };

/**
 * Number of hits needed for the accumulated damage to reach the defender's hp.
 * `cannot-damage` when a hit deals 0, so the UI never shows infinity.
 */
export function hitsToDefeat(damagePerHit: number, defender: Entity): HitsToDefeat {
  if (defender.hp === undefined) return { kind: 'no-hp' };
  if (damagePerHit <= 0) return { kind: 'cannot-damage' };
  return { kind: 'defeats', hits: Math.ceil(defender.hp / damagePerHit) };
}

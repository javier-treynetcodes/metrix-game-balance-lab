import type { AttackType, Channel, Entity } from './types';

/** Kind of damage the entity deals. A hybrid attack wins over stray single-channel values. */
export function attackType(entity: Entity): AttackType {
  if (entity.hybridAtk) return 'hybrid';
  return Object.values(entity.atk).some((value) => value > 0) ? 'channel' : 'none';
}

/** One subtraction of the damage calculation: attack on a channel minus the defense that applies. */
export interface DamageRow {
  channel: string;
  source: 'channel' | 'hybrid';
  attack: number;
  /** Defender's base defense on the channel. */
  defense: number;
  /** Defender's hybrid armor on the channel; only counts against hybrid attacks, 0 otherwise. */
  hybridDefense: number;
  /** attack − (defense + hybridDefense), never below 0. */
  damage: number;
  /** True when nothing reduces the attack: it lands in full. */
  fullDamage: boolean;
}

export interface DamageBreakdown {
  rows: DamageRow[];
  /** Sum of the attack values. */
  attack: number;
  /** How much of the attack the defender's defense stopped. */
  blocked: number;
  /** Damage per hit: sum of the rows. */
  damage: number;
}

/**
 * Damage of one hit of `attacker` on `defender`, step by step. Only whole-number subtractions:
 * each channel's attack minus the defense on that same channel, never below 0.
 * Hybrid attacks hit both channels and also face the defender's hybrid armor.
 */
export function damageBreakdown(
  attacker: Entity,
  defender: Entity,
  channels: readonly Channel[],
): DamageBreakdown {
  const rows: DamageRow[] = [];
  const hybrid = attacker.hybridAtk;
  for (const { key } of channels) {
    const attack = hybrid ? (hybrid[key] ?? 0) : (attacker.atk[key] ?? 0);
    if (!hybrid && attack <= 0) continue;
    const defense = defender.def[key] ?? 0;
    const hybridDefense = hybrid ? (defender.hybridDef[key] ?? 0) : 0;
    rows.push({
      channel: key,
      source: hybrid ? 'hybrid' : 'channel',
      attack,
      defense,
      hybridDefense,
      damage: Math.max(attack - defense - hybridDefense, 0),
      fullDamage: attack > 0 && defense + hybridDefense === 0,
    });
  }
  const attack = rows.reduce((sum, row) => sum + row.attack, 0);
  const damage = rows.reduce((sum, row) => sum + row.damage, 0);
  return { rows, attack, blocked: attack - damage, damage };
}

/** Outcome of `attacker` trying to defeat `defender`, counted in hits (attacks, shots, strikes…). */
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

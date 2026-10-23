import { mitigate } from './mitigation';
import type { Channel, Entity, InteractionMatrix } from './types';

/** Interaction multiplier m(A,B). 1 when there is no matrix, tag or pair. */
export function interactionMultiplier(
  attacker: Entity,
  defender: Entity,
  matrix?: InteractionMatrix,
): number {
  if (!matrix) return 1;
  const from = attacker.tags[matrix.tagKey];
  const to = defender.tags[matrix.tagKey];
  if (from === undefined || to === undefined) return 1;
  return matrix.multipliers[from]?.[to] ?? 1;
}

/** D(A→B): damage per hit of `attacker` against `defender`, summed over all channels. */
export function damagePerHit(
  attacker: Entity,
  defender: Entity,
  channels: readonly Channel[],
  matrix?: InteractionMatrix,
): number {
  let total = 0;
  for (const channel of channels) {
    total += mitigate(attacker.atk[channel.key] ?? 0, defender.def[channel.key] ?? 0, channel);
  }
  return interactionMultiplier(attacker, defender, matrix) * total;
}

/** Outcome of `attacker` trying to defeat `defender`. */
export type TimeToDefeat =
  | { kind: 'defeats'; time: number }
  | { kind: 'cannot-damage' }
  | { kind: 'not-applicable'; reason: 'missing-hp' };

/**
 * t(A→B) = hp[B] / (D(A→B) · rate[A]), in seconds or turns depending on how `rate` is defined.
 * Returns `cannot-damage` when D(A→B) is 0 so the UI never shows infinity.
 */
export function timeToDefeat(
  attacker: Entity,
  defender: Entity,
  channels: readonly Channel[],
  matrix?: InteractionMatrix,
): TimeToDefeat {
  if (defender.hp === undefined) return { kind: 'not-applicable', reason: 'missing-hp' };
  const damage = damagePerHit(attacker, defender, channels, matrix);
  const dps = damage * attacker.rate;
  if (dps <= 0) return { kind: 'cannot-damage' };
  return { kind: 'defeats', time: defender.hp / dps };
}

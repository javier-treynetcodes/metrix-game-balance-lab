import { damageBreakdown, hitsToDefeat, type DamageBreakdown, type HitsToDefeat } from './combat';
import type { Channel, Entity } from './types';

/** Ways to compare two entities. Every one is a whole number. */
export type Metric = 'hits' | 'damage' | 'trade' | 'blocked';

export const METRICS: readonly Metric[] = ['hits', 'damage', 'trade', 'blocked'];

/** Who comes out ahead. `none` when the metric does not rank (blocked) or nobody can win. */
export type Winner = 'attacker' | 'defender' | 'draw' | 'none';

/** Everything about `attacker` against `defender`, in both directions. */
export interface Matchup {
  attackerId: string;
  defenderId: string;
  /** attacker → defender. */
  forward: DamageBreakdown;
  /** defender → attacker. */
  backward: DamageBreakdown;
  forwardHits: HitsToDefeat;
  backwardHits: HitsToDefeat;
  /** Damage dealt minus damage received in one exchange of hits. */
  trade: number;
}

export function matchup(attacker: Entity, defender: Entity, channels: readonly Channel[]): Matchup {
  const forward = damageBreakdown(attacker, defender, channels);
  const backward = damageBreakdown(defender, attacker, channels);
  return {
    attackerId: attacker.id,
    defenderId: defender.id,
    forward,
    backward,
    forwardHits: hitsToDefeat(forward.damage, defender),
    backwardHits: hitsToDefeat(backward.damage, attacker),
    trade: forward.damage - backward.damage,
  };
}

/** Every entity against every other one: rows are attackers, columns are defenders, in input order. */
export function matchupMatrix(entities: readonly Entity[], channels: readonly Channel[]): Matchup[][] {
  return entities.map((attacker) => entities.map((defender) => matchup(attacker, defender, channels)));
}

function compareHigher(forward: number, backward: number): Winner {
  if (forward === 0 && backward === 0) return 'none';
  if (forward === backward) return 'draw';
  return forward > backward ? 'attacker' : 'defender';
}

/**
 * Winner by the chosen metric.
 * - `hits`: fewer hits to defeat wins; the same number of hits is a draw (both fall together).
 * - `damage` and `trade`: whoever deals more damage per hit wins.
 * - `blocked` only describes armor, so it never names a winner.
 */
export function winnerBy(result: Matchup, metric: Metric): Winner {
  switch (metric) {
    case 'hits': {
      const forward = result.forwardHits.kind === 'defeats' ? result.forwardHits.hits : undefined;
      const backward = result.backwardHits.kind === 'defeats' ? result.backwardHits.hits : undefined;
      if (forward === undefined && backward === undefined) return 'none';
      if (backward === undefined) return 'attacker';
      if (forward === undefined) return 'defender';
      if (forward === backward) return 'draw';
      return forward < backward ? 'attacker' : 'defender';
    }
    case 'damage':
    case 'trade':
      return compareHigher(result.forward.damage, result.backward.damage);
    case 'blocked':
      return 'none';
  }
}

/**
 * How many hits separate winner and loser, when both can defeat each other.
 * Positive when the attacker needs fewer hits. `undefined` otherwise.
 */
export function hitsMargin(result: Matchup): number | undefined {
  if (result.forwardHits.kind !== 'defeats' || result.backwardHits.kind !== 'defeats') return undefined;
  return result.backwardHits.hits - result.forwardHits.hits;
}

/** The value a matrix cell shows for a metric, from the attacker's point of view. */
export function metricValue(result: Matchup, metric: Metric): number | undefined {
  switch (metric) {
    case 'hits':
      return result.forwardHits.kind === 'defeats' ? result.forwardHits.hits : undefined;
    case 'damage':
      return result.forward.damage;
    case 'trade':
      return result.trade;
    case 'blocked':
      return result.forward.blocked;
  }
}

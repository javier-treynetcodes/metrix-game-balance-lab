/**
 * @file Head-to-head comparisons: the metrics, winners and the full matchup matrix.
 */

import { damageBreakdown, hitsToDefeat, type DamageBreakdown, type HitsToDefeat } from './combat';
import type { ArmorCoverage, Channel, Entity } from './types';

/**
 * Ways to compare two entities. All are whole numbers except `time`, which is shown with
 * decimals but always compared exactly with whole numbers (see `winnerBy`).
 */
export type Metric = 'hits' | 'time' | 'damage' | 'trade' | 'blocked';

/** Every metric, in the order the UI lists them. `time` only makes sense when the catalog uses speed. */
export const METRICS: readonly Metric[] = ['hits', 'time', 'damage', 'trade', 'blocked'];

/** Normal attack speed, as a percentage. Entities without speed attack at this rate. */
export const NORMAL_SPEED = 100;

/** Attack speed of an entity as a whole percentage, normal when the catalog does not use speed. */
export function attackSpeed(entity: Entity): number {
  return entity.speed ?? NORMAL_SPEED;
}

/** Who comes out ahead. `none` when the metric does not rank (blocked) or nobody can win. */
export type Winner = 'attacker' | 'defender' | 'draw' | 'none';

/** Everything about `attacker` against `defender`, in both directions. */
export interface Matchup {
  attackerId: string;
  defenderId: string;
  /** attacker -> defender. */
  forward: DamageBreakdown;
  /** defender -> attacker. */
  backward: DamageBreakdown;
  forwardHits: HitsToDefeat;
  backwardHits: HitsToDefeat;
  /** Damage dealt minus damage received in one exchange of hits. */
  trade: number;
  /** Attack speed of each side, as a whole percentage (100 when the catalog has no speed). */
  speed: { attacker: number; defender: number };
  /** Movement speed of each side; undefined when the catalog has no move. Never changes the result. */
  move: { attacker: number | undefined; defender: number | undefined };
}

/**
 * Computes everything about one pair: the damage breakdown in both directions, the hits each
 * side needs to defeat the other and the trade. All metrics and winners are read from this.
 * Pass the entities already equipped when complements should count.
 */
export function matchup(
  attacker: Entity,
  defender: Entity,
  channels: readonly Channel[],
  coverage: ArmorCoverage = {},
): Matchup {
  const forward = damageBreakdown(attacker, defender, channels, coverage);
  const backward = damageBreakdown(defender, attacker, channels, coverage);
  return {
    attackerId: attacker.id,
    defenderId: defender.id,
    forward,
    backward,
    forwardHits: hitsToDefeat(forward.damage, defender),
    backwardHits: hitsToDefeat(backward.damage, attacker),
    trade: forward.damage - backward.damage,
    speed: { attacker: attackSpeed(attacker), defender: attackSpeed(defender) },
    move: { attacker: attacker.move, defender: defender.move },
  };
}

/** Every entity against every other one: rows are attackers, columns are defenders, in input order. */
export function matchupMatrix(
  entities: readonly Entity[],
  channels: readonly Channel[],
  coverage: ArmorCoverage = {},
): Matchup[][] {
  return entities.map((attacker) => entities.map((defender) => matchup(attacker, defender, channels, coverage)));
}

/** Hits to defeat as a number, or undefined when that side cannot defeat the other. */
function hitsOf(result: HitsToDefeat): number | undefined {
  return result.kind === 'defeats' ? result.hits : undefined;
}

/**
 * Fewer wins, for hits or time. Each side's cost is given as a whole number (`forward` for the
 * attacker); a side that cannot defeat the other loses to one that can.
 */
function compareLower(forward: number | undefined, backward: number | undefined): Winner {
  if (forward === undefined && backward === undefined) return 'none';
  if (backward === undefined) return 'attacker';
  if (forward === undefined) return 'defender';
  if (forward === backward) return 'draw';
  return forward < backward ? 'attacker' : 'defender';
}

function compareHigher(forward: number, backward: number): Winner {
  if (forward === 0 && backward === 0) return 'none';
  if (forward === backward) return 'draw';
  return forward > backward ? 'attacker' : 'defender';
}

/**
 * Winner by the chosen metric.
 * - `hits`: fewer hits to defeat wins; the same number of hits is a draw (both fall together).
 * - `time`: less time to defeat wins. Time is hits * 100 / speed; to avoid rounding, the two
 *   times are compared as whole numbers by cross-multiplying: the attacker wins when
 *   hits(attacker) * speed(defender) < hits(defender) * speed(attacker).
 * - `damage` and `trade`: whoever deals more damage per hit wins.
 * - `blocked` only describes armor, so it never names a winner.
 */
export function winnerBy(result: Matchup, metric: Metric): Winner {
  switch (metric) {
    case 'hits':
      return compareLower(hitsOf(result.forwardHits), hitsOf(result.backwardHits));
    case 'time': {
      const forward = hitsOf(result.forwardHits);
      const backward = hitsOf(result.backwardHits);
      return compareLower(
        forward === undefined ? undefined : forward * result.speed.defender,
        backward === undefined ? undefined : backward * result.speed.attacker,
      );
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

/**
 * Time the attacker needs to defeat the defender, in hits at normal speed:
 * hits * 100 / speed (20 hits at 125% -> 16). For display only; winners use `winnerBy`.
 * Undefined when the attacker cannot defeat the defender.
 */
export function timeToDefeat(result: Matchup, direction: 'forward' | 'backward' = 'forward'): number | undefined {
  const hits = hitsOf(direction === 'forward' ? result.forwardHits : result.backwardHits);
  const speed = direction === 'forward' ? result.speed.attacker : result.speed.defender;
  return hits === undefined ? undefined : (hits * NORMAL_SPEED) / speed;
}

/** The value a matrix cell shows for a metric, from the attacker's point of view. */
export function metricValue(result: Matchup, metric: Metric): number | undefined {
  switch (metric) {
    case 'hits':
      return hitsOf(result.forwardHits);
    case 'time':
      return timeToDefeat(result);
    case 'damage':
      return result.forward.damage;
    case 'trade':
      return result.trade;
    case 'blocked':
      return result.forward.blocked;
  }
}

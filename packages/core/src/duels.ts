import { timeToDefeat, type TimeToDefeat } from './combat';
import type { Channel, Entity, InteractionMatrix } from './types';

/** Who wins a one-on-one duel where both sides attack at the same time. */
export type DuelWinner = 'attacker' | 'defender' | 'draw' | 'stalemate';

export interface Duel {
  attackerId: string;
  defenderId: string;
  /** t(attacker→defender). */
  attack: TimeToDefeat;
  /** t(defender→attacker). */
  counter: TimeToDefeat;
  winner: DuelWinner;
}

/** Relative tolerance under which two times count as a draw (absorbs floating-point noise). */
const DRAW_TOLERANCE = 1e-9;

function winnerOf(attack: TimeToDefeat, counter: TimeToDefeat): DuelWinner {
  const a = attack.kind === 'defeats' ? attack.time : undefined;
  const c = counter.kind === 'defeats' ? counter.time : undefined;
  if (a === undefined && c === undefined) return 'stalemate';
  if (c === undefined) return 'attacker';
  if (a === undefined) return 'defender';
  if (Math.abs(a - c) <= DRAW_TOLERANCE * Math.max(a, c)) return 'draw';
  return a < c ? 'attacker' : 'defender';
}

/**
 * Simultaneous one-on-one duel: the side that needs less time to defeat the other wins.
 * A side that cannot damage the other, or whose target has no hp, can never win.
 */
export function duel(
  attacker: Entity,
  defender: Entity,
  channels: readonly Channel[],
  matrix?: InteractionMatrix,
): Duel {
  const attack = timeToDefeat(attacker, defender, channels, matrix);
  const counter = timeToDefeat(defender, attacker, channels, matrix);
  return {
    attackerId: attacker.id,
    defenderId: defender.id,
    attack,
    counter,
    winner: winnerOf(attack, counter),
  };
}

/** Every entity against every other one: rows are attackers, columns are defenders, in input order. */
export function duelMatrix(
  entities: readonly Entity[],
  channels: readonly Channel[],
  matrix?: InteractionMatrix,
): Duel[][] {
  return entities.map((attacker) =>
    entities.map((defender) => duel(attacker, defender, channels, matrix)),
  );
}

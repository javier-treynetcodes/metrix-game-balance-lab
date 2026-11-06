/**
 * @file Movement: who can catch up with or escape from whom. Informative only: movement never
 * changes a duel result, because Métrix does not simulate positions or distances.
 */

import { winnerBy, type Matchup, type Metric } from './matchup';

/** Below this difference in move points, the faster side is only "slightly" faster. */
export const SLIGHT_MOVE_DIFFERENCE = 10;

/** How the two sides of a duel compare in movement. */
export interface MoveEdge {
  /** Side with more move, or `none` when both move at the same speed. */
  faster: 'attacker' | 'defender' | 'none';
  /** Absolute difference in move points. */
  difference: number;
  /** True when the difference is above 0 but below `SLIGHT_MOVE_DIFFERENCE`. */
  slight: boolean;
}

/** Movement comparison of a duel, or undefined when the catalog has no move. */
export function moveEdge(result: Matchup): MoveEdge | undefined {
  const { attacker, defender } = result.move;
  if (attacker === undefined || defender === undefined) return undefined;
  const difference = Math.abs(attacker - defender);
  return {
    faster: attacker === defender ? 'none' : attacker > defender ? 'attacker' : 'defender',
    difference,
    slight: difference > 0 && difference < SLIGHT_MOVE_DIFFERENCE,
  };
}

/**
 * What movement means for this duel, crossed with its winner by `metric`:
 * - `winner-faster`: the winner can chase the loser down; the loser cannot escape.
 * - `loser-faster`: the loser can escape the fight or avoid it.
 * - `same`: neither can outrun the other, so the duel decides.
 * - `faster-no-winner`: there is no winner (draw or nobody can win), but one side is faster.
 */
export type MovementNote = 'winner-faster' | 'loser-faster' | 'same' | 'faster-no-winner';

/** The movement note of a duel, or undefined when the catalog has no move. */
export function movementNote(result: Matchup, metric: Metric): MovementNote | undefined {
  const edge = moveEdge(result);
  if (!edge) return undefined;
  if (edge.faster === 'none') return 'same';
  const winner = winnerBy(result, metric);
  if (winner !== 'attacker' && winner !== 'defender') return 'faster-no-winner';
  return winner === edge.faster ? 'winner-faster' : 'loser-faster';
}

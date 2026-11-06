/**
 * @file Guards the teaching value of the official template: the example must stay balanced,
 * so a designer opening it sees varied results instead of one character that wins everything,
 * and the complements must visibly change some duels.
 */
import { describe, expect, it } from 'vitest';
import {
  CSV_TEMPLATE,
  equipAll,
  hitsMargin,
  importEntities,
  matchupMatrix,
  movementNote,
  winnerBy,
  type Entity,
  type Matchup,
  type Metric,
} from '../src';

const { ok, issues, entities, complements, channels, coverage } = importEntities(CSV_TEMPLATE);

/** Win-loss record of each character by `metric`, ignoring its duel against itself. */
function records(grid: Matchup[][], list: readonly Entity[], metric: Metric) {
  return grid.map((row, index) => {
    const duels = row.filter((_result, column) => column !== index);
    return {
      id: list[index]?.id,
      wins: duels.filter((result) => winnerBy(result, metric) === 'attacker').length,
      draws: duels.filter((result) => winnerBy(result, metric) === 'draw').length,
    };
  });
}

/** Pairs (each once) whose winner by `metric` changes between two grids. */
function flippedPairs(before: Matchup[][], after: Matchup[][], metric: Metric): string[] {
  return before.flatMap((row, i) =>
    row.flatMap((result, j) =>
      i < j && winnerBy(result, metric) !== winnerBy(after[i]?.[j] as Matchup, metric)
        ? [`${result.attackerId}-${result.defenderId}`]
        : [],
    ),
  );
}

describe('CSV template example', () => {
  const base = matchupMatrix(entities, channels, coverage);
  const equipped = matchupMatrix(equipAll(entities, complements), channels, coverage);

  it('imports without issues, with one complement per class', () => {
    expect(ok).toBe(true);
    expect(issues).toEqual([]);
    expect(entities).toHaveLength(8);
    expect(new Set(entities.map((entity) => entity.class))).toEqual(
      new Set(['tank', 'fighter', 'marksman', 'assassin', 'mage', 'support']),
    );
    expect(complements.map((complement) => complement.class)).toEqual([
      'tank',
      'fighter',
      'marksman',
      'assassin',
      'mage',
      'support',
    ]);
  });

  it('gives every character between 2 and 5 wins, with no draws, by hits and by time, at base and with complements', () => {
    for (const metric of ['hits', 'time'] as const) {
      for (const grid of [base, equipped]) {
        for (const record of records(grid, entities, metric)) {
          expect(record.wins, `${record.id} wins by ${metric}`).toBeGreaterThanOrEqual(2);
          expect(record.wins, `${record.id} wins by ${metric}`).toBeLessThanOrEqual(5);
          expect(record.draws, `${record.id} draws by ${metric}`).toBe(0);
        }
      }
    }
  });

  it('lets every character damage every other one', () => {
    for (const grid of [base, equipped]) {
      for (const result of grid.flat()) {
        if (result.attackerId !== result.defenderId) expect(result.forward.damage).toBeGreaterThan(0);
      }
    }
  });

  it('has a mixed attacker and complements that change the winner of several duels', () => {
    expect(entities.filter((entity) => Object.values(entity.atk).filter((value) => value > 0).length === 2)).toHaveLength(1);
    expect(flippedPairs(base, equipped, 'hits')).toEqual(['vanguard-duelist', 'vanguard-sorcerer', 'duelist-sorcerer']);
    expect(flippedPairs(base, equipped, 'time')).toEqual([
      'vanguard-duelist',
      'vanguard-shadow',
      'vanguard-sorcerer',
      'duelist-sorcerer',
      'archer-warden',
    ]);
  });

  it('uses speed and move on every character, with complements that add them', () => {
    expect(entities.every((entity) => entity.speed !== undefined && entity.move !== undefined)).toBe(true);
    expect(complements.filter((complement) => complement.speed !== undefined).map((complement) => complement.name)).toEqual([
      'Hunter Bow',
      'Venom Dagger',
    ]);
    expect(complements.filter((complement) => complement.move !== undefined).map((complement) => complement.name)).toEqual(['Twin Blade']);
  });

  it('has losers fast enough to escape, so the Escapes list shows something', () => {
    const escapes = base.flatMap((row, i) => row.filter((result, j) => i !== j && movementNote(result, 'time') === 'loser-faster'));
    expect(escapes.length).toBeGreaterThan(0);
  });

  it('includes at least one close fight to show what it looks like', () => {
    expect(base.flat().some((result) => Math.abs(hitsMargin(result) ?? 0) === 1)).toBe(true);
  });
});

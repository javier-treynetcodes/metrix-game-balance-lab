/**
 * @file Guards the teaching value of the official template: the example must stay balanced,
 * so a designer opening it sees varied results instead of one character that wins everything,
 * and the complements must visibly change some duels.
 */
import { describe, expect, it } from 'vitest';
import { CSV_TEMPLATE, equipAll, hitsMargin, importEntities, matchupMatrix, winnerBy, type Entity, type Matchup } from '../src';

const { ok, issues, entities, complements, channels, coverage } = importEntities(CSV_TEMPLATE);

/** Win-loss record of each character by hits to defeat, ignoring its duel against itself. */
function records(grid: Matchup[][], list: readonly Entity[]) {
  return grid.map((row, index) => {
    const duels = row.filter((_result, column) => column !== index);
    return {
      id: list[index]?.id,
      wins: duels.filter((result) => winnerBy(result, 'hits') === 'attacker').length,
      draws: duels.filter((result) => winnerBy(result, 'hits') === 'draw').length,
    };
  });
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

  it('gives every character between 2 and 5 wins, with no draws, at base and with complements', () => {
    for (const grid of [base, equipped]) {
      for (const record of records(grid, entities)) {
        expect(record.wins, `${record.id} wins`).toBeGreaterThanOrEqual(2);
        expect(record.wins, `${record.id} wins`).toBeLessThanOrEqual(5);
        expect(record.draws, `${record.id} draws`).toBe(0);
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

  it('has a mixed attacker and complements that change the winner of three duels', () => {
    expect(entities.filter((entity) => Object.values(entity.atk).filter((value) => value > 0).length === 2)).toHaveLength(1);
    const flipped = base.flatMap((row, i) =>
      row.flatMap((result, j) => (i < j && winnerBy(result, 'hits') !== winnerBy(equipped[i]?.[j] as Matchup, 'hits') ? [`${result.attackerId}-${result.defenderId}`] : [])),
    );
    expect(flipped).toEqual(['vanguard-duelist', 'vanguard-sorcerer', 'duelist-sorcerer']);
  });

  it('includes at least one close fight to show what it looks like', () => {
    expect(base.flat().some((result) => Math.abs(hitsMargin(result) ?? 0) === 1)).toBe(true);
  });
});

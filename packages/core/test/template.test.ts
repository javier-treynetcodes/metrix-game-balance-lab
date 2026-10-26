/**
 * @file Guards the teaching value of the official template: the example must stay balanced,
 * so a designer opening it sees varied results instead of one unit that wins everything.
 */
import { describe, expect, it } from 'vitest';
import { CSV_TEMPLATE, hitsMargin, importEntities, matchupMatrix, winnerBy } from '../src';

describe('CSV template example', () => {
  const { entities, channels } = importEntities(CSV_TEMPLATE);
  const grid = matchupMatrix(entities, channels);
  // Win-loss record of each unit by hits to defeat, ignoring its duel against itself.
  const records = grid.map((row, index) => {
    const duels = row.filter((_result, column) => column !== index);
    return {
      id: entities[index]?.id,
      wins: duels.filter((result) => winnerBy(result, 'hits') === 'attacker').length,
      losses: duels.filter((result) => winnerBy(result, 'hits') === 'defender').length,
    };
  });

  it('has no unit that wins or loses every duel', () => {
    for (const record of records) {
      expect(record.wins, `${record.id} wins`).toBeGreaterThan(0);
      expect(record.wins, `${record.id} wins`).toBeLessThan(entities.length - 1);
      expect(record.losses, `${record.id} losses`).toBeLessThan(entities.length - 1);
    }
  });

  it('lets every unit damage every other one', () => {
    for (const row of grid) {
      for (const result of row) {
        if (result.attackerId !== result.defenderId) expect(result.forward.damage).toBeGreaterThan(0);
      }
    }
  });

  it('includes at least one close fight to show what it looks like', () => {
    const close = grid.flat().filter((result) => Math.abs(hitsMargin(result) ?? 0) === 1);
    expect(close.length).toBeGreaterThan(0);
  });
});

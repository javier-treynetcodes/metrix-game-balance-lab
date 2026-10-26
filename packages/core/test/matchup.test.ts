import { describe, expect, it } from 'vitest';
import { hitsMargin, matchup, matchupMatrix, metricValue, METRICS, winnerBy } from '../src';
import { channels, entity } from './helpers';

const strong = entity('strong', { hp: 100, atk: { '1': 50 } });
const weak = entity('weak', { hp: 100, atk: { '1': 10 } });

describe('matchup', () => {
  it('computes both directions and the trade', () => {
    const result = matchup(strong, weak, channels);
    expect(result.attackerId).toBe('strong');
    expect(result.defenderId).toBe('weak');
    expect(result.forward.damage).toBe(50);
    expect(result.backward.damage).toBe(10);
    expect(result.forwardHits).toEqual({ kind: 'defeats', hits: 2 });
    expect(result.backwardHits).toEqual({ kind: 'defeats', hits: 10 });
    expect(result.trade).toBe(40);
  });
});

describe('winnerBy', () => {
  it('ranks by hits: fewer wins, equal is a draw', () => {
    expect(winnerBy(matchup(strong, weak, channels), 'hits')).toBe('attacker');
    expect(winnerBy(matchup(weak, strong, channels), 'hits')).toBe('defender');
    expect(winnerBy(matchup(strong, strong, channels), 'hits')).toBe('draw');
  });

  it('gives the hits win to the only side that can defeat the other', () => {
    const wall = entity('wall', { hp: 100 });
    expect(winnerBy(matchup(strong, wall, channels), 'hits')).toBe('attacker');
    expect(winnerBy(matchup(wall, strong, channels), 'hits')).toBe('defender');
    expect(winnerBy(matchup(wall, entity('wall2', { hp: 5 }), channels), 'hits')).toBe('none');
  });

  it('ranks damage and trade by damage per hit', () => {
    for (const metric of ['damage', 'trade'] as const) {
      expect(winnerBy(matchup(strong, weak, channels), metric)).toBe('attacker');
      expect(winnerBy(matchup(weak, strong, channels), metric)).toBe('defender');
      expect(winnerBy(matchup(weak, weak, channels), metric)).toBe('draw');
      expect(winnerBy(matchup(entity('a'), entity('b'), channels), metric)).toBe('none');
    }
  });

  it('never names a winner for blocked damage', () => {
    expect(winnerBy(matchup(strong, weak, channels), 'blocked')).toBe('none');
  });
});

describe('hitsMargin', () => {
  it('counts how many hits separate both sides', () => {
    expect(hitsMargin(matchup(strong, weak, channels))).toBe(8);
    expect(hitsMargin(matchup(weak, strong, channels))).toBe(-8);
    expect(hitsMargin(matchup(strong, entity('ghost', { atk: { '1': 5 } }), channels))).toBeUndefined();
    expect(hitsMargin(matchup(entity('ghost'), strong, channels))).toBeUndefined();
  });
});

describe('metricValue', () => {
  it('reads each metric from the attacker side', () => {
    const armored = entity('armored', { hp: 100, atk: { '1': 10 }, def: { '1': 20 } });
    const result = matchup(strong, armored, channels);
    // Expected values, worked out by hand:
    // - hits: 100 hp / 30 damage per hit, rounded up -> 4 hits
    // - damage: 50 attack - 20 defense = 30
    // - trade: 30 dealt - 10 received = 20
    // - blocked: 20 of the 50 attack
    expect(METRICS.map((metric) => metricValue(result, metric))).toEqual([4, 30, 20, 20]);
    expect(metricValue(matchup(entity('w'), armored, channels), 'hits')).toBeUndefined();
  });
});

describe('matchupMatrix', () => {
  it('pairs every attacker (rows) with every defender (columns) in input order', () => {
    const grid = matchupMatrix([strong, weak], channels);
    expect(grid.map((row) => row.map((cell) => `${cell.attackerId}>${cell.defenderId}`))).toEqual([
      ['strong>strong', 'strong>weak'],
      ['weak>strong', 'weak>weak'],
    ]);
  });
});

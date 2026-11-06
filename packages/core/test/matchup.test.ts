import { describe, expect, it } from 'vitest';
import { attackSpeed, hitsMargin, matchup, matchupMatrix, METRICS, metricValue, NORMAL_SPEED, timeToDefeat, winnerBy } from '../src';
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
    // - time: 4 hits at normal speed (no speed in the catalog) -> 4
    // - damage: 50 attack - 20 defense = 30
    // - trade: 30 dealt - 10 received = 20
    // - blocked: 20 of the 50 attack
    expect(METRICS.map((metric) => metricValue(result, metric))).toEqual([4, 4, 30, 20, 20]);
    expect(metricValue(matchup(entity('w'), armored, channels), 'hits')).toBeUndefined();
  });
});

describe('armor coverage in matchups', () => {
  it('changes both directions of a duel', () => {
    const mage = entity('mage', { hp: 100, atk: { '2': 40 } });
    const knight = entity('knight', { hp: 100, atk: { '1': 20 }, def: { '1': 50 } });
    expect(matchup(mage, knight, channels).forward.damage).toBe(40);
    expect(matchup(mage, knight, channels, { '1': { '2': 50 } }).forward.damage).toBe(15);
    expect(matchupMatrix([mage, knight], channels, { '1': { '2': 50 } })[0]?.[1]?.forward.damage).toBe(15);
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

describe('time to defeat', () => {
  // 100 hp each, 25 damage per hit both ways: 4 hits each.
  const make = (id: string, speed?: number) =>
    entity(id, { hp: 100, atk: { '1': 25 }, ...(speed === undefined ? {} : { speed }) });

  it('divides the hits by the attack speed', () => {
    const result = matchup(make('fast', 125), make('slow', 80), channels);
    expect(result.speed).toEqual({ attacker: 125, defender: 80 });
    expect(timeToDefeat(result)).toBe(3.2);
    expect(timeToDefeat(result, 'backward')).toBe(5);
    expect(metricValue(result, 'time')).toBe(3.2);
  });

  it('lets the faster side win a duel that is a draw in hits', () => {
    const result = matchup(make('fast', 125), make('slow', 80), channels);
    expect(winnerBy(result, 'hits')).toBe('draw');
    expect(winnerBy(result, 'time')).toBe('attacker');
    expect(winnerBy(matchup(make('slow', 80), make('fast', 125), channels), 'time')).toBe('defender');
  });

  it('compares exactly with whole numbers, so equal times are a draw', () => {
    // 3 hits at 150% and 2 hits at 100% both take 2 hits at normal speed.
    const quick = entity('quick', { hp: 90, speed: 150, atk: { '1': 30 } });
    const heavy = entity('heavy', { hp: 90, speed: 100, atk: { '1': 45 } });
    const result = matchup(heavy, quick, channels);
    expect([timeToDefeat(result), timeToDefeat(result, 'backward')]).toEqual([2, 2]);
    expect(winnerBy(result, 'time')).toBe('draw');
  });

  it('uses normal speed when the catalog has none, and handles sides that cannot win', () => {
    const result = matchup(make('a'), make('b'), channels);
    expect(attackSpeed(make('a'))).toBe(NORMAL_SPEED);
    expect(winnerBy(result, 'time')).toBe('draw');
    const wall = entity('wall', { hp: 100 });
    expect(winnerBy(matchup(make('a', 50), wall, channels), 'time')).toBe('attacker');
    expect(winnerBy(matchup(wall, make('a', 50), channels), 'time')).toBe('defender');
    expect(winnerBy(matchup(wall, wall, channels), 'time')).toBe('none');
    expect(timeToDefeat(matchup(wall, make('a'), channels))).toBeUndefined();
  });
});

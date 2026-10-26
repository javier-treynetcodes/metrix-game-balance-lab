import { describe, expect, it } from 'vitest';
import { duel, duelMatrix } from '../src';
import type { Channel, Entity } from '../src';

const channels: Channel[] = [{ key: 'physical', label: 'Physical', mitigation: 'none' }];

const entity = (id: string, overrides: Partial<Entity>): Entity => ({
  id,
  name: id,
  rate: 1,
  atk: {},
  def: {},
  tags: {},
  stats: {},
  ...overrides,
});

describe('duel', () => {
  it('lets the faster side win', () => {
    const strong = entity('strong', { hp: 100, atk: { physical: 50 } });
    const weak = entity('weak', { hp: 100, atk: { physical: 10 } });
    expect(duel(strong, weak, channels)).toEqual({
      attackerId: 'strong',
      defenderId: 'weak',
      attack: { kind: 'defeats', time: 2 },
      counter: { kind: 'defeats', time: 10 },
      winner: 'attacker',
    });
    expect(duel(weak, strong, channels).winner).toBe('defender');
  });

  it('calls equal times a draw, ignoring floating-point noise', () => {
    const a = entity('a', { hp: 0.3, atk: { physical: 1 } });
    const b = entity('b', { hp: 0.1 + 0.2, atk: { physical: 1 } });
    expect(duel(a, b, channels).winner).toBe('draw');
  });

  it('gives the win to the only side that can deal damage', () => {
    const wall = entity('wall', { hp: 100 });
    const hitter = entity('hitter', { hp: 100, atk: { physical: 10 } });
    expect(duel(hitter, wall, channels).winner).toBe('attacker');
    expect(duel(wall, hitter, channels).winner).toBe('defender');
  });

  it('is a stalemate when nobody can defeat the other', () => {
    const wallA = entity('a', { hp: 100 });
    const wallB = entity('b', { hp: 100 });
    expect(duel(wallA, wallB, channels).winner).toBe('stalemate');
  });

  it('never lets anyone defeat an entity without hp', () => {
    const ghost = entity('ghost', { atk: { physical: 10 } });
    const hitter = entity('hitter', { hp: 100, atk: { physical: 10 } });
    const result = duel(hitter, ghost, channels);
    expect(result.attack).toEqual({ kind: 'not-applicable', reason: 'missing-hp' });
    expect(result.winner).toBe('defender');
  });
});

describe('duelMatrix', () => {
  it('pairs every attacker (rows) with every defender (columns) in input order', () => {
    const a = entity('a', { hp: 10, atk: { physical: 5 } });
    const b = entity('b', { hp: 10, atk: { physical: 1 } });
    const grid = duelMatrix([a, b], channels);
    expect(grid.map((row) => row.map((cell) => `${cell.attackerId}>${cell.defenderId}`))).toEqual([
      ['a>a', 'a>b'],
      ['b>a', 'b>b'],
    ]);
    expect(grid[0]?.[1]?.winner).toBe('attacker');
    expect(grid[0]?.[0]?.winner).toBe('draw');
  });

  it('applies the interaction matrix', () => {
    const fire = entity('fire', { hp: 100, atk: { physical: 10 }, tags: { element: 'fire' } });
    const earth = entity('earth', { hp: 100, atk: { physical: 10 }, tags: { element: 'earth' } });
    const grid = duelMatrix([fire, earth], channels, {
      tagKey: 'element',
      multipliers: { fire: { earth: 2 } },
    });
    expect(grid[0]?.[1]?.attack).toEqual({ kind: 'defeats', time: 5 });
    expect(grid[0]?.[1]?.winner).toBe('attacker');
  });
});

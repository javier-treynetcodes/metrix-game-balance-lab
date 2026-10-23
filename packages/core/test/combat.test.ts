import { describe, expect, it } from 'vitest';
import { damagePerHit, interactionMultiplier, timeToDefeat } from '../src';
import type { Channel, Entity, InteractionMatrix } from '../src';

const channels: Channel[] = [
  { key: 'physical', label: 'Physical', mitigation: 'percent' },
  { key: 'magic', label: 'Magic', mitigation: 'percent' },
];

const entity = (overrides: Partial<Entity>): Entity => ({
  id: 'e',
  name: 'Entity',
  rate: 1,
  atk: {},
  def: {},
  tags: {},
  stats: {},
  ...overrides,
});

const matrix: InteractionMatrix = { tagKey: 'element', multipliers: { fire: { earth: 2 } } };

describe('interactionMultiplier', () => {
  const fire = entity({ tags: { element: 'fire' } });
  const earth = entity({ tags: { element: 'earth' } });
  const water = entity({ tags: { element: 'water' } });
  const untagged = entity({});

  it('is 1 without a matrix', () => {
    expect(interactionMultiplier(fire, earth)).toBe(1);
  });

  it('reads the attacker → defender multiplier', () => {
    expect(interactionMultiplier(fire, earth, matrix)).toBe(2);
  });

  it('is 1 for missing pairs, rows or tags', () => {
    expect(interactionMultiplier(fire, water, matrix)).toBe(1);
    expect(interactionMultiplier(water, fire, matrix)).toBe(1);
    expect(interactionMultiplier(untagged, earth, matrix)).toBe(1);
    expect(interactionMultiplier(fire, untagged, matrix)).toBe(1);
  });
});

describe('damagePerHit', () => {
  it('sums mixed attacks across channels', () => {
    const attacker = entity({ atk: { physical: 100, magic: 100 } });
    const defender = entity({ def: { physical: 100 } });
    expect(damagePerHit(attacker, defender, channels)).toBe(150);
  });

  it('applies the interaction multiplier', () => {
    const attacker = entity({ atk: { physical: 50 }, tags: { element: 'fire' } });
    const defender = entity({ tags: { element: 'earth' } });
    expect(damagePerHit(attacker, defender, channels, matrix)).toBe(100);
  });
});

describe('timeToDefeat', () => {
  const attacker = entity({ atk: { physical: 50 }, rate: 2 });

  it('divides hp by damage per second', () => {
    const defender = entity({ hp: 500 });
    expect(timeToDefeat(attacker, defender, channels)).toEqual({ kind: 'defeats', time: 5 });
  });

  it('reports cannot-damage instead of infinity', () => {
    const defender = entity({ hp: 500 });
    expect(timeToDefeat(entity({}), defender, channels)).toEqual({ kind: 'cannot-damage' });
    expect(timeToDefeat(entity({ atk: { physical: 50 }, rate: 0 }), defender, channels)).toEqual({
      kind: 'cannot-damage',
    });
  });

  it('is not applicable when the defender has no hp', () => {
    expect(timeToDefeat(attacker, entity({}), channels)).toEqual({
      kind: 'not-applicable',
      reason: 'missing-hp',
    });
  });
});

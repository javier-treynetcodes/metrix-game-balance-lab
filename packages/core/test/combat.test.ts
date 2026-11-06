import { describe, expect, it } from 'vitest';
import { attackType, damageBreakdown, hitsToDefeat } from '../src';
import { channels, entity } from './helpers';

describe('attackType', () => {
  it('tells single-channel, mixed and harmless entities apart', () => {
    expect(attackType(entity('a', { atk: { '1': 10, '2': 0 } }))).toBe('channel');
    expect(attackType(entity('m', { atk: { '1': 5, '2': 5 } }))).toBe('mixed');
    expect(attackType(entity('w', { atk: { '1': 0 } }))).toBe('none');
  });
});

describe('damageBreakdown', () => {
  it('subtracts the armor of the same channel only by default', () => {
    const attacker = entity('a', { atk: { '1': 55, '2': 0 } });
    const defender = entity('d', { def: { '1': 48, '2': 200 } });
    expect(damageBreakdown(attacker, defender, channels)).toEqual({
      rows: [
        { channel: '1', attack: 55, defense: 48, armor: [{ armor: '1', value: 48, percent: 100 }], damage: 7, fullDamage: false },
      ],
      attack: 55,
      blocked: 48,
      damage: 7,
    });
  });

  it('never goes below 0 and marks uncovered attacks as full damage', () => {
    const attacker = entity('a', { atk: { '2': 20 } });
    expect(damageBreakdown(attacker, entity('wall', { def: { '2': 50 } }), channels).damage).toBe(0);
    const open = damageBreakdown(attacker, entity('open', { def: { '1': 40 } }), channels);
    expect(open.rows[0]).toMatchObject({ damage: 20, fullDamage: true, armor: [] });
    expect(open.blocked).toBe(0);
  });

  it('adds both channels of a mixed attack, each against its own armor', () => {
    const attacker = entity('m', { atk: { '1': 30, '2': 25 } });
    const defender = entity('d', { def: { '1': 20, '2': 5 } });
    const result = damageBreakdown(attacker, defender, channels);
    expect(result.rows.map((row) => row.damage)).toEqual([10, 20]);
    expect(result).toMatchObject({ attack: 55, blocked: 25, damage: 30 });
  });

  it('applies the armor coverage, rounding the defense down', () => {
    // The armor of channel 1 also stops 30% of channel 2: 25 * 30% = 7.5 -> 7.
    const attacker = entity('a', { atk: { '2': 40 } });
    const defender = entity('d', { def: { '1': 25, '2': 0 } });
    const row = damageBreakdown(attacker, defender, channels, { '1': { '2': 30 } }).rows[0];
    expect(row).toMatchObject({ defense: 7, damage: 33, fullDamage: false });
    expect(row?.armor).toEqual([{ armor: '1', value: 25, percent: 30 }]);
  });

  it('deals nothing when the attacker has no attack', () => {
    expect(damageBreakdown(entity('w'), entity('d'), channels)).toEqual({ rows: [], attack: 0, blocked: 0, damage: 0 });
  });
});

describe('hitsToDefeat', () => {
  it('counts the hits needed to reach the hp', () => {
    expect(hitsToDefeat(27, entity('d', { hp: 600 }))).toEqual({ kind: 'defeats', hits: 23 });
    expect(hitsToDefeat(50, entity('d', { hp: 100 }))).toEqual({ kind: 'defeats', hits: 2 });
  });

  it('reports entities that cannot be damaged or have no hp', () => {
    expect(hitsToDefeat(0, entity('d', { hp: 100 }))).toEqual({ kind: 'cannot-damage' });
    expect(hitsToDefeat(10, entity('d'))).toEqual({ kind: 'no-hp' });
  });
});

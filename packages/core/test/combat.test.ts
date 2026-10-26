import { describe, expect, it } from 'vitest';
import { attackType, damageBreakdown, hitsToDefeat } from '../src';
import { channels, entity } from './helpers';

describe('attackType', () => {
  it('tells single-channel, hybrid and harmless entities apart', () => {
    expect(attackType(entity('a', { atk: { '1': 10, '2': 0 } }))).toBe('channel');
    expect(attackType(entity('h', { hybridAtk: { '1': 5, '2': 5 } }))).toBe('hybrid');
    expect(attackType(entity('w', { atk: { '1': 0 } }))).toBe('none');
  });
});

describe('damageBreakdown', () => {
  it('subtracts the defense of the same channel only', () => {
    const attacker = entity('a', { atk: { '1': 55, '2': 0 } });
    const defender = entity('d', { def: { '1': 48, '2': 200 } });
    expect(damageBreakdown(attacker, defender, channels)).toEqual({
      rows: [
        { channel: '1', source: 'channel', attack: 55, defense: 48, hybridDefense: 0, damage: 7, fullDamage: false },
      ],
      attack: 55,
      blocked: 48,
      damage: 7,
    });
  });

  it('never goes below 0 and marks undefended attacks as full damage', () => {
    const attacker = entity('a', { atk: { '2': 20 } });
    expect(damageBreakdown(attacker, entity('wall', { def: { '2': 50 } }), channels).damage).toBe(0);
    const open = damageBreakdown(attacker, entity('open'), channels);
    expect(open.rows[0]).toMatchObject({ damage: 20, fullDamage: true });
    expect(open.blocked).toBe(0);
  });

  it('ignores hybrid armor against single-channel attacks', () => {
    const attacker = entity('a', { atk: { '1': 30 } });
    const defender = entity('d', { def: { '1': 10 }, hybridDef: { '1': 15 } });
    expect(damageBreakdown(attacker, defender, channels).rows[0]).toMatchObject({ hybridDefense: 0, damage: 20 });
  });

  it('hits both channels with a hybrid attack, against base defense plus hybrid armor', () => {
    const attacker = entity('h', { hybridAtk: { '1': 30, '2': 25 } });
    const defender = entity('d', { def: { '1': 20, '2': 0 }, hybridDef: { '1': 10, '2': 5 } });
    const result = damageBreakdown(attacker, defender, channels);
    expect(result.rows).toEqual([
      { channel: '1', source: 'hybrid', attack: 30, defense: 20, hybridDefense: 10, damage: 0, fullDamage: false },
      { channel: '2', source: 'hybrid', attack: 25, defense: 0, hybridDefense: 5, damage: 20, fullDamage: false },
    ]);
    expect(result).toMatchObject({ attack: 55, blocked: 35, damage: 20 });
  });

  it('treats a missing hybrid value as 0 and reports no full damage for a 0 attack', () => {
    const attacker = entity('h', { hybridAtk: { '1': 12 } });
    const result = damageBreakdown(attacker, entity('d'), channels);
    expect(result.rows[1]).toMatchObject({ attack: 0, damage: 0, fullDamage: false });
    expect(result.rows[0]).toMatchObject({ damage: 12, fullDamage: true });
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

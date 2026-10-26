import { describe, expect, it } from 'vitest';
import { isWholeNumber, validateEntity } from '../src';
import { channels, entity } from './helpers';

const codes = (...args: Parameters<typeof validateEntity>) => validateEntity(...args).map((problem) => problem.code);

describe('isWholeNumber', () => {
  it('accepts whole numbers of 0 or more only', () => {
    expect(isWholeNumber(0)).toBe(true);
    expect(isWholeNumber(48)).toBe(true);
    expect(isWholeNumber(-1)).toBe(false);
    expect(isWholeNumber(1.5)).toBe(false);
    expect(isWholeNumber(Number.NaN)).toBe(false);
  });
});

describe('validateEntity', () => {
  it('accepts valid single-channel, hybrid and harmless entities', () => {
    expect(validateEntity(entity('a', { hp: 10, cost: 3, atk: { '1': 5, '2': 0 } }), channels)).toEqual([]);
    expect(validateEntity(entity('h', { hp: 10, hybridAtk: { '1': 5, '2': 0 } }), channels)).toEqual([]);
    expect(validateEntity(entity('w'), channels)).toEqual([]);
  });

  it('checks id and name', () => {
    expect(codes(entity('', { name: 'x' }), channels)).toEqual(['missing-id']);
    expect(codes(entity('two words'), channels)).toEqual(['invalid-id']);
    expect(codes(entity('a', { name: '  ' }), channels)).toEqual(['missing-name']);
  });

  it('accepts whole numbers of 0 or more only, once per field', () => {
    const problems = validateEntity(
      entity('a', {
        cost: 1.5,
        hp: -1,
        atk: { '1': -2, '2': -3 },
        def: { '1': 0.5 },
        hybridDef: { '2': -1 },
      }),
      channels,
    );
    expect(problems.map((problem) => problem.field)).toEqual(['cost', 'hp', 'atk', 'def', 'hybridDef']);
    expect(problems.every((problem) => problem.code === 'not-a-whole-number')).toBe(true);
    expect(codes(entity('h', { hybridAtk: { '1': 1.5, '2': 1 } }), channels)).toEqual(['not-a-whole-number']);
  });

  it('requires at least 1 hp when hp is given', () => {
    expect(codes(entity('a', { hp: 0 }), channels)).toEqual(['zero-hp']);
  });

  it('allows one kind of damage only', () => {
    expect(codes(entity('a', { atk: { '1': 5, '2': 5 } }), channels)).toEqual(['mixed-attack']);
    expect(codes(entity('a', { atk: { '1': 5 }, hybridAtk: { '1': 1, '2': 1 } }), channels)).toEqual(['mixed-attack']);
  });

  it('needs both values of a hybrid attack', () => {
    expect(codes(entity('h', { hybridAtk: { '1': 5 } }), channels)).toEqual(['incomplete-hybrid']);
  });
});

import { describe, expect, it } from 'vitest';
import { isWholeNumber, validateComplement, validateEntity } from '../src';
import { complement, entity } from './helpers';

const codes = (problems: { code: string }[]) => problems.map((problem) => problem.code);

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
  it('accepts single-channel, mixed and harmless entities', () => {
    expect(validateEntity(entity('a', { hp: 10, cost: 3, atk: { '1': 5, '2': 0 } }))).toEqual([]);
    expect(validateEntity(entity('m', { hp: 10, atk: { '1': 5, '2': 5 }, class: 'fighter', character: 'Kael' }))).toEqual([]);
    expect(validateEntity(entity('w'))).toEqual([]);
  });

  it('checks id and name', () => {
    expect(codes(validateEntity(entity('', { name: 'x' })))).toEqual(['missing-id']);
    expect(codes(validateEntity(entity('two words')))).toEqual(['invalid-id']);
    expect(codes(validateEntity(entity('a', { name: '  ' })))).toEqual(['missing-name']);
  });

  it('accepts whole numbers of 0 or more only, once per field', () => {
    const problems = validateEntity(entity('a', { cost: 1.5, hp: -1, atk: { '1': -2, '2': -3 }, def: { '1': 0.5 } }));
    expect(problems.map((problem) => problem.field)).toEqual(['cost', 'hp', 'atk', 'def']);
    expect(problems.every((problem) => problem.code === 'not-a-whole-number')).toBe(true);
  });

  it('requires at least 1 hp when hp is given', () => {
    expect(codes(validateEntity(entity('a', { hp: 0 })))).toEqual(['zero-hp']);
  });
});

describe('validateComplement', () => {
  it('accepts a named complement with bonuses for a class', () => {
    expect(validateComplement(complement('shield', { name: 'Tower Shield', def: { '1': 2, '2': 10 } }))).toEqual([]);
  });

  it('needs an id, a name and a class', () => {
    expect(codes(validateComplement(complement('', { name: '', class: ' ' })))).toEqual([
      'missing-id',
      'missing-name',
      'missing-class',
    ]);
  });

  it('only adds: bonuses are whole numbers of 0 or more', () => {
    const problems = validateComplement(complement('c', { atk: { '1': -5 }, def: { '2': 1.5 } }));
    expect(problems.map((problem) => `${problem.code}:${problem.field}`)).toEqual([
      'not-a-whole-number:atk',
      'not-a-whole-number:def',
    ]);
  });
});

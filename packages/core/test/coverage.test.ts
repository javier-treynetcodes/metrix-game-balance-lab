import { describe, expect, it } from 'vitest';
import {
  armorAgainst,
  coverageValue,
  defaultCoverageValue,
  isCoveragePercent,
  isDefaultCoverage,
  resolveCoverage,
} from '../src';
import { channels, entity } from './helpers';

describe('default coverage', () => {
  it('lets each armor stop all of its own channel and nothing of the other', () => {
    expect(defaultCoverageValue('1', '1')).toBe(100);
    expect(defaultCoverageValue('1', '2')).toBe(0);
    expect(coverageValue({}, '2', '2')).toBe(100);
    expect(coverageValue({ '1': { '2': 30 } }, '1', '2')).toBe(30);
    expect(coverageValue({ '1': { '2': 30 } }, '1', '1')).toBe(100);
  });

  it('fills a complete table and tells when it is the default one', () => {
    expect(resolveCoverage(channels, { '1': { '2': 20 } })).toEqual({ '1': { '1': 100, '2': 20 }, '2': { '1': 0, '2': 100 } });
    expect(resolveCoverage(channels)).toEqual({ '1': { '1': 100, '2': 0 }, '2': { '1': 0, '2': 100 } });
    expect(isDefaultCoverage(channels, {})).toBe(true);
    expect(isDefaultCoverage(channels, { '1': { '1': 100, '2': 0 } })).toBe(true);
    expect(isDefaultCoverage(channels, { '2': { '2': 70 } })).toBe(false);
  });

  it('accepts whole percentages from 0 to 100 only', () => {
    expect([0, 55, 100].every(isCoveragePercent)).toBe(true);
    expect([-1, 101, 2.5, Number.NaN].some(isCoveragePercent)).toBe(false);
  });
});

describe('armorAgainst', () => {
  const defender = entity('d', { def: { '1': 30, '2': 10 } });

  it('uses only the armor of the attacked channel by default', () => {
    expect(armorAgainst(defender, '1', channels, {})).toEqual({ total: 30, parts: [{ armor: '1', value: 30, percent: 100 }] });
  });

  it('adds every armor that covers the channel and rounds down once', () => {
    // 30 * 20% + 10 * 100% = 6 + 10 = 16
    expect(armorAgainst(defender, '2', channels, { '1': { '2': 20 } }).total).toBe(16);
    // 25 * 30% = 7.5 -> 7
    expect(armorAgainst(entity('e', { def: { '1': 25 } }), '2', channels, { '1': { '2': 30 } })).toEqual({
      total: 7,
      parts: [{ armor: '1', value: 25, percent: 30 }],
    });
  });

  it('leaves out armors that stop nothing and treats negative armor as 0', () => {
    expect(armorAgainst(defender, '1', channels, { '1': { '1': 0 } })).toEqual({ total: 0, parts: [] });
    expect(armorAgainst(entity('n', { def: { '1': -5 } }), '1', channels, {})).toEqual({ total: 0, parts: [] });
  });
});

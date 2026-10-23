import { describe, expect, it } from 'vitest';
import { mitigate, type Channel } from '../src';

const channel = (mitigation: Channel['mitigation'], minDamage?: number): Channel => ({
  key: 'c',
  label: 'C',
  mitigation,
  ...(minDamage === undefined ? {} : { minDamage }),
});

describe('mitigate', () => {
  it('percent: atk * 100 / (100 + def)', () => {
    expect(mitigate(100, 100, channel('percent'))).toBe(50);
    expect(mitigate(100, 0, channel('percent'))).toBe(100);
  });

  it('subtractive: floors at 0 by default', () => {
    expect(mitigate(10, 4, channel('subtractive'))).toBe(6);
    expect(mitigate(3, 8, channel('subtractive'))).toBe(0);
  });

  it('subtractive: honours a channel minDamage', () => {
    expect(mitigate(3, 8, channel('subtractive', 1))).toBe(1);
  });

  it('ratio: uses a defense floor of 1', () => {
    expect(mitigate(50, 2, channel('ratio'))).toBe(1250);
    expect(mitigate(50, 0, channel('ratio'))).toBe(2500);
    expect(mitigate(50, 0.5, channel('ratio'))).toBe(2500);
  });

  it('none: ignores defense (true damage)', () => {
    expect(mitigate(42, 999, channel('none'))).toBe(42);
  });

  it('treats negative defense as 0', () => {
    expect(mitigate(100, -50, channel('percent'))).toBe(100);
    expect(mitigate(10, -5, channel('subtractive'))).toBe(10);
  });

  it('deals no damage without attack', () => {
    expect(mitigate(0, 0, channel('none'))).toBe(0);
    expect(mitigate(-5, 0, channel('subtractive', 1))).toBe(0);
  });
});

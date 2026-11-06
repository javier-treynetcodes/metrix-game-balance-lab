import { describe, expect, it } from 'vitest';
import { complementsFor, equipAll, withComplements } from '../src';
import { complement, entity } from './helpers';

const shield = complement('shield', { class: 'tank', def: { '1': 2, '2': 10 } });
const ring = complement('ring', { class: 'tank', atk: { '1': 4 }, def: { '1': 0 } });
const staff = complement('staff', { class: 'mage', atk: { '2': 8 } });

describe('complements', () => {
  const tank = entity('tank', { class: 'tank', atk: { '1': 30 }, def: { '1': 30 } });

  it('apply only to the class they belong to', () => {
    expect(complementsFor(tank, [shield, ring, staff])).toEqual([shield, ring]);
    expect(complementsFor(entity('free'), [shield])).toEqual([]);
  });

  it('add every bonus of the class to the base values', () => {
    expect(withComplements(tank, [shield, ring, staff])).toMatchObject({
      atk: { '1': 34 },
      def: { '1': 32, '2': 10 },
    });
    // The base entity is never changed.
    expect(tank.def).toEqual({ '1': 30 });
  });

  it('return the same entity when nothing applies', () => {
    const mage = entity('mage', { class: 'mage' });
    expect(withComplements(mage, [shield])).toBe(mage);
    expect(equipAll([tank, mage], [staff])).toEqual([tank, { ...mage, atk: { '2': 8 }, def: {} }]);
  });
});

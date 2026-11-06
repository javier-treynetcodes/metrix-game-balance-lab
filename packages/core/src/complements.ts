/**
 * @file Complements: bonuses obtained during a match, added to every character of a class.
 */

import type { Complement, Entity } from './types';

/** Complements that apply to an entity: those of its class. An entity without class receives none. */
export function complementsFor(entity: Entity, complements: readonly Complement[]): Complement[] {
  if (entity.class === undefined) return [];
  return complements.filter((complement) => complement.class === entity.class);
}

function addBonuses(base: Record<string, number>, bonuses: readonly Record<string, number>[]): Record<string, number> {
  const result = { ...base };
  for (const bonus of bonuses) {
    for (const [key, value] of Object.entries(bonus)) {
      if (value !== 0) result[key] = (result[key] ?? 0) + value;
    }
  }
  return result;
}

/**
 * A speed value plus the speed bonuses of the complements. A catalog without the stat keeps it
 * undefined: bonuses only add to a value that exists.
 */
function addSpeed(base: number | undefined, bonuses: readonly (number | undefined)[]): number | undefined {
  if (base === undefined) return undefined;
  return bonuses.reduce<number>((sum, bonus) => sum + (bonus ?? 0), base);
}

/**
 * The entity with every complement of its class added: base attack, armor, speed and move
 * plus each bonus. Pass only the complements that are active. Returns the same object when
 * nothing applies, so callers can cheaply tell equipped and base entities apart.
 */
export function withComplements(entity: Entity, complements: readonly Complement[]): Entity {
  const applied = complementsFor(entity, complements);
  if (applied.length === 0) return entity;
  const equipped: Entity = {
    ...entity,
    atk: addBonuses(entity.atk, applied.map((complement) => complement.atk)),
    def: addBonuses(entity.def, applied.map((complement) => complement.def)),
  };
  const speed = addSpeed(entity.speed, applied.map((complement) => complement.speed));
  const move = addSpeed(entity.move, applied.map((complement) => complement.move));
  if (speed !== undefined) equipped.speed = speed;
  if (move !== undefined) equipped.move = move;
  return equipped;
}

/** Every entity with its class's complements, in the same order. */
export function equipAll(entities: readonly Entity[], complements: readonly Complement[]): Entity[] {
  return entities.map((entity) => withComplements(entity, complements));
}

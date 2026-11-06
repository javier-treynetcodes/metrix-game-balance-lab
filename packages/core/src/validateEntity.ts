/**
 * @file Rules every entity and complement must follow, shared by the CSV import and the in-app editor.
 */

import type { Complement, Entity } from './types';

/** Rule an entity or complement can break. See `ENTITY_MESSAGES` for the text shown to the user. */
export type EntityProblemCode =
  | 'missing-id'
  | 'invalid-id'
  | 'missing-name'
  | 'not-a-whole-number'
  | 'zero-hp'
  | 'speed-below-one'
  | 'missing-class';

/** One broken rule, with the field it concerns so the editor can point at the right cell. */
export interface EntityProblem {
  code: EntityProblemCode;
  /** Field the problem is about: id, name, class, cost, hp, speed, move, atk or def. */
  field: string;
  message: string;
}

/**
 * User-facing message for each rule, written as an instruction: what to change and how.
 * Shared by the import report and the editor so the same mistake reads the same everywhere.
 */
export const ENTITY_MESSAGES: Record<EntityProblemCode, string> = {
  'missing-id': 'Every row needs a unique id.',
  'invalid-id': 'Ids cannot contain spaces. Use hyphens instead, e.g. "iron-vanguard".',
  'missing-name': 'Every row needs a name.',
  'not-a-whole-number': 'Use whole numbers of 0 or more: write 48, not 48.5, -48 or "48 hp".',
  'zero-hp': 'HP must be at least 1. Leave it empty if the entity cannot be defeated.',
  'speed-below-one': 'Speed and move are percentages where 100 is normal: write a whole number of 1 or more, e.g. 110.',
  'missing-class': 'A complement needs the class that receives it, e.g. "tank".',
};

/** Whole number of 0 or more. */
export function isWholeNumber(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

type Add = (code: EntityProblemCode, field: string) => void;

function checkIdentity(item: { id: string; name: string }, add: Add): void {
  if (item.id.trim() === '') add('missing-id', 'id');
  else if (/\s/.test(item.id)) add('invalid-id', 'id');
  if (item.name.trim() === '') add('missing-name', 'name');
}

/** Reports each field with a value that is not a whole number of 0 or more, once per field. */
function checkWholeNumbers(numbers: readonly [string, number | undefined][], add: Add): void {
  const invalid = new Set<string>();
  for (const [field, value] of numbers) {
    if (value !== undefined && !isWholeNumber(value) && !invalid.has(field)) {
      invalid.add(field);
      add('not-a-whole-number', field);
    }
  }
}

function collector(): { problems: EntityProblem[]; add: Add } {
  const problems: EntityProblem[] = [];
  const add: Add = (code, field) => problems.push({ code, field, message: ENTITY_MESSAGES[code] });
  return { problems, add };
}

/**
 * Rules every entity must follow, shared by the CSV import and the in-app editor
 * so both always accept and reject the same data. Uniqueness of ids is checked by the caller.
 * An entity may attack on both channels at once (mixed attack).
 */
export function validateEntity(entity: Entity): EntityProblem[] {
  const { problems, add } = collector();
  checkIdentity(entity, add);
  checkWholeNumbers(
    [
      ['cost', entity.cost],
      ['hp', entity.hp],
      ['speed', entity.speed],
      ['move', entity.move],
      ...Object.values(entity.atk).map((value): [string, number] => ['atk', value]),
      ...Object.values(entity.def).map((value): [string, number] => ['def', value]),
    ],
    add,
  );
  if (entity.hp === 0) add('zero-hp', 'hp');
  // A speed of 0 would never attack or move; the percentage starts at 1.
  for (const field of ['speed', 'move'] as const) {
    if (entity[field] === 0) add('speed-below-one', field);
  }
  return problems;
}

/**
 * Rules every complement must follow: an id, a name, the class that receives it and bonuses
 * that are whole numbers of 0 or more (complements only add, never subtract).
 */
export function validateComplement(complement: Complement): EntityProblem[] {
  const { problems, add } = collector();
  checkIdentity(complement, add);
  if (complement.class.trim() === '') add('missing-class', 'class');
  checkWholeNumbers(
    [
      ['speed', complement.speed],
      ['move', complement.move],
      ...Object.values(complement.atk).map((value): [string, number] => ['atk', value]),
      ...Object.values(complement.def).map((value): [string, number] => ['def', value]),
    ],
    add,
  );
  return problems;
}

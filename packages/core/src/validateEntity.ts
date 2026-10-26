/**
 * @file Rules every entity must follow, shared by the CSV import and the in-app editor.
 */

import type { Channel, Entity } from './types';

/** Rule an entity can break. See `ENTITY_MESSAGES` for the text shown to the user. */
export type EntityProblemCode =
  | 'missing-id'
  | 'invalid-id'
  | 'missing-name'
  | 'not-a-whole-number'
  | 'zero-hp'
  | 'mixed-attack'
  | 'incomplete-hybrid';

/** One broken rule, with the field it concerns so the editor can point at the right cell. */
export interface EntityProblem {
  code: EntityProblemCode;
  /** Field the problem is about: id, name, cost, hp, atk, hybridAtk, def or hybridDef. */
  field: string;
  message: string;
}

/**
 * User-facing message for each rule, written as an instruction: what to change and how.
 * Shared by the import report and the editor so the same mistake reads the same everywhere.
 */
export const ENTITY_MESSAGES: Record<EntityProblemCode, string> = {
  'missing-id': 'Every entity needs a unique id.',
  'invalid-id': 'Ids cannot contain spaces. Use hyphens instead, e.g. "heavy-unit".',
  'missing-name': 'Every entity needs a name.',
  'not-a-whole-number': 'Use whole numbers of 0 or more: write 48, not 48.5, -48 or "48 hp".',
  'zero-hp': 'HP must be at least 1. Leave it empty if the entity cannot be defeated.',
  'mixed-attack':
    'An entity deals one kind of damage: one channel or hybrid. To hit both channels, use the hybrid attack columns and leave the single-channel attacks at 0.',
  'incomplete-hybrid': 'A hybrid attack needs a value for both channels. Write 0 for a channel it does not hit.',
};

/** Whole number of 0 or more. */
export function isWholeNumber(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

/**
 * Rules every entity must follow, shared by the CSV import and the in-app editor
 * so both always accept and reject the same data. Uniqueness of ids is checked by the caller.
 */
export function validateEntity(entity: Entity, channels: readonly Channel[]): EntityProblem[] {
  const problems: EntityProblem[] = [];
  const add = (code: EntityProblemCode, field: string) => problems.push({ code, field, message: ENTITY_MESSAGES[code] });

  if (entity.id.trim() === '') add('missing-id', 'id');
  else if (/\s/.test(entity.id)) add('invalid-id', 'id');
  if (entity.name.trim() === '') add('missing-name', 'name');

  const numbers: [string, number | undefined][] = [
    ['cost', entity.cost],
    ['hp', entity.hp],
    ...Object.values(entity.atk).map((value): [string, number] => ['atk', value]),
    ...Object.values(entity.hybridAtk ?? {}).map((value): [string, number] => ['hybridAtk', value]),
    ...Object.values(entity.def).map((value): [string, number] => ['def', value]),
    ...Object.values(entity.hybridDef).map((value): [string, number] => ['hybridDef', value]),
  ];
  const invalid = new Set<string>();
  for (const [field, value] of numbers) {
    if (value !== undefined && !isWholeNumber(value) && !invalid.has(field)) {
      invalid.add(field);
      add('not-a-whole-number', field);
    }
  }
  if (entity.hp === 0) add('zero-hp', 'hp');

  const channelAttacks = Object.values(entity.atk).filter((value) => value > 0).length;
  if (channelAttacks > 1 || (entity.hybridAtk && channelAttacks > 0)) add('mixed-attack', 'atk');
  if (entity.hybridAtk && channels.some(({ key }) => entity.hybridAtk?.[key] === undefined)) {
    add('incomplete-hybrid', 'hybridAtk');
  }
  return problems;
}

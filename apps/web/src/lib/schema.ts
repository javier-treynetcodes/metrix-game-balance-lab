/**
 * @file Which fields a catalog has, and helpers to read and change an entity's attack.
 */

import { classifyHeader, type Channel, type Entity } from '@metrix/core';
import { statCode } from './codes';
import type { Catalog } from '../state/catalog';

/** Which fields the catalog's file has. Users cannot add columns: they edit what the file has. */
export interface CatalogSchema {
  attackChoices: AttackChoice[];
  defChannels: string[];
  hybridDefChannels: string[];
  hasCategory: boolean;
  hasCost: boolean;
  hasHp: boolean;
  tagKeys: string[];
  statKeys: string[];
}

/** Attack kind as offered in a select: no attack, one channel, or hybrid. */
export type AttackChoice = 'none' | `ch:${string}` | 'hybrid';

/**
 * Works out which editable fields the catalog has from the headers of the imported file.
 * Columns kept as text (not analyzed) are excluded because they cannot be edited safely.
 */
export function catalogSchema(catalog: Catalog): CatalogSchema {
  const roles = catalog.layout.headers.map((header, index) => ({
    index,
    role: header === '' ? undefined : classifyHeader(header.toLowerCase()),
  }));
  const keysOf = (kind: 'atk' | 'def' | 'hybridAtk' | 'hybridDef') =>
    roles.flatMap(({ role }) => (role && role.kind === kind ? [role.channel] : []));
  const has = (kind: string) => roles.some(({ role }) => role?.kind === kind);
  // Extra columns kept as text were stored per entity and are not editable.
  const keptAsText = (index: number) =>
    catalog.rows.some((row) => row.entity.extra[String(index)] !== undefined) ||
    catalog.original.some((row) => row.entity.extra[String(index)] !== undefined);

  return {
    attackChoices: [
      'none',
      ...keysOf('atk').map((key): AttackChoice => `ch:${key}`),
      ...(keysOf('hybridAtk').length > 0 ? (['hybrid'] as const) : []),
    ],
    defChannels: keysOf('def'),
    hybridDefChannels: keysOf('hybridDef'),
    hasCategory: has('category'),
    hasCost: has('cost'),
    hasHp: has('hp'),
    tagKeys: roles.flatMap(({ role, index }) => (role?.kind === 'tag' && !keptAsText(index) ? [role.key] : [])),
    statKeys: roles.flatMap(({ role, index }) => (role?.kind === 'stat' && !keptAsText(index) ? [role.key] : [])),
  };
}

/** Current kind of attack of an entity, as a select value. */
export function attackChoiceOf(entity: Entity): AttackChoice {
  if (entity.hybridAtk) return 'hybrid';
  const channel = Object.entries(entity.atk).find(([, value]) => value > 0)?.[0];
  return channel === undefined ? 'none' : `ch:${channel}`;
}

/** Total attack of an entity, whatever its kind. */
export function attackValue(entity: Entity): number {
  const values = Object.values(entity.hybridAtk ?? entity.atk);
  return values.reduce((sum, value) => sum + value, 0);
}

/**
 * Changes the kind of attack, keeping the attack value where it makes sense:
 * moving between channels carries the value; becoming hybrid puts it on the first channel.
 */
export function withAttackChoice(entity: Entity, choice: AttackChoice, channels: readonly Channel[]): Entity {
  const total = attackValue(entity);
  const zeros = Object.fromEntries(Object.keys(entity.atk).map((key) => [key, 0]));
  const next: Entity = { ...entity, atk: zeros };
  delete next.hybridAtk;
  if (choice === 'hybrid') {
    next.hybridAtk = Object.fromEntries(channels.map(({ key }, index) => [key, index === 0 ? total : 0]));
  } else if (choice !== 'none') {
    next.atk = { ...zeros, [choice.slice(3)]: total };
  }
  return next;
}

/** Display name of a channel, or its key when the channel is unknown. */
export function channelLabel(channels: readonly Channel[], key: string): string {
  return channels.find((channel) => channel.key === key)?.label ?? key;
}

/** Short label for a kind of attack: "ATK 1", "Hybrid" or "No attack". */
export function attackChoiceLabel(choice: AttackChoice, channels: readonly Channel[]): string {
  if (choice === 'none') return 'No attack';
  if (choice === 'hybrid') return 'Hybrid';
  return statCode('atk', channels, choice.slice(3));
}

/** Sets one attack value. Typing an attack of another kind switches the entity to that kind. */
export function withAttackValue(
  entity: Entity,
  kind: 'atk' | 'hyb',
  key: string,
  value: number,
  channels: readonly Channel[],
): Entity {
  const zeros = Object.fromEntries(Object.keys(entity.atk).map((name) => [name, 0]));
  if (kind === 'hyb') {
    const base = entity.hybridAtk ?? Object.fromEntries(channels.map((channel) => [channel.key, 0]));
    return { ...entity, atk: zeros, hybridAtk: { ...base, [key]: value } };
  }
  // A 0 only clears this attack; any other kind of attack stays as it was.
  if (value === 0) return { ...entity, atk: { ...entity.atk, [key]: 0 } };
  const next: Entity = { ...entity, atk: { ...zeros, [key]: value } };
  delete next.hybridAtk;
  return next;
}

/** A blank entity with every field of the file at 0, ready to be edited. */
export function blankEntity(schema: CatalogSchema): Entity {
  const zeros = (keys: string[]) => Object.fromEntries(keys.map((key) => [key, 0]));
  const atkKeys = schema.attackChoices.filter((choice) => choice.startsWith('ch:')).map((choice) => choice.slice(3));
  const entity: Entity = {
    id: 'new-entity',
    name: 'New entity',
    atk: zeros(atkKeys),
    def: zeros(schema.defChannels),
    hybridDef: {},
    tags: {},
    stats: {},
    extra: {},
  };
  if (schema.hasHp) entity.hp = 100;
  if (schema.hasCost) entity.cost = 0;
  return entity;
}

/**
 * @file Which fields a catalog has, and helpers to read an entity's attack.
 */

import { classifyHeader, type Channel, type Entity } from '@metrix/core';
import type { Catalog } from '../state/catalog';

/** Which fields the catalog's file has. Users cannot add columns: they edit what the file has. */
export interface CatalogSchema {
  atkChannels: string[];
  defChannels: string[];
  hasCharacter: boolean;
  hasClass: boolean;
  hasCost: boolean;
  hasHp: boolean;
  /** True when the file has a `speed` column (attack speed, a percentage where 100 is normal). */
  hasSpeed: boolean;
  /** True when the file has a `move` column (move speed, informative only). */
  hasMove: boolean;
  tagKeys: string[];
  statKeys: string[];
}

/**
 * Works out which editable fields the catalog has from the headers of the imported file.
 * Columns kept as text (not analyzed) are excluded because they cannot be edited safely.
 */
export function catalogSchema(catalog: Catalog): CatalogSchema {
  const roles = catalog.layout.headers.map((header, index) => ({
    index,
    role: header === '' ? undefined : classifyHeader(header.toLowerCase()),
  }));
  const keysOf = (kind: 'atk' | 'def') => roles.flatMap(({ role }) => (role && role.kind === kind ? [role.channel] : []));
  const has = (kind: string) => roles.some(({ role }) => role?.kind === kind);
  // Extra columns kept as text were stored per entity and are not editable.
  const keptAsText = (index: number) =>
    catalog.rows.some((row) => row.entity.extra[String(index)] !== undefined) ||
    catalog.original.some((row) => row.entity.extra[String(index)] !== undefined);

  return {
    atkChannels: keysOf('atk'),
    defChannels: keysOf('def'),
    hasCharacter: has('character'),
    hasClass: has('class'),
    hasCost: has('cost'),
    hasHp: has('hp'),
    hasSpeed: has('speed'),
    hasMove: has('move'),
    tagKeys: roles.flatMap(({ role, index }) => (role?.kind === 'tag' && !keptAsText(index) ? [role.key] : [])),
    statKeys: roles.flatMap(({ role, index }) => (role?.kind === 'stat' && !keptAsText(index) ? [role.key] : [])),
  };
}

/** Total attack of an entity: the sum of both channels for a mixed attacker. */
export function attackValue(entity: Entity): number {
  return Object.values(entity.atk).reduce((sum, value) => sum + value, 0);
}

/** Channels the entity attacks on, in channel order. */
export function attackChannels(entity: Entity, channels: readonly Channel[]): string[] {
  return channels.flatMap(({ key }) => ((entity.atk[key] ?? 0) > 0 ? [key] : []));
}

/** Display name of a channel, or its key when the channel is unknown. */
export function channelLabel(channels: readonly Channel[], key: string): string {
  return channels.find((channel) => channel.key === key)?.label ?? key;
}

/** Name to show for an entity: character and unit name joined by a middle dot (Aria, Iron Vanguard) when it has a character name, else the unit name. */
export function displayName(entity: Entity): string {
  return entity.character ? `${entity.character} · ${entity.name}` : entity.name;
}

/** A blank entity with every field of the file at 0 (100 hp, 100% speed and move), ready to be edited. */
export function blankEntity(schema: CatalogSchema): Entity {
  const zeros = (keys: string[]) => Object.fromEntries(keys.map((key) => [key, 0]));
  const entity: Entity = {
    id: 'new-entity',
    name: 'New entity',
    atk: zeros(schema.atkChannels),
    def: zeros(schema.defChannels),
    tags: {},
    stats: {},
    extra: {},
  };
  if (schema.hasHp) entity.hp = 100;
  if (schema.hasCost) entity.cost = 0;
  // Speed and move are percentages: a new entity starts at the normal 100.
  if (schema.hasSpeed) entity.speed = 100;
  if (schema.hasMove) entity.move = 100;
  return entity;
}

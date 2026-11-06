import type { Channel, Complement, Entity } from '../src';

export const channels: Channel[] = [
  { key: '1', label: 'Channel 1' },
  { key: '2', label: 'Channel 2' },
];

export const entity = (id: string, overrides: Partial<Entity> = {}): Entity => ({
  id,
  name: id,
  atk: {},
  def: {},
  tags: {},
  stats: {},
  extra: {},
  ...overrides,
});

export const complement = (id: string, overrides: Partial<Complement> = {}): Complement => ({
  id,
  name: id,
  class: 'tank',
  atk: {},
  def: {},
  extra: {},
  ...overrides,
});

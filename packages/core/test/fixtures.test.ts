import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { damageBreakdown, hitsToDefeat, type HitsToDefeat } from '../src';
import type { Channel, Entity } from '../src';

/** Reference cases with hand-computed results, shared with future ports of the engine. */
interface Fixture {
  name: string;
  description: string;
  channels: Channel[];
  entities: Entity[];
  expected: {
    damage: { attacker: string; defender: string; damage: number }[];
    hitsToDefeat: { attacker: string; defender: string; result: HitsToDefeat }[];
  };
}

const FIXTURES_DIR = join(import.meta.dirname, '..', 'fixtures');

const fixtures: Fixture[] = readdirSync(FIXTURES_DIR)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(readFileSync(join(FIXTURES_DIR, file), 'utf8')) as Fixture);

describe.each(fixtures)('fixture $name', (fixture) => {
  const byId = new Map(fixture.entities.map((entity) => [entity.id, entity]));
  const get = (id: string): Entity => {
    const entity = byId.get(id);
    if (!entity) throw new Error(`Unknown entity "${id}" in fixture ${fixture.name}`);
    return entity;
  };

  it('matches expected damage per hit', () => {
    for (const { attacker, defender, damage } of fixture.expected.damage) {
      expect(damageBreakdown(get(attacker), get(defender), fixture.channels).damage, `${attacker} → ${defender}`).toBe(damage);
    }
  });

  it('matches expected hits to defeat', () => {
    for (const { attacker, defender, result } of fixture.expected.hitsToDefeat) {
      const damage = damageBreakdown(get(attacker), get(defender), fixture.channels).damage;
      expect(hitsToDefeat(damage, get(defender)), `${attacker} → ${defender}`).toEqual(result);
    }
  });
});

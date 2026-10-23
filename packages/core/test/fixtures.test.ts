import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { damagePerHit, timeToDefeat, type TimeToDefeat } from '../src';
import type { Channel, Entity, InteractionMatrix } from '../src';

interface Fixture {
  name: string;
  description: string;
  channels: Channel[];
  entities: Entity[];
  interactions?: InteractionMatrix;
  expected: {
    damagePerHit: { attacker: string; defender: string; damage: number }[];
    timeToDefeat: { attacker: string; defender: string; result: TimeToDefeat }[];
  };
}

const FIXTURES_DIR = join(import.meta.dirname, '..', 'fixtures');
const TOLERANCE_DIGITS = 8;

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
    for (const { attacker, defender, damage } of fixture.expected.damagePerHit) {
      const actual = damagePerHit(get(attacker), get(defender), fixture.channels, fixture.interactions);
      expect(actual, `${attacker} → ${defender}`).toBeCloseTo(damage, TOLERANCE_DIGITS);
    }
  });

  it('matches expected time to defeat', () => {
    for (const { attacker, defender, result } of fixture.expected.timeToDefeat) {
      const actual = timeToDefeat(get(attacker), get(defender), fixture.channels, fixture.interactions);
      expect(actual.kind, `${attacker} → ${defender}`).toBe(result.kind);
      if (actual.kind === 'defeats' && result.kind === 'defeats') {
        expect(actual.time, `${attacker} → ${defender}`).toBeCloseTo(result.time, TOLERANCE_DIGITS);
      }
    }
  });
});

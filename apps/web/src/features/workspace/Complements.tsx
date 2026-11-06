/**
 * @file Complements tab: the complements of the file, by class, switched on or off.
 */

import type { Channel, Complement, Entity } from '@metrix/core';
import { StatCode } from '../../components/StatCode';
import { plural } from '../../lib/format';
import { displayName } from '../../lib/schema';

interface ComplementsProps {
  /** The two damage channels of the catalog. */
  channels: readonly Channel[];
  /** Every complement of the file. */
  complements: readonly Complement[];
  /** Ids of complements switched off. */
  inactive: readonly string[];
  /** Every entity, to show who receives each complement. */
  entities: readonly Entity[];
  /** Switches a complement on or off. */
  onToggle: (id: string) => void;
}

/** Speed bonuses a complement can add, in percentage points. */
const SPEED_BONUSES = [
  { field: 'speed', label: 'Speed' },
  { field: 'move', label: 'Move' },
] as const;

/** "ATK 1 +4, DEF 2 +10, Speed +10%": the bonuses of a complement. */
function Bonuses({ complement, channels }: { complement: Complement; channels: readonly Channel[] }) {
  const parts = (['atk', 'def'] as const).flatMap((kind) =>
    channels.flatMap(({ key }) => {
      const value = complement[kind][key] ?? 0;
      return value > 0 ? [{ kind, key, value }] : [];
    }),
  );
  const speeds = SPEED_BONUSES.flatMap(({ field, label }) => {
    const value = complement[field] ?? 0;
    return value > 0 ? [{ field, label, value }] : [];
  });
  if (parts.length === 0 && speeds.length === 0) return <span className="muted">No bonus</span>;
  return (
    <span className="bonus-list">
      {parts.map(({ kind, key, value }) => (
        <span key={`${kind}-${key}`} className="bonus-item">
          <StatCode kind={kind} channels={channels} channelKey={key} /> +{value}
        </span>
      ))}
      {speeds.map(({ field, label, value }) => (
        <span key={field} className="bonus-item">
          {label} +{value}%
        </span>
      ))}
    </span>
  );
}

/**
 * Complements grouped by class. Each one shows its bonuses and the characters that receive it.
 * Switching one off removes it from "With complements" in Duels and Versus. It is a viewing
 * setting: it is not exported and every complement is active again after an import.
 */
export function Complements({ channels, complements, inactive, entities, onToggle }: ComplementsProps) {
  if (complements.length === 0) {
    return (
      <div className="tab-body">
        <p className="empty">
          This catalog has no complements. Add rows with kind <code>complement</code> to your CSV, as in the template: a name,
          the class that receives it and the attack or armor it adds.
        </p>
      </div>
    );
  }

  const off = new Set(inactive);
  const classes = [...new Set(complements.map((complement) => complement.class))];

  return (
    <div className="tab-body">
      <p className="muted small intro">
        Complements are items obtained during a match. Each one adds attack or armor to every character of its class.
        Switch them on or off to see which one changes the balance in Duels and Versus. This only affects the view: your
        CSV keeps every complement.
      </p>
      <div className="complement-groups">
        {classes.map((className) => {
          const members = entities.filter((entity) => entity.class === className);
          return (
            <section key={className} className="complement-group" aria-labelledby={`class-${className}`}>
              <header className="complement-head">
                <h3 id={`class-${className}`}>{className}</h3>
                <p className="muted small">
                  {members.length > 0
                    ? `${plural(members.length, 'character')}: ${members.map(displayName).join(', ')}`
                    : 'No character has this class, so these complements affect nobody.'}
                </p>
              </header>
              <ul className="complement-list">
                {complements
                  .filter((complement) => complement.class === className)
                  .map((complement) => {
                    const active = !off.has(complement.id);
                    return (
                      <li key={complement.id} className={`complement-item${active ? '' : ' is-off'}`}>
                        <label className="check-field">
                          <input type="checkbox" checked={active} onChange={() => onToggle(complement.id)} />
                          <span className="complement-name">{complement.name}</span>
                        </label>
                        <Bonuses complement={complement} channels={channels} />
                        <span className="muted small">{active ? 'Active' : 'Off'}</span>
                      </li>
                    );
                  })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

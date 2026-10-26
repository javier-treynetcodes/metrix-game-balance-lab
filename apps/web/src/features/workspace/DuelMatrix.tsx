import { useMemo, useState } from 'react';
import { duelMatrix, type Channel, type Duel, type Entity, type TimeToDefeat } from '@metrix/core';
import { formatTime, plural } from '../../lib/format';

/** Beyond this the grid stops being readable; the category filter narrows it down. */
const MAX_ENTITIES = 60;
const ALL = '__all__';

function cellText(outcome: TimeToDefeat): string {
  if (outcome.kind === 'defeats') return formatTime(outcome.time);
  return outcome.kind === 'cannot-damage' ? 'No dmg' : '—';
}

function describe(outcome: TimeToDefeat, from: string, to: string): string {
  if (outcome.kind === 'defeats') return `${from} defeats ${to} in ${formatTime(outcome.time)}`;
  if (outcome.kind === 'cannot-damage') return `${from} cannot damage ${to}`;
  return `${to} has no hp`;
}

function tooltip(duel: Duel, attacker: Entity, defender: Entity): string {
  const winner =
    duel.winner === 'attacker'
      ? `${attacker.name} wins`
      : duel.winner === 'defender'
        ? `${defender.name} wins`
        : duel.winner === 'draw'
          ? 'Draw'
          : 'Nobody can win';
  return `${describe(duel.attack, attacker.name, defender.name)}. ${describe(duel.counter, defender.name, attacker.name)}. ${winner}.`;
}

export function DuelMatrix({ channels, entities }: { channels: readonly Channel[]; entities: readonly Entity[] }) {
  const categories = useMemo(
    () => [...new Set(entities.flatMap((entity) => (entity.category ? [entity.category] : [])))],
    [entities],
  );
  const [category, setCategory] = useState(ALL);

  const fighters = useMemo(
    () => entities.filter((entity) => entity.hp !== undefined && (category === ALL || entity.category === category)),
    [entities, category],
  );
  const shown = useMemo(() => fighters.slice(0, MAX_ENTITIES), [fighters]);
  const withoutHp = entities.filter((entity) => entity.hp === undefined).length;

  const grid = useMemo(() => duelMatrix(shown, channels), [shown, channels]);

  const records = grid.map((row) => {
    const opponents = row.filter((duel) => duel.attackerId !== duel.defenderId);
    return {
      wins: opponents.filter((duel) => duel.winner === 'attacker').length,
      losses: opponents.filter((duel) => duel.winner === 'defender').length,
    };
  });

  const walls = shown
    .map((defender, column) => ({
      defender,
      immuneTo: shown.filter((_attacker, row) => row !== column && grid[row]?.[column]?.attack.kind === 'cannot-damage'),
    }))
    .filter(({ immuneTo }) => immuneTo.length > 0);

  if (channels.length === 0 || fighters.length < 2) {
    return (
      <div className="tab-body">
        <p className="empty">
          {channels.length === 0
            ? 'Duels need at least one atk: column in your CSV.'
            : 'Duels need at least two entities with hp.'}
        </p>
      </div>
    );
  }

  return (
    <div className="tab-body">
      <div className="toolbar">
        {categories.length > 1 && (
          <label className="field">
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value={ALL}>All categories</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
        <ul className="legend" aria-label="Legend">
          <li><span className="swatch win" /> Row wins</li>
          <li><span className="swatch loss" /> Row loses</li>
          <li><span className="swatch draw" /> Draw or nobody wins</li>
        </ul>
      </div>

      <p className="muted small intro">
        Each cell is the time the row entity needs to defeat the column entity, in the unit of your <code>rate</code>{' '}
        column (seconds or turns). Both attack at once: the faster one wins. Hover a cell for the full duel.
        {withoutHp > 0 && ` ${plural(withoutHp, 'entity', 'entities')} without hp ${withoutHp === 1 ? 'is' : 'are'} left out.`}
        {fighters.length > MAX_ENTITIES &&
          ` Showing the first ${MAX_ENTITIES} of ${fighters.length}; filter by category to see the rest.`}
      </p>

      <div className="table-scroll">
        <table className="duel-table">
          <thead>
            <tr>
              <th scope="col" className="corner">
                Attacker ↓ / Defender →
              </th>
              {shown.map((entity) => (
                <th key={entity.id} scope="col" className="defender">
                  <span>{entity.name}</span>
                </th>
              ))}
              <th scope="col" className="record">W–L</th>
            </tr>
          </thead>
          <tbody>
            {grid.map((row, rowIndex) => {
              const attacker = shown[rowIndex] as Entity;
              const record = records[rowIndex] ?? { wins: 0, losses: 0 };
              return (
                <tr key={attacker.id}>
                  <th scope="row" className="attacker">{attacker.name}</th>
                  {row.map((duel, columnIndex) => {
                    const defender = shown[columnIndex] as Entity;
                    if (duel.attackerId === duel.defenderId) {
                      return <td key={defender.id} className="cell self" aria-label="Same entity" />;
                    }
                    const tone =
                      duel.winner === 'attacker' ? 'win' : duel.winner === 'defender' ? 'loss' : 'draw';
                    const text = tooltip(duel, attacker, defender);
                    return (
                      <td key={defender.id} className={`cell ${tone}`} title={text} aria-label={text}>
                        {cellText(duel.attack)}
                      </td>
                    );
                  })}
                  <td className="record">
                    {record.wins}–{record.losses}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="insight" aria-labelledby="walls-title">
        <h3 id="walls-title">Walls</h3>
        {walls.length === 0 ? (
          <p className="muted">Every entity can be damaged by every other one.</p>
        ) : (
          <ul className="wall-list">
            {walls.map(({ defender, immuneTo }) => (
              <li key={defender.id}>
                <strong>{defender.name}</strong> cannot be damaged by {immuneTo.map((entity) => entity.name).join(', ')}.
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

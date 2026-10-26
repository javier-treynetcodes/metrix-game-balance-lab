import { useMemo, useState } from 'react';
import { matchupMatrix, metricValue, METRICS, winnerBy, hitsMargin, type Channel, type Matchup, type Metric } from '@metrix/core';
import { plural } from '../../lib/format';
import type { GenreProfile } from '../../lib/genres';
import { wallReason } from '../../lib/explain';
import { formatHits, formatSigned, metricHint, metricName } from '../../lib/metrics';
import type { Row } from '../../state/catalog';

/** Beyond this the grid stops being readable; the category filter narrows it down. */
const MAX_ENTITIES = 60;
const ALL = '__all__';

interface DuelMatrixProps {
  channels: readonly Channel[];
  rows: readonly Row[];
  genre: GenreProfile;
  onOpen: (attackerKey: string, defenderKey: string) => void;
}

function cellText(result: Matchup, metric: Metric, genre: GenreProfile): string {
  if (metric === 'hits') {
    return result.forwardHits.kind === 'defeats' ? String(result.forwardHits.hits) : formatHits(result.forwardHits, genre);
  }
  const value = metricValue(result, metric) ?? 0;
  return metric === 'trade' ? formatSigned(value) : String(value);
}

export function DuelMatrix({ channels, rows, genre, onOpen }: DuelMatrixProps) {
  const [metric, setMetric] = useState<Metric>(genre.primary);
  const [category, setCategory] = useState(ALL);
  const categories = useMemo(
    () => [...new Set(rows.flatMap(({ entity }) => (entity.category ? [entity.category] : [])))],
    [rows],
  );

  const shown = useMemo(
    () => rows.filter(({ entity }) => category === ALL || entity.category === category).slice(0, MAX_ENTITIES),
    [rows, category],
  );
  const total = rows.filter(({ entity }) => category === ALL || entity.category === category).length;
  const grid = useMemo(() => matchupMatrix(shown.map((row) => row.entity), channels), [shown, channels]);

  const records = grid.map((row) => {
    const opponents = row.filter((result) => result.attackerId !== result.defenderId);
    return {
      wins: opponents.filter((result) => winnerBy(result, metric) === 'attacker').length,
      losses: opponents.filter((result) => winnerBy(result, metric) === 'defender').length,
    };
  });

  const walls = shown
    .map((defender, column) => ({
      defender,
      immuneTo: shown.flatMap((attacker, rowIndex) => {
        const result = grid[rowIndex]?.[column];
        if (rowIndex === column || !result || result.forward.attack === 0 || result.forward.damage > 0) return [];
        return [{ attacker, reason: wallReason(result.forward, channels) }];
      }),
    }))
    .filter(({ immuneTo }) => immuneTo.length > 0);

  if (rows.length < 2) {
    return (
      <div className="tab-body">
        <p className="empty">Duels need at least two entities.</p>
      </div>
    );
  }

  const ranks = metric !== 'blocked';

  return (
    <div className="tab-body">
      <div className="toolbar">
        <label className="field">
          <span>Compare by</span>
          <select value={metric} onChange={(event) => setMetric(event.target.value as Metric)}>
            {METRICS.map((option) => (
              <option key={option} value={option}>
                {metricName(option, genre)}
                {option === genre.primary ? ` (${genre.name} default)` : ''}
              </option>
            ))}
          </select>
        </label>
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
        {ranks && (
          <ul className="legend" aria-label="Legend">
            <li><span className="swatch win" /> Row wins</li>
            <li><span className="swatch loss" /> Row loses</li>
            <li><span className="swatch draw" /> Draw or no winner</li>
          </ul>
        )}
      </div>

      <p className="muted small intro">
        {metricHint(metric, genre)} Click a cell to open the duel in Versus, step by step.
        {total > MAX_ENTITIES && ` Showing the first ${MAX_ENTITIES} of ${total}; filter by category to see the rest.`}
      </p>

      <div className="table-scroll">
        <table className="duel-table">
          <thead>
            <tr>
              <th scope="col" className="corner">
                Attacker ↓ / Defender →
              </th>
              {shown.map(({ key, entity }) => (
                <th key={key} scope="col" className="defender">
                  <span>{entity.name}</span>
                </th>
              ))}
              {ranks && <th scope="col" className="record">W–L</th>}
            </tr>
          </thead>
          <tbody>
            {grid.map((resultRow, rowIndex) => {
              const attacker = shown[rowIndex] as Row;
              const record = records[rowIndex] ?? { wins: 0, losses: 0 };
              return (
                <tr key={attacker.key}>
                  <th scope="row" className="attacker">{attacker.entity.name}</th>
                  {resultRow.map((result, columnIndex) => {
                    const defender = shown[columnIndex] as Row;
                    if (rowIndex === columnIndex) return <td key={defender.key} className="cell self" aria-label="Same entity" />;
                    const winner = winnerBy(result, metric);
                    const tone = !ranks ? 'neutral' : winner === 'attacker' ? 'win' : winner === 'defender' ? 'loss' : 'draw';
                    const margin = hitsMargin(result);
                    const close = metric === 'hits' && margin !== undefined && Math.abs(margin) === 1;
                    const text = cellText(result, metric, genre);
                    return (
                      <td key={defender.key} className={`cell ${tone}${close ? ' close' : ''}`}>
                        <button
                          type="button"
                          className="cell-link"
                          onClick={() => onOpen(attacker.key, defender.key)}
                          aria-label={`${attacker.entity.name} against ${defender.entity.name}: ${text}. Open in Versus`}
                          title={close ? 'Close fight' : undefined}
                        >
                          {text}
                        </button>
                      </td>
                    );
                  })}
                  {ranks && (
                    <td className="record">
                      {record.wins}–{record.losses}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {metric === 'hits' && <p className="muted small legend-note">Cells with a dotted border are close fights: the winner needs just one {genre.hit} less.</p>}

      <section className="insight" aria-labelledby="walls-title">
        <h3 id="walls-title">Walls</h3>
        {walls.length === 0 ? (
          <p className="muted">Every attacker can damage every other entity.</p>
        ) : (
          <ul className="wall-list">
            {walls.map(({ defender, immuneTo }) => (
              <li key={defender.key}>
                <strong>{defender.entity.name}</strong> takes 0 damage from {plural(immuneTo.length, 'attacker')}:{' '}
                {immuneTo.map(({ attacker, reason }) => `${attacker.entity.name} (${reason})`).join('; ')}.
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

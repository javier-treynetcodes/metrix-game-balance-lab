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

/** How decisive a duel is, from 1 (narrow) to 3 (crushing), to set the color strength. */
function strength(result: Matchup, metric: Metric): 1 | 2 | 3 {
  let ratio = 0;
  if (metric === 'hits') {
    const f = result.forwardHits.kind === 'defeats' ? result.forwardHits.hits : undefined;
    const b = result.backwardHits.kind === 'defeats' ? result.backwardHits.hits : undefined;
    ratio = f === undefined || b === undefined ? 1 : Math.abs(f - b) / Math.max(f, b);
  } else {
    const top = Math.max(result.forward.damage, result.backward.damage);
    ratio = top === 0 ? 0 : Math.abs(result.trade) / top;
  }
  return ratio >= 0.5 ? 3 : ratio >= 0.2 ? 2 : 1;
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
  const [sortByRecord, setSortByRecord] = useState(false);
  const [hover, setHover] = useState<{ row: number; column: number } | null>(null);
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

  // Display order: input order, or best win–loss record first. Rows and columns share it.
  const order = shown.map((_row, index) => index);
  if (sortByRecord) {
    order.sort((a, b) => {
      const ra = records[a] ?? { wins: 0, losses: 0 };
      const rb = records[b] ?? { wins: 0, losses: 0 };
      return rb.wins - ra.wins || ra.losses - rb.losses;
    });
  }

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
          <label className="check-field">
            <input type="checkbox" checked={sortByRecord} onChange={(event) => setSortByRecord(event.target.checked)} />
            Best record first
          </label>
        )}
        {ranks && (
          <ul className="legend" aria-label="Legend">
            <li><span className="swatch win" /> ▲ Row wins</li>
            <li><span className="swatch loss" /> ▼ Row loses</li>
            <li><span className="swatch draw" /> = Draw or no winner</li>
            <li className="muted">Stronger color = bigger margin</li>
          </ul>
        )}
      </div>

      <p className="muted small intro">
        {metricHint(metric, genre)} Click a cell to open the duel in Versus, step by step.
        {total > MAX_ENTITIES && ` Showing the first ${MAX_ENTITIES} of ${total}; filter by category to see the rest.`}
      </p>

      <div className="table-scroll">
        <table className="duel-table" onMouseLeave={() => setHover(null)}>
          <thead>
            <tr>
              <th scope="col" className="corner">
                Attacker ↓ / Defender →
              </th>
              {order.map((index) => {
                const { key, entity } = shown[index] as Row;
                return (
                  <th key={key} scope="col" className={`defender${hover?.column === index ? ' hl' : ''}`}>
                    <span>{entity.name}</span>
                  </th>
                );
              })}
              {ranks && <th scope="col" className="record">W–L</th>}
            </tr>
          </thead>
          <tbody>
            {order.map((rowIndex) => {
              const attacker = shown[rowIndex] as Row;
              const record = records[rowIndex] ?? { wins: 0, losses: 0 };
              return (
                <tr key={attacker.key}>
                  <th scope="row" className={`attacker${hover?.row === rowIndex ? ' hl' : ''}`}>{attacker.entity.name}</th>
                  {order.map((columnIndex) => {
                    const defender = shown[columnIndex] as Row;
                    const result = grid[rowIndex]?.[columnIndex] as Matchup;
                    const crossed = hover && (hover.row === rowIndex || hover.column === columnIndex) ? ' crossed' : '';
                    if (rowIndex === columnIndex) {
                      return <td key={defender.key} className={`cell self${crossed}`} aria-label="Same entity" />;
                    }
                    const winner = winnerBy(result, metric);
                    const tone = !ranks ? 'neutral' : winner === 'attacker' ? 'win' : winner === 'defender' ? 'loss' : 'draw';
                    const margin = hitsMargin(result);
                    const close = metric === 'hits' && margin !== undefined && Math.abs(margin) === 1;
                    const text = cellText(result, metric, genre);
                    const mark = tone === 'win' ? '▲' : tone === 'loss' ? '▼' : tone === 'draw' ? '=' : '';
                    return (
                      <td
                        key={defender.key}
                        className={`cell ${tone} level-${strength(result, metric)}${close ? ' close' : ''}${crossed}`}
                        onMouseEnter={() => setHover({ row: rowIndex, column: columnIndex })}
                      >
                        <button
                          type="button"
                          className="cell-link"
                          onClick={() => onOpen(attacker.key, defender.key)}
                          onFocus={() => setHover({ row: rowIndex, column: columnIndex })}
                          aria-label={`${attacker.entity.name} against ${defender.entity.name}: ${text}${
                            tone === 'win' ? ', row wins' : tone === 'loss' ? ', row loses' : ''
                          }. Open in Versus`}
                          title={close ? 'Close fight' : undefined}
                        >
                          {mark && <span className="cell-mark" aria-hidden="true">{mark}</span>}
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

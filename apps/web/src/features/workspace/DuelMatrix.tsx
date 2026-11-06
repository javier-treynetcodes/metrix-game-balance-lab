/**
 * @file Duels tab: matrix of every matchup, records, walls and escapes.
 */

import { useMemo, useState } from 'react';
import {
  equipAll,
  hitsMargin,
  matchupMatrix,
  metricValue,
  METRICS,
  moveEdge,
  movementNote,
  timeToDefeat,
  winnerBy,
  type ArmorCoverage,
  type Channel,
  type Complement,
  type Matchup,
  type Metric,
} from '@metrix/core';
import { plural } from '../../lib/format';
import type { GenreProfile } from '../../lib/genres';
import { wallReason } from '../../lib/explain';
import { formatHits, formatPercent, formatSigned, formatTime, metricHint, metricName } from '../../lib/metrics';
import { displayName } from '../../lib/schema';
import type { Row } from '../../state/catalog';

/** Beyond this the grid stops being readable; the class filter narrows it down. */
const MAX_ENTITIES = 60;
const ALL = '__all__';

interface DuelMatrixProps {
  /** The two damage channels of the catalog. */
  channels: readonly Channel[];
  /** How much of each channel every armor stops. */
  coverage: ArmorCoverage;
  /** True when the units have attack speed: offers "Time to defeat". */
  usesSpeed: boolean;
  /** True when the units have move: lists the duels the loser can escape. */
  usesMove: boolean;
  /** Active complements; "With complements" adds them to every character of their class. */
  complements: readonly Complement[];
  /** Catalog rows, in catalog order. */
  rows: readonly Row[];
  /** Genre profile: default metric and the word for one attack. */
  genre: GenreProfile;
  /** Opens a duel in Versus, given the row keys of the attacker (row) and the defender (column). */
  onOpen: (attackerKey: string, defenderKey: string) => void;
}

/** How decisive a duel is, from 1 (narrow) to 3 (crushing), to set the color strength. */
function strength(result: Matchup, metric: Metric): 1 | 2 | 3 {
  let ratio: number;
  if (metric === 'hits' || metric === 'time') {
    const hitsBack = result.backwardHits.kind === 'defeats' ? result.backwardHits.hits : undefined;
    const f = metric === 'hits' ? metricValue(result, 'hits') : timeToDefeat(result);
    const b = metric === 'hits' ? hitsBack : timeToDefeat(result, 'backward');
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
  if (metric === 'time') {
    const time = timeToDefeat(result);
    return time === undefined ? formatHits(result.forwardHits, genre) : formatTime(time);
  }
  const value = metricValue(result, metric) ?? 0;
  return metric === 'trade' ? formatSigned(value) : String(value);
}

/**
 * Every entity against every other one. Rows attack, columns defend.
 *
 * - The cell value and the winner come from the selected metric (the genre's by default).
 * - Color strength follows the margin of victory; marks (up, down, equal) repeat the result
 *   for readers who cannot rely on color.
 * - "Base / With complements" compares the base values or the values with the active complements
 *   of each class; a diamond mark flags the duels whose winner changes between the two.
 * - Clicking a cell opens that duel in Versus. "Walls" lists attacks that deal 0 damage.
 * - "Escapes" (when the catalog has move) lists the duels whose loser moves faster than the
 *   winner and can avoid the fight. Movement never changes a result: it is only a note.
 * - Large catalogs are capped at `MAX_ENTITIES` per view; the class filter shows the rest.
 */
export function DuelMatrix({ usesSpeed, usesMove, channels, coverage, complements, rows, genre, onOpen }: DuelMatrixProps) {
  const [metric, setMetric] = useState<Metric>(genre.primary);
  const [equipped, setEquipped] = useState(false);
  const [classFilter, setClassFilter] = useState(ALL);
  const [sortByRecord, setSortByRecord] = useState(false);
  const [hover, setHover] = useState<{ row: number; column: number } | null>(null);
  const classes = useMemo(
    () => [...new Set(rows.flatMap(({ entity }) => (entity.class ? [entity.class] : [])))],
    [rows],
  );

  const shown = useMemo(
    () => rows.filter(({ entity }) => classFilter === ALL || entity.class === classFilter).slice(0, MAX_ENTITIES),
    [rows, classFilter],
  );
  const total = rows.filter(({ entity }) => classFilter === ALL || entity.class === classFilter).length;
  const hasComplements = complements.length > 0;
  const showEquipped = equipped && hasComplements;
  const baseGrid = useMemo(
    () => matchupMatrix(shown.map((row) => row.entity), channels, coverage),
    [shown, channels, coverage],
  );
  const equippedGrid = useMemo(
    () => (hasComplements ? matchupMatrix(equipAll(shown.map((row) => row.entity), complements), channels, coverage) : baseGrid),
    [shown, channels, coverage, complements, hasComplements, baseGrid],
  );
  const grid = showEquipped ? equippedGrid : baseGrid;
  /** True when the complements change who wins this duel, by the selected metric. */
  const flips = (row: number, column: number) => {
    const before = baseGrid[row]?.[column];
    const after = equippedGrid[row]?.[column];
    return before !== undefined && after !== undefined && winnerBy(before, metric) !== winnerBy(after, metric);
  };

  const records = grid.map((row) => {
    const opponents = row.filter((result) => result.attackerId !== result.defenderId);
    return {
      wins: opponents.filter((result) => winnerBy(result, metric) === 'attacker').length,
      losses: opponents.filter((result) => winnerBy(result, metric) === 'defender').length,
    };
  });

  // Display order: input order, or best win-loss record first. Rows and columns share it.
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

  // Each pair once: the loser by the selected metric moves faster, so it can avoid the fight.
  const escapes = usesMove
    ? shown.flatMap((first, i) =>
        shown.flatMap((second, j) => {
          const result = grid[i]?.[j];
          if (j <= i || !result || movementNote(result, metric) !== 'loser-faster') return [];
          const attackerWins = winnerBy(result, metric) === 'attacker';
          const slight = moveEdge(result)?.slight ?? false;
          return [
            attackerWins
              ? { winner: first, loser: second, winnerMove: result.move.attacker, loserMove: result.move.defender, slight }
              : { winner: second, loser: first, winnerMove: result.move.defender, loserMove: result.move.attacker, slight },
          ];
        }),
      )
    : [];

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
            {METRICS.filter((option) => option !== 'time' || usesSpeed).map((option) => (
              <option key={option} value={option}>
                {metricName(option, genre)}
                {option === genre.primary ? ` (${genre.name} default)` : ''}
              </option>
            ))}
          </select>
        </label>
        {hasComplements && (
          <fieldset className="segmented">
            <legend className="visually-hidden">Values</legend>
            <label className={!equipped ? 'is-active' : undefined}>
              <input type="radio" name="loadout" checked={!equipped} onChange={() => setEquipped(false)} />
              Base
            </label>
            <label className={equipped ? 'is-active' : undefined}>
              <input type="radio" name="loadout" checked={equipped} onChange={() => setEquipped(true)} />
              With complements
            </label>
          </fieldset>
        )}
        {classes.length > 1 && (
          <label className="field">
            <span>Class</span>
            <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              <option value={ALL}>All classes</option>
              {classes.map((name) => (
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
            {hasComplements && <li>◆ Winner changes with complements</li>}
            <li className="muted">Stronger color = bigger margin</li>
          </ul>
        )}
      </div>

      <p className="muted small intro">
        {metricHint(metric, genre)} Click a cell to open the duel in Versus, step by step.
        {showEquipped && ' Values include the active complements of each class.'}
        {total > MAX_ENTITIES && ` Showing the first ${MAX_ENTITIES} of ${total}; filter by class to see the rest.`}
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
                  <th key={key} scope="col" className={`defender${hover?.column === index ? ' hl' : ''}`} title={displayName(entity)}>
                    <span>{entity.character ?? entity.name}</span>
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
                  <th scope="row" className={`attacker${hover?.row === rowIndex ? ' hl' : ''}`} title={displayName(attacker.entity)}>
                    {attacker.entity.character ?? attacker.entity.name}
                  </th>
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
                    const flipped = hasComplements && ranks && flips(rowIndex, columnIndex);
                    return (
                      <td
                        key={defender.key}
                        className={`cell ${tone} level-${strength(result, metric)}${close ? ' close' : ''}${flipped ? ' flipped' : ''}${crossed}`}
                        onMouseEnter={() => setHover({ row: rowIndex, column: columnIndex })}
                      >
                        <button
                          type="button"
                          className="cell-link"
                          onClick={() => onOpen(attacker.key, defender.key)}
                          onFocus={() => setHover({ row: rowIndex, column: columnIndex })}
                          aria-label={`${displayName(attacker.entity)} against ${displayName(defender.entity)}: ${text}${
                            tone === 'win' ? ', row wins' : tone === 'loss' ? ', row loses' : ''
                          }${flipped ? ', winner changes with complements' : ''}. Open in Versus`}
                          title={[close && 'Close fight', flipped && 'Winner changes with complements'].filter(Boolean).join(' · ') || undefined}
                        >
                          {mark && <span className="cell-mark" aria-hidden="true">{mark}</span>}
                          {text}
                          {flipped && <span className="cell-flip" aria-hidden="true">◆</span>}
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
                <strong>{displayName(defender.entity)}</strong> takes 0 damage from {plural(immuneTo.length, 'attacker')}:{' '}
                {immuneTo.map(({ attacker, reason }) => `${displayName(attacker.entity)} (${reason})`).join('; ')}.
              </li>
            ))}
          </ul>
        )}
      </section>

      {usesMove && ranks && (
        <section className="insight" aria-labelledby="escapes-title">
          <h3 id="escapes-title">Escapes</h3>
          <p className="muted small">Movement does not change who wins: it shows which losers are fast enough to avoid the fight.</p>
          {escapes.length === 0 ? (
            <p className="muted">No loser moves faster than its winner: every fight can be forced.</p>
          ) : (
            <ul className="wall-list">
              {escapes.map(({ winner, loser, winnerMove, loserMove, slight }) => (
                <li key={`${winner.key}-${loser.key}`}>
                  <strong>{displayName(loser.entity)}</strong> loses to {displayName(winner.entity)} but moves {slight ? 'slightly faster' : 'faster'} (move{' '}
                  {formatPercent(loserMove ?? 0)} vs {formatPercent(winnerMove ?? 0)}): it can escape this fight or avoid it.
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

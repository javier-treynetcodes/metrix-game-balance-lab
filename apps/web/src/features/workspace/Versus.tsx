/**
 * @file Versus tab: two entities compared step by step, with what-if changes.
 */

import { useState, type ReactNode } from 'react';
import {
  hitsMargin,
  matchup,
  validateEntity,
  winnerBy,
  type Channel,
  type DamageBreakdown,
  type Entity,
  type HitsToDefeat,
} from '@metrix/core';
import { AttackBadge, channelTone } from '../../components/AttackBadge';
import { StatCode } from '../../components/StatCode';
import { Stepper } from '../../components/Stepper';
import { damageReasons } from '../../lib/explain';
import type { GenreProfile } from '../../lib/genres';
import { capitalize, formatHits, formatSigned, metricName } from '../../lib/metrics';
import { statCode } from '../../lib/codes';
import { attackChoiceOf, attackValue, type CatalogSchema } from '../../lib/schema';
import { entityFields, type Row } from '../../state/catalog';

interface VersusProps {
  /** Catalog rows to pick from. */
  rows: readonly Row[];
  /** The two damage channels of the catalog. */
  channels: readonly Channel[];
  /** Columns available in the imported file; decides which steppers are shown. */
  schema: CatalogSchema;
  /** Genre profile: the metric behind the verdict and the word for one attack. */
  genre: GenreProfile;
  /** Row keys of side A and side B. Both may point to the same row (mirror match). */
  pair: [string, string];
  /** Called when the user picks or swaps entities. */
  onPairChange: (pair: [string, string]) => void;
  /** Saves the what-if drafts, by row key, as one undo step. */
  onApply: (updates: Record<string, Entity>) => void;
}

function hitsCount(result: HitsToDefeat): number | undefined {
  return result.kind === 'defeats' ? result.hits : undefined;
}

/**
 * Head-to-head view of two entities.
 *
 * Shows the verdict for the genre's metric, facing stat bars, every subtraction behind each
 * hit (with bars for blocked and dealt damage), plain-language reasons and all four metrics.
 * The "Try changes" steppers edit local drafts only; "Apply to catalog" saves them as a
 * single undo step after checking them with `validateEntity`.
 */
export function Versus({ rows, channels, schema, genre, pair, onPairChange, onApply }: VersusProps) {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const rowA = byKey.get(pair[0]);
  const rowB = byKey.get(pair[1]);
  // What-if drafts, per row key. They only reach the catalog with Apply.
  const [drafts, setDrafts] = useState<Record<string, Entity>>({});

  if (!rowA || !rowB) return <p className="empty tab-body">Pick two entities to compare.</p>;

  const a = drafts[rowA.key] ?? rowA.entity;
  const b = rowA.key === rowB.key ? a : (drafts[rowB.key] ?? rowB.entity);
  const result = matchup(a, b, channels);
  const metric = genre.primary;
  const winner = winnerBy(result, metric);
  const margin = hitsMargin(result);
  const hit = genre.hit;

  const changedKeys = Object.keys(drafts).filter((key) => {
    const original = byKey.get(key)?.entity;
    return original && JSON.stringify(entityFields(original)) !== JSON.stringify(entityFields(drafts[key] as Entity));
  });
  const problems = changedKeys.flatMap((key) => validateEntity(drafts[key] as Entity, channels));

  const setDraft = (row: Row, next: Entity) => setDrafts((current) => ({ ...current, [row.key]: next }));

  const verdict = (() => {
    const fa = hitsCount(result.forwardHits);
    const fb = hitsCount(result.backwardHits);
    if (metric === 'hits') {
      if (winner === 'none') return { title: 'Neither can defeat the other', detail: 'Both deal 0 damage, or neither has hp.' };
      if (winner === 'draw') return { title: 'Even match', detail: `Both fall after ${fa} ${hit}s.` };
      const [w, l, wh, lh] = winner === 'attacker' ? [a, b, fa, fb] : [b, a, fb, fa];
      const loserText = lh === undefined ? `${l.name} cannot defeat ${w.name}` : `${l.name} needs ${lh}`;
      return { title: `${w.name} is stronger`, detail: `Defeats ${l.name} in ${wh} ${hit}s; ${loserText}.` };
    }
    if (winner === 'none') return { title: 'Neither deals damage', detail: 'Both attacks are fully stopped.' };
    if (winner === 'draw') return { title: 'Even trade', detail: `Both deal ${result.forward.damage} per ${hit}.` };
    const [w, l] = winner === 'attacker' ? [a, b] : [b, a];
    const trade = winner === 'attacker' ? result.trade : -result.trade;
    return { title: `${w.name} is stronger`, detail: `Wins every exchange with ${l.name} by ${formatSigned(trade)} per ${hit}.` };
  })();

  const costLine =
    a.cost !== undefined && b.cost !== undefined && a.cost !== b.cost
      ? `${a.cost > b.cost ? a.name : b.name} costs ${Math.abs(a.cost - b.cost)} more.`
      : a.cost !== undefined && a.cost === b.cost
        ? 'Both cost the same.'
        : null;

  return (
    <div className="tab-body versus">
      <div className="versus-pickers">
        <label className="field">
          <span>Entity A</span>
          <select value={rowA.key} onChange={(event) => onPairChange([event.target.value, rowB.key])}>
            {rows.map((row) => (
              <option key={row.key} value={row.key}>
                {row.entity.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="button swap" onClick={() => onPairChange([rowB.key, rowA.key])} aria-label="Swap A and B">
          ⇄
        </button>
        <label className="field">
          <span>Entity B</span>
          <select value={rowB.key} onChange={(event) => onPairChange([rowA.key, event.target.value])}>
            {rows.map((row) => (
              <option key={row.key} value={row.key}>
                {row.entity.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className={`verdict verdict-${winner}`} aria-live="polite">
        <p className="verdict-metric">{metricName(metric, genre)} · {genre.name}</p>
        <h3>{verdict.title}</h3>
        <p>{verdict.detail}</p>
        <p className="verdict-tags">
          {metric === 'hits' && margin !== undefined && margin !== 0 && (
            <span className="tag">Wins by {Math.abs(margin)} {Math.abs(margin) === 1 ? hit : `${hit}s`}</span>
          )}
          {metric === 'hits' && margin !== undefined && Math.abs(margin) === 1 && <span className="tag tag-warn">Close fight</span>}
          {costLine && <span className="tag">{costLine}</span>}
        </p>
      </section>

      <StatCompare a={a} b={b} channels={channels} schema={schema} />

      <div className="versus-grid">
        {[
          { row: rowA, entity: a, other: b, side: 'A', breakdown: result.forward, hits: result.forwardHits },
          { row: rowB, entity: b, other: a, side: 'B', breakdown: result.backward, hits: result.backwardHits },
        ].map(({ row, entity, other, side, breakdown, hits }) => (
          <section key={side} className="fighter" aria-label={`${side}: ${entity.name}`}>
            <header className="fighter-head">
              <span className={`side${side === 'B' ? ' side-b' : ''}`}>{side}</span>
              <h3>{entity.name}</h3>
              <AttackBadge entity={entity} channels={channels} />
            </header>

            <WhatIf
              entity={entity}
              original={row.entity}
              channels={channels}
              schema={schema}
              onChange={(next) => setDraft(row, next)}
            />

            <Breakdown
              title={`${entity.name} hits ${other.name}`}
              breakdown={breakdown}
              channels={channels}
              hit={hit}
            />
            <p className="hits-line">
              {hits.kind === 'defeats' ? (
                <>
                  <strong>{formatHits(hits, genre)}</strong> of {breakdown.damage} damage to bring {other.name}&apos;s {other.hp} hp
                  to 0.
                </>
              ) : (
                <strong>{hits.kind === 'cannot-damage' ? `Can't damage ${other.name}` : `${other.name} has no hp`}</strong>
              )}
            </p>
            <ul className="reasons">
              {damageReasons(entity.name, other.name, breakdown, channels).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="measures" aria-labelledby="measures-title">
        <h3 id="measures-title">All measures</h3>
        <div className="table-scroll">
        <table className="data-table measures-table">
          <thead>
            <tr>
              <th scope="col">Measure</th>
              <th scope="col" className="num">{a.name} → {b.name}</th>
              <th scope="col" className="num">{b.name} → {a.name}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{metricName('hits', genre)}</th>
              <td className="num">{formatHits(result.forwardHits, genre)}</td>
              <td className="num">{formatHits(result.backwardHits, genre)}</td>
            </tr>
            <tr>
              <th scope="row">{metricName('damage', genre)}</th>
              <td className="num">{result.forward.damage}</td>
              <td className="num">{result.backward.damage}</td>
            </tr>
            <tr>
              <th scope="row">{metricName('blocked', genre)}</th>
              <td className="num">{result.forward.blocked} of {result.forward.attack}</td>
              <td className="num">{result.backward.blocked} of {result.backward.attack}</td>
            </tr>
            <tr>
              <th scope="row">{metricName('trade', genre)}</th>
              <td className="num">{formatSigned(result.trade)}</td>
              <td className="num">{formatSigned(-result.trade)}</td>
            </tr>
          </tbody>
        </table>
        </div>
      </section>

      <div className={`apply-bar${changedKeys.length > 0 ? ' is-sticky' : ''}`}>
        <p className="muted small">
          {changedKeys.length === 0
            ? 'Use − and + to try changes. Nothing reaches your catalog until you apply it.'
            : problems[0]?.message ?? `Trying changes on ${changedKeys.map((key) => byKey.get(key)?.entity.name).join(' and ')}.`}
        </p>
        <div className="button-row">
          <button type="button" className="button button-ghost" disabled={changedKeys.length === 0} onClick={() => setDrafts({})}>
            Reset
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={changedKeys.length === 0 || problems.length > 0}
            onClick={() => {
              onApply(Object.fromEntries(changedKeys.map((key) => [key, drafts[key] as Entity])));
              setDrafts({});
            }}
          >
            Apply to catalog
          </button>
        </div>
      </div>
    </div>
  );
}

/** Facing bars per stat: where the two entities really differ, at a glance. */
function StatCompare({
  a,
  b,
  channels,
  schema,
}: {
  a: Entity;
  b: Entity;
  channels: readonly Channel[];
  schema: CatalogSchema;
}) {
  const stats: { label: ReactNode; key: string; a: number | undefined; b: number | undefined }[] = [];
  if (a.hp !== undefined || b.hp !== undefined) stats.push({ label: 'HP', key: 'hp', a: a.hp, b: b.hp });
  if (a.cost !== undefined || b.cost !== undefined) stats.push({ label: 'Cost', key: 'cost', a: a.cost, b: b.cost });
  stats.push({ label: 'Attack', key: 'attack', a: attackValue(a), b: attackValue(b) });
  for (const key of schema.defChannels) {
    stats.push({
      label: <StatCode kind="def" channels={channels} channelKey={key} />,
      key: `def-${key}`,
      a: a.def[key] ?? 0,
      b: b.def[key] ?? 0,
    });
  }
  for (const key of schema.hybridDefChannels) {
    stats.push({
      label: <StatCode kind="arm" channels={channels} channelKey={key} />,
      key: `arm-${key}`,
      a: a.hybridDef[key] ?? 0,
      b: b.hybridDef[key] ?? 0,
    });
  }

  return (
    <section className="stat-compare" aria-label={`${a.name} and ${b.name} side by side`}>
      <div className="compare-names">
        <span className="side">A</span>
        <span>{a.name}</span>
        <span className="compare-spacer" />
        <span>{b.name}</span>
        <span className="side side-b">B</span>
      </div>
      {stats.map((stat) => {
        const top = Math.max(stat.a ?? 0, stat.b ?? 0, 1);
        const leader = (stat.a ?? 0) === (stat.b ?? 0) ? 'none' : (stat.a ?? 0) > (stat.b ?? 0) ? 'a' : 'b';
        return (
          <div key={stat.key} className="compare-row">
            <span className={`compare-value${leader === 'a' ? ' is-lead' : ''}`}>{stat.a ?? '—'}</span>
            <span className="compare-bar side-a">
              <span style={{ width: `${((stat.a ?? 0) / top) * 100}%` }} />
            </span>
            <span className="compare-label">{stat.label}</span>
            <span className="compare-bar side-b">
              <span style={{ width: `${((stat.b ?? 0) / top) * 100}%` }} />
            </span>
            <span className={`compare-value${leader === 'b' ? ' is-lead' : ''}`}>{stat.b ?? '—'}</span>
          </div>
        );
      })}
    </section>
  );
}

function Breakdown({
  title,
  breakdown,
  channels,
  hit,
}: {
  title: string;
  breakdown: DamageBreakdown;
  channels: readonly Channel[];
  hit: string;
}) {
  // Bars share one scale so rows can be compared at a glance.
  const scale = Math.max(...breakdown.rows.map((row) => row.attack), 1);
  return (
    <div className="breakdown">
      <p className="breakdown-title">{title}</p>
      {breakdown.rows.length === 0 && <p className="muted">No attack.</p>}
      <ul className="damage-rows">
        {breakdown.rows.map((row) => {
          const blocked = row.attack - row.damage;
          const tone = row.source === 'hybrid' ? 'hybrid' : channelTone(channels, row.channel);
          return (
            <li key={`${row.source}-${row.channel}`} className="damage-row">
              <div className="damage-line">
                <StatCode kind={row.source === 'hybrid' ? 'hyb' : 'atk'} channels={channels} channelKey={row.channel} />
                <span className="expression">
                  {row.attack} − <StatCode kind="def" channels={channels} channelKey={row.channel} /> {row.defense}
                  {row.hybridDefense > 0 && (
                    <>
                      {' '}
                      − <StatCode kind="arm" channels={channels} channelKey={row.channel} /> {row.hybridDefense}
                    </>
                  )}{' '}
                  = <strong>{row.damage}</strong>
                </span>
                {row.fullDamage && <span className="tag tag-warn">full damage</span>}
              </div>
              <div
                className="damage-bar"
                role="img"
                aria-label={`${row.attack} attack: ${blocked} blocked, ${row.damage} damage`}
              >
                {blocked > 0 && <span className="bar-blocked" style={{ width: `${(blocked / scale) * 100}%` }} />}
                {row.damage > 0 && <span className={`bar-damage tone-${tone}`} style={{ width: `${(row.damage / scale) * 100}%` }} />}
              </div>
              <p className="bar-legend">
                {blocked > 0 ? `${blocked} blocked` : 'nothing blocked'} · {row.damage} damage
              </p>
            </li>
          );
        })}
      </ul>
      <p className="damage-total">
        Per {hit}:{' '}
        {breakdown.rows.length > 1 ? `${breakdown.rows.map((row) => row.damage).join(' + ')} = ` : ''}
        <strong>{breakdown.damage}</strong>
      </p>
    </div>
  );
}

function WhatIf({
  entity,
  original,
  channels,
  schema,
  onChange,
}: {
  entity: Entity;
  original: Entity;
  channels: readonly Channel[];
  schema: CatalogSchema;
  onChange: (next: Entity) => void;
}) {
  const choice = attackChoiceOf(entity);
  const steppers: { label: string; value: number; was: number | undefined; min?: number; set: (value: number) => Entity }[] = [];
  if (entity.hp !== undefined) {
    steppers.push({ label: 'HP', value: entity.hp, was: original.hp, min: 1, set: (hp) => ({ ...entity, hp }) });
  }
  if (choice.startsWith('ch:')) {
    const key = choice.slice(3);
    steppers.push({
      label: statCode('atk', channels, key),
      value: entity.atk[key] ?? 0,
      was: original.atk[key],
      set: (value) => ({ ...entity, atk: { ...entity.atk, [key]: value } }),
    });
  }
  if (entity.hybridAtk) {
    for (const { key } of channels) {
      steppers.push({
        label: statCode('hyb', channels, key),
        value: entity.hybridAtk[key] ?? 0,
        was: original.hybridAtk?.[key],
        set: (value) => ({ ...entity, hybridAtk: { ...entity.hybridAtk, [key]: value } }),
      });
    }
  }
  for (const key of schema.defChannels) {
    steppers.push({
      label: statCode('def', channels, key),
      value: entity.def[key] ?? 0,
      was: original.def[key] ?? 0,
      set: (value) => ({ ...entity, def: { ...entity.def, [key]: value } }),
    });
  }
  for (const key of schema.hybridDefChannels) {
    steppers.push({
      label: statCode('arm', channels, key),
      value: entity.hybridDef[key] ?? 0,
      was: original.hybridDef[key] ?? 0,
      set: (value) => ({ ...entity, hybridDef: { ...entity.hybridDef, [key]: value } }),
    });
  }

  return (
    <details className="what-if">
      <summary>{capitalize('try changes')}</summary>
      <div className="stepper-grid">
        {steppers.map(({ label, value, was, min, set }) => (
          <Stepper
            key={label}
            label={label}
            value={value}
            changed={value !== (was ?? 0)}
            {...(min !== undefined ? { min } : {})}
            onChange={(next) => onChange(set(next))}
          />
        ))}
      </div>
    </details>
  );
}

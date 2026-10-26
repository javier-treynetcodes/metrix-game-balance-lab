import { useState } from 'react';
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
import { AttackBadge, ChannelDot } from '../../components/AttackBadge';
import { Stepper } from '../../components/Stepper';
import { damageReasons, rowExpression } from '../../lib/explain';
import type { GenreProfile } from '../../lib/genres';
import { capitalize, formatHits, formatSigned, metricName } from '../../lib/metrics';
import { attackChoiceOf, channelLabel, type CatalogSchema } from '../../lib/schema';
import { entityFields, type Row } from '../../state/catalog';

interface VersusProps {
  rows: readonly Row[];
  channels: readonly Channel[];
  schema: CatalogSchema;
  genre: GenreProfile;
  pair: [string, string];
  onPairChange: (pair: [string, string]) => void;
  onApply: (updates: Record<string, Entity>) => void;
}

function hitsCount(result: HitsToDefeat): number | undefined {
  return result.kind === 'defeats' ? result.hits : undefined;
}

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

      <div className="versus-grid">
        {[
          { row: rowA, entity: a, other: b, side: 'A', breakdown: result.forward, hits: result.forwardHits },
          { row: rowB, entity: b, other: a, side: 'B', breakdown: result.backward, hits: result.backwardHits },
        ].map(({ row, entity, other, side, breakdown, hits }) => (
          <section key={side} className="fighter" aria-label={`${side}: ${entity.name}`}>
            <header className="fighter-head">
              <span className="side">{side}</span>
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

      <div className="apply-bar">
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
  return (
    <table className="breakdown">
      <caption>{title}</caption>
      <tbody>
        {breakdown.rows.length === 0 && (
          <tr>
            <td colSpan={3} className="muted">No attack.</td>
          </tr>
        )}
        {breakdown.rows.map((row) => (
          <tr key={`${row.source}-${row.channel}`}>
            <th scope="row">
              <ChannelDot channels={channels} channelKey={row.channel} /> {channelLabel(channels, row.channel)}
              {row.source === 'hybrid' && <span className="muted"> (hybrid)</span>}
            </th>
            <td>{rowExpression(row)}</td>
            <td>{row.fullDamage && <span className="tag tag-warn">full damage</span>}</td>
          </tr>
        ))}
        <tr className="total">
          <th scope="row">Per {hit}</th>
          <td>
            {breakdown.rows.length > 1 ? `${breakdown.rows.map((row) => row.damage).join(' + ')} = ` : ''}
            <strong>{breakdown.damage}</strong>
          </td>
          <td />
        </tr>
      </tbody>
    </table>
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
      label: `${channelLabel(channels, key)} attack`,
      value: entity.atk[key] ?? 0,
      was: original.atk[key],
      set: (value) => ({ ...entity, atk: { ...entity.atk, [key]: value } }),
    });
  }
  if (entity.hybridAtk) {
    for (const { key, label } of channels) {
      steppers.push({
        label: `Hybrid ${label} attack`,
        value: entity.hybridAtk[key] ?? 0,
        was: original.hybridAtk?.[key],
        set: (value) => ({ ...entity, hybridAtk: { ...entity.hybridAtk, [key]: value } }),
      });
    }
  }
  for (const key of schema.defChannels) {
    steppers.push({
      label: `${channelLabel(channels, key)} defense`,
      value: entity.def[key] ?? 0,
      was: original.def[key] ?? 0,
      set: (value) => ({ ...entity, def: { ...entity.def, [key]: value } }),
    });
  }
  for (const key of schema.hybridDefChannels) {
    steppers.push({
      label: `Hybrid armor ${channelLabel(channels, key)}`,
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

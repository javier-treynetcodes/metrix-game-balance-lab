/**
 * @file Versus tab: two entities compared step by step, with what-if changes.
 */

import { useState, type ReactNode } from 'react';
import {
  complementsFor,
  hitsMargin,
  matchup,
  validateEntity,
  winnerBy,
  withComplements,
  type ArmorCoverage,
  type Channel,
  type Complement,
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
import { attackValue, displayName, type CatalogSchema } from '../../lib/schema';
import { entityFields, type Row } from '../../state/catalog';

interface VersusProps {
  /** Catalog rows to pick from. */
  rows: readonly Row[];
  /** The two damage channels of the catalog. */
  channels: readonly Channel[];
  /** How much of each channel every armor stops. */
  coverage: ArmorCoverage;
  /** Active complements; each side can add those of its class. */
  complements: readonly Complement[];
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

/** One complement's bonus on one stat, to show where an equipped value comes from. */
interface Bonus {
  name: string;
  value: number;
}

/** Bonuses that the complements add to a stat (`atk` or `def`) on a channel, by complement name. */
function bonusesOf(applied: readonly Complement[], kind: 'atk' | 'def', channel: string): Bonus[] {
  return applied.flatMap((complement) => {
    const value = complement[kind][channel] ?? 0;
    return value > 0 ? [{ name: complement.name, value }] : [];
  });
}

/** "26 + 4 Twin Blade": a base value and the bonuses that make up an equipped value. */
function BonusSum({ base, bonuses }: { base: number; bonuses: readonly Bonus[] }) {
  if (bonuses.length === 0) return <>{base}</>;
  return (
    <span className="bonus-sum">
      ({base}
      {bonuses.map(({ name, value }) => (
        <span key={name} className="bonus">
          {' '}
          + {value} <span className="bonus-name">{name}</span>
        </span>
      ))}
      )
    </span>
  );
}

/** Everything one side of the duel brings: base values, equipped values and the complements used. */
interface Side {
  base: Entity;
  fighter: Entity;
  applied: Complement[];
}

function sideOf(base: Entity, complements: readonly Complement[], equipped: boolean): Side {
  const applied = equipped ? complementsFor(base, complements) : [];
  return { base, fighter: equipped ? withComplements(base, applied) : base, applied };
}

/**
 * Head-to-head view of two entities.
 *
 * Shows the verdict for the genre's metric, facing stat bars, every subtraction behind each
 * hit (with bars for blocked and dealt damage), plain-language reasons and all four metrics.
 * Each side can fight with its base values or with the active complements of its class; the
 * breakdown names every bonus. The "Try changes" steppers edit base values in local drafts
 * only; "Apply to catalog" saves them as a single undo step after checking them.
 */
export function Versus({ rows, channels, coverage, complements, schema, genre, pair, onPairChange, onApply }: VersusProps) {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const rowA = byKey.get(pair[0]);
  const rowB = byKey.get(pair[1]);
  // What-if drafts, per row key. They only reach the catalog with Apply.
  const [drafts, setDrafts] = useState<Record<string, Entity>>({});
  // Whether each side fights with its class's complements.
  const [equipped, setEquipped] = useState<[boolean, boolean]>([false, false]);

  if (!rowA || !rowB) return <p className="empty tab-body">Pick two entities to compare.</p>;

  const baseA = drafts[rowA.key] ?? rowA.entity;
  const baseB = rowA.key === rowB.key ? baseA : (drafts[rowB.key] ?? rowB.entity);
  const sideA = sideOf(baseA, complements, equipped[0]);
  const sideB = sideOf(baseB, complements, equipped[1]);
  const a = sideA.fighter;
  const b = sideB.fighter;
  const nameA = displayName(a);
  const nameB = displayName(b);
  const result = matchup(a, b, channels, coverage);
  const metric = genre.primary;
  const winner = winnerBy(result, metric);
  const margin = hitsMargin(result);
  const hit = genre.hit;

  const changedKeys = Object.keys(drafts).filter((key) => {
    const original = byKey.get(key)?.entity;
    return original && JSON.stringify(entityFields(original)) !== JSON.stringify(entityFields(drafts[key] as Entity));
  });
  const problems = changedKeys.flatMap((key) => validateEntity(drafts[key] as Entity));

  const setDraft = (row: Row, next: Entity) => setDrafts((current) => ({ ...current, [row.key]: next }));

  const verdict = (() => {
    const fa = hitsCount(result.forwardHits);
    const fb = hitsCount(result.backwardHits);
    if (metric === 'hits') {
      if (winner === 'none') return { title: 'Neither can defeat the other', detail: 'Both deal 0 damage, or neither has hp.' };
      if (winner === 'draw') return { title: 'Even match', detail: `Both fall after ${fa} ${hit}s.` };
      const [w, l, wh, lh] = winner === 'attacker' ? [nameA, nameB, fa, fb] : [nameB, nameA, fb, fa];
      const loserText = lh === undefined ? `${l} cannot defeat ${w}` : `${l} needs ${lh}`;
      return { title: `${w} is stronger`, detail: `Defeats ${l} in ${wh} ${hit}s; ${loserText}.` };
    }
    if (winner === 'none') return { title: 'Neither deals damage', detail: 'Both attacks are fully stopped.' };
    if (winner === 'draw') return { title: 'Even trade', detail: `Both deal ${result.forward.damage} per ${hit}.` };
    const [w, l] = winner === 'attacker' ? [nameA, nameB] : [nameB, nameA];
    const trade = winner === 'attacker' ? result.trade : -result.trade;
    return { title: `${w} is stronger`, detail: `Wins every exchange with ${l} by ${formatSigned(trade)} per ${hit}.` };
  })();

  const costLine =
    a.cost !== undefined && b.cost !== undefined && a.cost !== b.cost
      ? `${a.cost > b.cost ? nameA : nameB} costs ${Math.abs(a.cost - b.cost)} more.`
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
                {displayName(row.entity)}
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
                {displayName(row.entity)}
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

      <StatCompare a={a} b={b} nameA={nameA} nameB={nameB} channels={channels} schema={schema} />

      <div className="versus-grid">
        {[
          { index: 0, row: rowA, own: sideA, rival: sideB, side: 'A', breakdown: result.forward, hits: result.forwardHits },
          { index: 1, row: rowB, own: sideB, rival: sideA, side: 'B', breakdown: result.backward, hits: result.backwardHits },
        ].map(({ index, row, own, rival, side, breakdown, hits }) => {
          const name = displayName(own.fighter);
          const otherName = displayName(rival.fighter);
          const available = complementsFor(own.base, complements);
          return (
            <section key={side} className="fighter" aria-label={`${side}: ${name}`}>
              <header className="fighter-head">
                <span className={`side${side === 'B' ? ' side-b' : ''}`}>{side}</span>
                <h3>{name}</h3>
                <AttackBadge entity={own.fighter} channels={channels} />
              </header>

              {available.length > 0 && (
                <div className="loadout">
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={equipped[index] ?? false}
                      onChange={(event) =>
                        setEquipped((current) => (index === 0 ? [event.target.checked, current[1]] : [current[0], event.target.checked]))
                      }
                    />
                    With complements
                  </label>
                  <p className="muted small">
                    {own.base.class}: {available.map((complement) => complement.name).join(', ')}
                  </p>
                </div>
              )}

              <WhatIf
                entity={own.base}
                original={row.entity}
                channels={channels}
                schema={schema}
                onChange={(next) => setDraft(row, next)}
              />

              <Breakdown
                title={`${name} hits ${otherName}`}
                breakdown={breakdown}
                channels={channels}
                attacker={own}
                defender={rival}
                hit={hit}
              />
              <p className="hits-line">
                {hits.kind === 'defeats' ? (
                  <>
                    <strong>{formatHits(hits, genre)}</strong> of {breakdown.damage} damage to bring {otherName}&apos;s{' '}
                    {rival.fighter.hp} hp to 0.
                  </>
                ) : (
                  <strong>{hits.kind === 'cannot-damage' ? `Can't damage ${otherName}` : `${otherName} has no hp`}</strong>
                )}
              </p>
              <ul className="reasons">
                {damageReasons(name, otherName, breakdown, channels).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <section className="measures" aria-labelledby="measures-title">
        <h3 id="measures-title">All measures</h3>
        <div className="table-scroll">
        <table className="data-table measures-table">
          <thead>
            <tr>
              <th scope="col">Measure</th>
              <th scope="col" className="num">{nameA} → {nameB}</th>
              <th scope="col" className="num">{nameB} → {nameA}</th>
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
            : problems[0]?.message ??
              `Trying changes on ${changedKeys.map((key) => displayName(byKey.get(key)?.entity as Entity)).join(' and ')}.`}
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
  nameA,
  nameB,
  channels,
  schema,
}: {
  a: Entity;
  b: Entity;
  nameA: string;
  nameB: string;
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

  return (
    <section className="stat-compare" aria-label={`${nameA} and ${nameB} side by side`}>
      <div className="compare-names">
        <span className="side">A</span>
        <span>{nameA}</span>
        <span className="compare-spacer" />
        <span>{nameB}</span>
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

/**
 * Every subtraction of one hit: attack on each channel minus the armor that covers it.
 * Equipped values show their base and the bonus of each complement by name, and armors
 * that stop only part of a channel show their percentage.
 */
function Breakdown({
  title,
  breakdown,
  channels,
  attacker,
  defender,
  hit,
}: {
  title: string;
  breakdown: DamageBreakdown;
  channels: readonly Channel[];
  attacker: Side;
  defender: Side;
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
          const tone = channelTone(channels, row.channel);
          const attackBonuses = bonusesOf(attacker.applied, 'atk', row.channel);
          const combined = row.armor.length > 1 || row.armor.some(({ percent }) => percent !== 100);
          return (
            <li key={row.channel} className="damage-row">
              <div className="damage-line">
                <StatCode kind="atk" channels={channels} channelKey={row.channel} />
                <span className="expression">
                  {row.attack}
                  {attackBonuses.length > 0 && (
                    <>
                      {' '}
                      <BonusSum base={attacker.base.atk[row.channel] ?? 0} bonuses={attackBonuses} />
                    </>
                  )}{' '}
                  −{' '}
                  {row.armor.length === 0 && <span className="muted">no armor covers it</span>}
                  {combined && '('}
                  {row.armor.map(({ armor, value, percent }, index) => {
                    const armorBonuses = bonusesOf(defender.applied, 'def', armor);
                    return (
                      <span key={armor}>
                        {index > 0 && ' + '}
                        <StatCode kind="def" channels={channels} channelKey={armor} /> {value}
                        {armorBonuses.length > 0 && (
                          <>
                            {' '}
                            <BonusSum base={defender.base.def[armor] ?? 0} bonuses={armorBonuses} />
                          </>
                        )}
                        {percent !== 100 && ` × ${percent} %`}
                      </span>
                    );
                  })}
                  {combined && `) = ${row.defense}`} = <strong>{row.damage}</strong>
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
      {breakdown.rows.some(({ armor }) => armor.some(({ percent }) => percent !== 100)) && (
        <p className="muted small">Armor shares are set in Damage rules and rounded down.</p>
      )}
    </div>
  );
}

/** - and + steppers on the base values of one side. Drafts stay local until applied. */
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
  const steppers: { label: string; value: number; was: number | undefined; min?: number; set: (value: number) => Entity }[] = [];
  if (entity.hp !== undefined) {
    steppers.push({ label: 'HP', value: entity.hp, was: original.hp, min: 1, set: (hp) => ({ ...entity, hp }) });
  }
  for (const key of schema.atkChannels) {
    steppers.push({
      label: statCode('atk', channels, key),
      value: entity.atk[key] ?? 0,
      was: original.atk[key] ?? 0,
      set: (value) => ({ ...entity, atk: { ...entity.atk, [key]: value } }),
    });
  }
  for (const key of schema.defChannels) {
    steppers.push({
      label: statCode('def', channels, key),
      value: entity.def[key] ?? 0,
      was: original.def[key] ?? 0,
      set: (value) => ({ ...entity, def: { ...entity.def, [key]: value } }),
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

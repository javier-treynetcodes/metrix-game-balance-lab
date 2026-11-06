/**
 * @file Damage rules tab: how damage works, armor coverage, channel names and exposure warnings.
 */

import { useState } from 'react';
import {
  armorAgainst,
  coverageValue,
  isCoveragePercent,
  isDefaultCoverage,
  type ArmorCoverage,
  type Channel,
  type Entity,
} from '@metrix/core';
import { ChannelDot } from '../../components/AttackBadge';
import { StatCode } from '../../components/StatCode';
import { HowDamageWorks } from '../../components/HowDamageWorks';
import { statCode } from '../../lib/codes';
import { plural } from '../../lib/format';
import { withKey } from '../../lib/record';
import { displayName } from '../../lib/schema';

interface DamageRulesProps {
  /** The two damage channels of the catalog. */
  channels: readonly Channel[];
  /** How much of each channel every armor stops, as edited so far. */
  coverage: ArmorCoverage;
  /** Coverage values changed since import, as `armor>attack` keys, to highlight them. */
  changedCoverage: ReadonlySet<string>;
  /** Every entity, to find who attacks on each channel and who has no armor against it. */
  entities: readonly Entity[];
  /** Renames a channel; the new name is used in the app and in exported column names. */
  onRename: (key: string, label: string) => void;
  /** Sets the share of `attackKey` that the armor of `armorKey` stops; one undo step. */
  onSetCoverage: (armorKey: string, attackKey: string, percent: number) => void;
  /** Goes back to the default coverage; one undo step. */
  onResetCoverage: () => void;
}

/** Entities that some attack in the catalog hits in full on this channel: no armor covers it. */
function exposure(channel: Channel, channels: readonly Channel[], coverage: ArmorCoverage, entities: readonly Entity[]) {
  const attackers = entities.filter((entity) => (entity.atk[channel.key] ?? 0) > 0);
  const exposed =
    attackers.length > 0
      ? entities.filter((entity) => armorAgainst(entity, channel.key, channels, coverage).total === 0)
      : [];
  return { attackers: attackers.length, exposed };
}

/**
 * "Damage rules" tab: how damage works, the armor coverage table, the channel names and,
 * per channel, which entities some attack in the catalog hits in full.
 */
export function DamageRules({
  channels,
  coverage,
  changedCoverage,
  entities,
  onRename,
  onSetCoverage,
  onResetCoverage,
}: DamageRulesProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  return (
    <div className="tab-body">
      <HowDamageWorks
        channels={channels}
        open
        usesSpeed={entities.some((entity) => entity.speed !== undefined)}
        usesMove={entities.some((entity) => entity.move !== undefined)}
      />

      <CoverageTable
        channels={channels}
        coverage={coverage}
        changed={changedCoverage}
        onSet={onSetCoverage}
        onReset={onResetCoverage}
      />

      <h3 className="section-title">Your channels</h3>
      <p className="muted small intro">
        Name each channel after your game: physical, magic, kinetic… ATK 1 and DEF 1 then read ATK Physical and DEF
        Physical across the app, and the CSV you export uses the new name.
      </p>
      <div className="channel-grid">
        {channels.map((channel) => {
          const { attackers, exposed } = exposure(channel, channels, coverage, entities);
          const draft = drafts[channel.key] ?? channel.label;
          return (
            <section key={channel.key} className="channel-card" aria-label={channel.label}>
              <label className="field">
                <span>
                  <ChannelDot channels={channels} channelKey={channel.key} /> Channel name
                </span>
                <input
                  type="text"
                  value={draft}
                  onChange={(event) => setDrafts((current) => ({ ...current, [channel.key]: event.target.value }))}
                  onBlur={() => {
                    const label = draft.trim();
                    if (label !== '' && label !== channel.label) onRename(channel.key, label);
                    setDrafts((current) => withKey(current, channel.key, undefined));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                  }}
                />
              </label>
              <p className="formula">
                <span className="muted">Damage =</span> <StatCode kind="atk" channels={channels} channelKey={channel.key} /> −
                armor against it
              </p>
              <p className="muted small">{plural(attackers, 'entity attacks', 'entities attack')} on this channel.</p>
              {exposed.length > 0 ? (
                <details className="exposure">
                  <summary>
                    {plural(exposed.length, 'entity has', 'entities have')} no armor against{' '}
                    <StatCode kind="atk" channels={channels} channelKey={channel.key} />: it hits them in full.
                  </summary>
                  <p className="name-list">{exposed.map(displayName).join(', ')}</p>
                </details>
              ) : (
                attackers > 0 && (
                  <p className="ok small">
                    Every entity has some armor against <StatCode kind="atk" channels={channels} channelKey={channel.key} />.
                  </p>
                )
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Armor coverage as a small table: one row per armor (DEF), one column per attack (ATK).
 * Each cell is the whole percentage of that attack the armor stops. Values are checked
 * before saving and every change is one undo step.
 */
function CoverageTable({
  channels,
  coverage,
  changed,
  onSet,
  onReset,
}: {
  channels: readonly Channel[];
  coverage: ArmorCoverage;
  changed: ReadonlySet<string>;
  onSet: (armorKey: string, attackKey: string, percent: number) => void;
  onReset: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const isDefault = isDefaultCoverage(channels, coverage);

  const commit = (armorKey: string, attackKey: string) => {
    const id = `${armorKey}>${attackKey}`;
    const text = drafts[id];
    if (text === undefined) return;
    const value = Number(text.trim());
    if (text.trim() === '' || !isCoveragePercent(value)) {
      setError('Write a whole percentage from 0 to 100.');
      return;
    }
    setError('');
    if (value !== coverageValue(coverage, armorKey, attackKey)) onSet(armorKey, attackKey, value);
    setDrafts((current) => withKey(current, id, undefined));
  };

  const resetDefault = () => {
    onReset();
    setDrafts({});
    setError('');
  };

  return (
    <section className="coverage" aria-labelledby="coverage-title">
      <h3 id="coverage-title" className="section-title">
        Armor coverage
      </h3>
      <p className="muted small intro">
        How much of each attack every armor stops. By default each armor stops all of its own channel and nothing of the
        other one. Set, for example, that {statCode('def', channels, channels[0]?.key ?? '')} also stops 20 % of{' '}
        {statCode('atk', channels, channels[1]?.key ?? '')}. The armor is added up and rounded down, and the CSV you export
        keeps these values in two rule rows.
      </p>
      <div className="table-scroll">
        <table className="data-table coverage-table">
          <thead>
            <tr>
              <th scope="col">Armor stops…</th>
              {channels.map((attack) => (
                <th key={attack.key} scope="col" className="num">
                  <StatCode kind="atk" channels={channels} channelKey={attack.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {channels.map((armor) => (
              <tr key={armor.key}>
                <th scope="row">
                  <StatCode kind="def" channels={channels} channelKey={armor.key} />
                </th>
                {channels.map((attack) => {
                  const id = `${armor.key}>${attack.key}`;
                  const value = coverageValue(coverage, armor.key, attack.key);
                  return (
                    <td key={attack.key} className={`num${changed.has(id) ? ' is-changed' : ''}`}>
                      <label className="percent-field">
                        <span className="visually-hidden">
                          Share of {statCode('atk', channels, attack.key)} that {statCode('def', channels, armor.key)} stops
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={drafts[id] ?? String(value)}
                          onChange={(event) => setDrafts((current) => ({ ...current, [id]: event.target.value }))}
                          onBlur={() => commit(armor.key, attack.key)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') event.currentTarget.blur();
                          }}
                        />
                        <span aria-hidden="true">%</span>
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="notice" role="status" aria-live="polite">
        {error}
      </p>
      {!isDefault && (
        <button type="button" className="button button-ghost" onClick={resetDefault}>
          Back to default coverage
        </button>
      )}
    </section>
  );
}

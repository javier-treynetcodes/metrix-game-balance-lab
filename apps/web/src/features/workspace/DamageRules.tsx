import { useState } from 'react';
import type { Channel, Entity } from '@metrix/core';
import { ChannelDot } from '../../components/AttackBadge';
import { StatCode } from '../../components/StatCode';
import { HowDamageWorks } from '../../components/HowDamageWorks';
import { plural } from '../../lib/format';
import { withKey } from '../../lib/record';

interface DamageRulesProps {
  channels: readonly Channel[];
  entities: readonly Entity[];
  onRename: (key: string, label: string) => void;
}

/** Entities that some attack in the catalog hits in full on this channel. */
function exposure(channel: Channel, entities: readonly Entity[]) {
  const singleAttackers = entities.filter((entity) => !entity.hybridAtk && (entity.atk[channel.key] ?? 0) > 0);
  const hybridAttackers = entities.filter((entity) => (entity.hybridAtk?.[channel.key] ?? 0) > 0);
  const noDefense = entities.filter((entity) => (entity.def[channel.key] ?? 0) === 0);
  return {
    attackers: singleAttackers.length + hybridAttackers.length,
    exposed: singleAttackers.length > 0 ? noDefense : [],
    exposedToHybrid:
      hybridAttackers.length > 0 ? noDefense.filter((entity) => (entity.hybridDef[channel.key] ?? 0) === 0) : [],
  };
}

function NameList({ entities }: { entities: readonly Entity[] }) {
  return <p className="name-list">{entities.map((entity) => entity.name).join(', ')}</p>;
}

export function DamageRules({ channels, entities, onRename }: DamageRulesProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const withHybridArmor = entities.filter((entity) => Object.values(entity.hybridDef).some((value) => value > 0));
  const hybridAttackers = entities.filter((entity) => entity.hybridAtk);

  return (
    <div className="tab-body">
      <HowDamageWorks channels={channels} open />

      <h3 className="section-title">Your channels</h3>
      <p className="muted small intro">
        Name each channel after your game: physical, magic, kinetic… ATK 1 and DEF 1 then read ATK Physical and DEF
        Physical across the app, and the CSV you export uses the new name.
      </p>
      <div className="channel-grid">
        {channels.map((channel) => {
          const { attackers, exposed, exposedToHybrid } = exposure(channel, entities);
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
                <span className="muted">Damage =</span> <StatCode kind="atk" channels={channels} channelKey={channel.key} /> −{' '}
                <StatCode kind="def" channels={channels} channelKey={channel.key} />
              </p>
              <p className="muted small">{plural(attackers, 'entity attacks', 'entities attack')} on this channel.</p>
              {exposed.length > 0 && (
                <details className="exposure">
                  <summary>
                    {plural(exposed.length, 'entity has', 'entities have')} no{' '}
                    <StatCode kind="def" channels={channels} channelKey={channel.key} />: every{' '}
                    <StatCode kind="atk" channels={channels} channelKey={channel.key} /> hits them in full.
                  </summary>
                  <NameList entities={exposed} />
                </details>
              )}
              {exposedToHybrid.length > 0 && (
                <details className="exposure">
                  <summary>
                    {plural(exposedToHybrid.length, 'entity has', 'entities have')} neither{' '}
                    <StatCode kind="def" channels={channels} channelKey={channel.key} /> nor{' '}
                    <StatCode kind="arm" channels={channels} channelKey={channel.key} />: every{' '}
                    <StatCode kind="hyb" channels={channels} channelKey={channel.key} /> hits them in full.
                  </summary>
                  <NameList entities={exposedToHybrid} />
                </details>
              )}
              {attackers > 0 && exposed.length === 0 && exposedToHybrid.length === 0 && (
                <p className="ok small">
                  Every entity has some <StatCode kind="def" channels={channels} channelKey={channel.key} />.
                </p>
              )}
            </section>
          );
        })}
        <section className="channel-card hybrid-card" aria-label="Hybrid">
          <p className="field-title">
            <span className="dot tone-hybrid" aria-hidden="true" /> Hybrid
          </p>
          <p className="formula">
            <span className="muted">Damage =</span> (
            {channels.map((channel, index) => (
              <span key={channel.key}>
                {index > 0 && ') + ('}
                <StatCode kind="hyb" channels={channels} channelKey={channel.key} /> −{' '}
                <StatCode kind="def" channels={channels} channelKey={channel.key} /> −{' '}
                <StatCode kind="arm" channels={channels} channelKey={channel.key} />
              </span>
            ))}
            )
          </p>
          <p className="muted small">
            {plural(hybridAttackers.length, 'hybrid attacker')} · {plural(withHybridArmor.length, 'entity', 'entities')} with
            hybrid armor.
          </p>
          <p className="muted small">
            ARM (hybrid armor) only works against hybrid attacks, on top of DEF.
          </p>
        </section>
      </div>
    </div>
  );
}

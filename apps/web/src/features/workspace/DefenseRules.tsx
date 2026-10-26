import type { Channel, Entity, Mitigation } from '@metrix/core';
import type { ChannelPatch } from '../../state/useCatalog';

const RULES: Record<Mitigation, { name: string; formula: string; typical: string }> = {
  percent: { name: 'Percent', formula: 'attack × 100 / (100 + defense)', typical: 'MOBAs, action RPGs' },
  subtractive: { name: 'Subtractive', formula: 'attack − defense, never below the minimum', typical: 'Card games, classic RPGs' },
  ratio: { name: 'Ratio', formula: 'attack × attack / defense (defense of at least 1)', typical: 'Turn-based RPGs' },
  none: { name: 'None', formula: 'attack (defense is ignored)', typical: 'True damage' },
};

const MITIGATIONS = Object.keys(RULES) as Mitigation[];

interface DefenseRulesProps {
  channels: readonly Channel[];
  entities: readonly Entity[];
  onChange: (key: string, patch: ChannelPatch) => void;
}

export function DefenseRules({ channels, entities, onChange }: DefenseRulesProps) {
  if (channels.length === 0) {
    return (
      <div className="tab-body">
        <p className="empty">
          This catalog has no damage channels. Add <code>atk:</code> and <code>def:</code> columns to your CSV to compare
          entities in duels.
        </p>
      </div>
    );
  }

  return (
    <div className="tab-body">
      <p className="muted intro">
        Pick the rule your game uses to reduce damage on each channel. Duels update instantly. Renaming a channel only changes
        how it is shown here; your CSV keeps its column names.
      </p>
      <div className="channel-grid">
        {channels.map((channel) => {
          const attackers = entities.filter((entity) => (entity.atk[channel.key] ?? 0) > 0).length;
          const defenders = entities.filter((entity) => (entity.def[channel.key] ?? 0) > 0).length;
          const rule = RULES[channel.mitigation];
          return (
            <fieldset key={channel.key} className="channel-card">
              <legend>
                Channel <code>{channel.key}</code>
              </legend>
              <label className="field">
                <span>Display name</span>
                <input
                  type="text"
                  value={channel.label}
                  onChange={(event) => onChange(channel.key, { label: event.target.value })}
                  onBlur={(event) => {
                    if (event.target.value.trim() === '') onChange(channel.key, { label: channel.key });
                  }}
                />
              </label>
              <label className="field">
                <span>Defense rule</span>
                <select
                  value={channel.mitigation}
                  onChange={(event) => onChange(channel.key, { mitigation: event.target.value as Mitigation })}
                >
                  {MITIGATIONS.map((mitigation) => (
                    <option key={mitigation} value={mitigation}>
                      {RULES[mitigation].name}
                    </option>
                  ))}
                </select>
              </label>
              {channel.mitigation === 'subtractive' && (
                <label className="field">
                  <span>Minimum damage per hit</span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={channel.minDamage ?? 0}
                    onChange={(event) => {
                      const value = event.target.valueAsNumber;
                      onChange(channel.key, { minDamage: Number.isFinite(value) && value > 0 ? value : undefined });
                    }}
                  />
                </label>
              )}
              <p className="formula">
                <span className="muted">Damage =</span> {rule.formula}
                <span className="formula-typical">Typical in {rule.typical}</span>
              </p>
              <p className="muted small">
                {attackers} {attackers === 1 ? 'entity attacks' : 'entities attack'} · {defenders}{' '}
                {defenders === 1 ? 'entity defends' : 'entities defend'} on this channel
              </p>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}

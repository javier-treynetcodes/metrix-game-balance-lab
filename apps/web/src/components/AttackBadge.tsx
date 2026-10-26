import { attackType, type Channel, type Entity } from '@metrix/core';
import { attackChoiceLabel, attackChoiceOf } from '../lib/schema';

/** Color slot of a channel: the first is cyan, the second violet, hybrid uses both. */
export function channelTone(channels: readonly Channel[], key: string): 'one' | 'two' {
  return channels.findIndex((channel) => channel.key === key) === 1 ? 'two' : 'one';
}

export function ChannelDot({ channels, channelKey }: { channels: readonly Channel[]; channelKey: string }) {
  return <span className={`dot tone-${channelTone(channels, channelKey)}`} aria-hidden="true" />;
}

/** Kind of damage an entity deals, as a colored chip. */
export function AttackBadge({ entity, channels }: { entity: Entity; channels: readonly Channel[] }) {
  const choice = attackChoiceOf(entity);
  const kind = attackType(entity);
  const tone = kind === 'hybrid' ? 'hybrid' : kind === 'none' ? 'none' : channelTone(channels, choice.slice(3));
  return <span className={`badge tone-${tone}`}>{attackChoiceLabel(choice, channels)}</span>;
}

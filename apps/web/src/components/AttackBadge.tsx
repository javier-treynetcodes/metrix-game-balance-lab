/**
 * @file Channel colors and the colored chip that names an entity's kind of attack.
 */

import { attackType, type Channel, type Entity } from '@metrix/core';
import { statCode } from '../lib/codes';
import { attackChannels } from '../lib/schema';
import { SwordIcon } from './Icons';

/** Color slot of a channel: the first is cyan, the second violet; mixed attacks use both. */
export function channelTone(channels: readonly Channel[], key: string): 'one' | 'two' {
  return channels.findIndex((channel) => channel.key === key) === 1 ? 'two' : 'one';
}

/** Small colored dot that identifies a channel in headers and labels. */
export function ChannelDot({ channels, channelKey }: { channels: readonly Channel[]; channelKey: string }) {
  return <span className={`dot tone-${channelTone(channels, channelKey)}`} aria-hidden="true" />;
}

/** Kind of damage an entity deals, as a colored chip: "ATK 1", "Mixed" or "No attack". */
export function AttackBadge({ entity, channels }: { entity: Entity; channels: readonly Channel[] }) {
  const kind = attackType(entity);
  const [first] = attackChannels(entity, channels);
  const tone = kind === 'mixed' ? 'mixed' : kind === 'none' || first === undefined ? 'none' : channelTone(channels, first);
  const label = kind === 'mixed' ? 'Mixed' : kind === 'none' || first === undefined ? 'No attack' : statCode('atk', channels, first);
  return (
    <span className={`badge tone-${tone}`}>
      {kind !== 'none' && <SwordIcon />}
      {label}
    </span>
  );
}

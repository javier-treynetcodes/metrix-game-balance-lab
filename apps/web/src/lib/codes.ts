/**
 * @file Short codes for stats (ATK, DEF) and channel short names.
 */

import { labelFor, type Channel } from '@metrix/core';

/**
 * Kind of stat a short code refers to:
 * - `atk`: attack on a channel (ATK 1).
 * - `def`: armor on a channel (DEF 1).
 */
export type StatKind = 'atk' | 'def';

const PREFIX: Record<StatKind, string> = { atk: 'ATK', def: 'DEF' };

/**
 * Short channel name: its number ("1" for `channel1` or `1`) until the user renames it,
 * then the new name.
 */
export function channelShort(channels: readonly Channel[], key: string): string {
  const channel = channels.find((candidate) => candidate.key === key);
  if (channel && channel.label !== labelFor(channel.key)) return channel.label;
  return /^(?:channel)?(\d+)$/.exec(key)?.[1] ?? (channel?.label ?? key);
}

/** Compact code for a stat, used everywhere instead of long names: "ATK 1", "DEF Physical". */
export function statCode(kind: StatKind, channels: readonly Channel[], key: string): string {
  return `${PREFIX[kind]} ${channelShort(channels, key)}`;
}

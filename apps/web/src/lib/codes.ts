import { labelFor, type Channel } from '@metrix/core';

/** atk: single-channel attack · def: defense · arm: hybrid armor · hyb: part of a hybrid attack. */
export type StatKind = 'atk' | 'def' | 'arm' | 'hyb';

const PREFIX: Record<StatKind, string> = { atk: 'ATK', def: 'DEF', arm: 'ARM', hyb: 'HYB' };

/** Short channel name: "1" until the user renames it, then the new name. */
export function channelShort(channels: readonly Channel[], key: string): string {
  const channel = channels.find((candidate) => candidate.key === key);
  return !channel || channel.label === labelFor(channel.key) ? key : channel.label;
}

/** Compact code for a stat, used everywhere instead of long names: "ATK 1", "DEF Physical", "ARM 2". */
export function statCode(kind: StatKind, channels: readonly Channel[], key: string): string {
  return `${PREFIX[kind]} ${channelShort(channels, key)}`;
}

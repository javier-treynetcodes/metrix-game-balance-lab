/**
 * @file Short colored stat codes (ATK 1, DEF 1) used across the app.
 */

import type { Channel } from '@metrix/core';
import { channelTone } from './AttackBadge';
import { statCode, type StatKind } from '../lib/codes';
import { ShieldIcon, SwordIcon } from './Icons';

interface StatCodeProps {
  kind: StatKind;
  channels: readonly Channel[];
  channelKey: string;
  /** Hide the channel part, e.g. inside a column group that already names the channel. */
  short?: boolean;
}

/** Compact, colored label for a stat: ATK 1, DEF 1. The icon repeats the kind for color-blind readers. */
export function StatCode({ kind, channels, channelKey, short = false }: StatCodeProps) {
  const text = statCode(kind, channels, channelKey);
  return (
    <span className={`stat-code tone-${channelTone(channels, channelKey)}`} title={text}>
      {kind === 'atk' ? <SwordIcon /> : <ShieldIcon />}
      <span>{short ? text.split(' ')[0] : text}</span>
    </span>
  );
}

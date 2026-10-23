import type { Channel } from './types';

/**
 * Damage dealt on a single channel after the defender's mitigation.
 * Negative defense is treated as 0; negative attack deals no damage.
 */
export function mitigate(attack: number, defense: number, channel: Channel): number {
  if (attack <= 0) return 0;
  const def = Math.max(defense, 0);

  switch (channel.mitigation) {
    case 'percent':
      return (attack * 100) / (100 + def);
    case 'subtractive':
      return Math.max(attack - def, channel.minDamage ?? 0);
    case 'ratio':
      return (attack * attack) / Math.max(def, 1);
    case 'none':
      return attack;
  }
}

/**
 * @file Armor coverage: how much of each channel every armor stops.
 */

import type { ArmorCoverage, Channel, Entity } from './types';

/** Highest coverage: an armor that stops all of a channel. */
export const MAX_COVERAGE = 100;

/** Default rule: an armor stops 100% of its own channel and nothing of the other one. */
export function defaultCoverageValue(armorKey: string, attackKey: string): number {
  return armorKey === attackKey ? MAX_COVERAGE : 0;
}

/** Percentage of `attackKey` damage that the armor of `armorKey` stops, falling back to the default rule. */
export function coverageValue(coverage: ArmorCoverage, armorKey: string, attackKey: string): number {
  return coverage[armorKey]?.[attackKey] ?? defaultCoverageValue(armorKey, attackKey);
}

/** A complete coverage table for the given channels, filling every missing value with the default rule. */
export function resolveCoverage(channels: readonly Channel[], coverage: ArmorCoverage = {}): ArmorCoverage {
  return Object.fromEntries(
    channels.map((armor) => [
      armor.key,
      Object.fromEntries(channels.map((attack) => [attack.key, coverageValue(coverage, armor.key, attack.key)])),
    ]),
  );
}

/** True when every value follows the default rule, so the CSV needs no `rule` rows. */
export function isDefaultCoverage(channels: readonly Channel[], coverage: ArmorCoverage): boolean {
  return channels.every((armor) =>
    channels.every(
      (attack) => coverageValue(coverage, armor.key, attack.key) === defaultCoverageValue(armor.key, attack.key),
    ),
  );
}

/** Whole percentage from 0 to 100. */
export function isCoveragePercent(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= MAX_COVERAGE;
}

/** One armor's contribution to the defense against a channel. */
export interface ArmorPart {
  /** Channel of the armor (its `def:` column). */
  armor: string;
  /** Armor value of the defender on that channel. */
  value: number;
  /** Percentage of the attacked channel this armor stops. */
  percent: number;
}

/** Defense against one attack channel, with the armors that make it up. */
export interface ArmorAgainst {
  /** floor(sum of armor * percent / 100): always a whole number, rounded down. */
  total: number;
  /** Armors that contribute something (value and percent above 0), in channel order. */
  parts: ArmorPart[];
}

/**
 * Defense of `defender` against an attack on `attackKey`: every armor stops its coverage
 * percentage of that channel. The sum is rounded down once, so the result stays a whole number
 * and ties favour the attacker. Computed with integers only (no floating-point rounding).
 */
export function armorAgainst(
  defender: Entity,
  attackKey: string,
  channels: readonly Channel[],
  coverage: ArmorCoverage,
): ArmorAgainst {
  const parts: ArmorPart[] = [];
  let scaled = 0;
  for (const { key } of channels) {
    const value = Math.max(defender.def[key] ?? 0, 0);
    const percent = coverageValue(coverage, key, attackKey);
    if (value === 0 || percent === 0) continue;
    parts.push({ armor: key, value, percent });
    scaled += value * percent;
  }
  return { total: Math.floor(scaled / MAX_COVERAGE), parts };
}

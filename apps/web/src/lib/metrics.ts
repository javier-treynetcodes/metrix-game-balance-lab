/**
 * @file Names, explanations and formatting of the four comparison metrics.
 */

import type { HitsToDefeat, Metric } from '@metrix/core';
import type { GenreProfile } from './genres';

/** Display name of a metric, using the genre's word for one attack ("Shots to defeat"). */
export function metricName(metric: Metric, genre: GenreProfile): string {
  switch (metric) {
    case 'hits':
      return `${capitalize(genre.hit)}s to defeat`;
    case 'damage':
      return `Damage per ${genre.hit}`;
    case 'trade':
      return 'Trade';
    case 'blocked':
      return 'Damage blocked';
  }
}

/** One-sentence explanation of a metric, shown above the duel matrix. */
export function metricHint(metric: Metric, genre: GenreProfile): string {
  switch (metric) {
    case 'hits':
      return `How many ${genre.hit}s the row entity needs to bring the column entity to 0 hp. Fewer wins.`;
    case 'damage':
      return `Damage the row entity deals with one ${genre.hit}, after the column entity's defense. More wins.`;
    case 'trade':
      return `Damage dealt minus damage received when both ${genre.hit} once. Positive wins.`;
    case 'blocked':
      return "How much of the row entity's attack the column entity's defense stops. It describes armor and names no winner.";
  }
}

/** "15 hits", "1 shot", "Can't damage" or "No hp". */
export function formatHits(result: HitsToDefeat, genre: GenreProfile): string {
  if (result.kind === 'defeats') return `${result.hits} ${result.hits === 1 ? genre.hit : `${genre.hit}s`}`;
  return result.kind === 'cannot-damage' ? "Can't damage" : 'No hp';
}

/** Signed number for trades: "+12", "-7" (with a true minus sign) or "0". */
export function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : '0';
}

/** Same text with its first letter in upper case. */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

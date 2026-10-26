/**
 * @file Genre profiles: ranking metric, vocabulary and reading guide per genre.
 */

import type { Genre, Metric } from '@metrix/core';

/**
 * How Métrix presents results for one genre. The genre never changes data or formulas:
 * only which metric ranks duels, the word used for one attack and the reading guide.
 */
export interface GenreProfile {
  id: Genre;
  name: string;
  /** One line on the picker card: what the user will see. */
  pitch: string;
  /** Measure that ranks duels by default. */
  primary: Metric;
  /** Word for one attack in this genre: hit, shot, attack... */
  hit: string;
  /** How to read the duel matrix for this genre. */
  howToRead: string;
}

/** Supported genres, in the order of the picker. Adding one only needs a new entry here. */
export const GENRES: readonly GenreProfile[] = [
  {
    id: 'card',
    name: 'Card game',
    pitch: 'Cards trade blows. See who comes out ahead in each exchange.',
    primary: 'trade',
    hit: 'attack',
    howToRead:
      'Cards trade blows. Each cell shows who comes out ahead when both hit each other once: +12 means the row card deals 12 more than it takes. Look for cards that win almost every trade for their cost: they are the ones to nerf.',
  },
  {
    id: 'shooter',
    name: 'Shooter',
    pitch: 'Weapons against targets, measured in shots to kill.',
    primary: 'hits',
    hit: 'shot',
    howToRead:
      'Each cell shows how many shots the row weapon needs to take down the column target. Fewer is stronger. Two weapons with the same shots to kill feel the same in play, whatever their raw damage.',
  },
  {
    id: 'rpg',
    name: 'Turn-based RPG',
    pitch: 'Units and classes, measured in hits to defeat each other.',
    primary: 'hits',
    hit: 'hit',
    howToRead:
      'Each cell shows how many hits the row unit needs to defeat the column unit. Fewer hits wins the duel. Close fights, won by a single hit, are where your balance is most fragile.',
  },
  {
    id: 'moba',
    name: 'MOBA / Action',
    pitch: 'Champions and builds: hits to kill and what armor really blocks.',
    primary: 'hits',
    hit: 'hit',
    howToRead:
      'Each cell shows hits to kill. Switch to Damage blocked to see how much each defense is really worth against each attacker: a defense that blocks nothing against most champions is wasted.',
  },
  {
    id: 'board',
    name: 'Board game',
    pitch: 'Pieces facing each other in a single exchange.',
    primary: 'trade',
    hit: 'attack',
    howToRead:
      'Each cell shows the result of one exchange: what the row piece deals minus what it receives. Positive wins, zero is a standoff.',
  },
  {
    id: 'other',
    name: 'Other',
    pitch: 'Pick the measure that matches how combat works in your game.',
    primary: 'hits',
    hit: 'hit',
    howToRead:
      'Pick the measure that matches how combat works in your game with Compare by. Every measure uses the same data; only the point of view changes.',
  },
];

/** Profile of a genre, falling back to "Other" when none was picked yet. */
export function genreProfile(genre: Genre | undefined): GenreProfile {
  return GENRES.find((profile) => profile.id === genre) ?? (GENRES.at(-1) as GenreProfile);
}

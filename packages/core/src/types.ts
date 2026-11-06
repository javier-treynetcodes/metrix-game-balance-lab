/**
 * @file Domain types of the engine: channels, armor coverage, entities, complements and genres.
 */

/**
 * A damage channel (for example physical or magic). Métrix works with exactly two.
 * Each channel has an attack (`atk:<key>`) and an armor (`def:<key>`).
 */
export interface Channel {
  /** Name used in the CSV columns (`atk:<key>`, `def:<key>`). */
  key: string;
  /** Display name chosen by the user. */
  label: string;
}

/**
 * Share of each channel that each armor stops, as whole percentages from 0 to 100:
 * `coverage[armorChannel][attackChannel]`. A missing value means the default rule:
 * an armor stops 100% of its own channel and 0% of the other one.
 */
export type ArmorCoverage = Record<string, Record<string, number>>;

/** What kind of damage an entity deals: nothing, one channel, or both channels at once (mixed). */
export type AttackType = 'none' | 'channel' | 'mixed';

/**
 * A balanceable catalog item: a character, unit, card, weapon, enemy...
 * Every game value is a whole number.
 */
export interface Entity {
  id: string;
  /** Kind of unit, e.g. "Iron Vanguard". */
  name: string;
  /** Proper name of the character, e.g. "Aria". */
  character?: string;
  /** Class that groups characters and receives the same complements, e.g. "tank". */
  class?: string;
  cost?: number;
  hp?: number;
  /**
   * Attack speed as a whole percentage: 100 is normal, 125 attacks 25% faster.
   * Used by "time to defeat". Undefined when the catalog does not use speed.
   */
  speed?: number;
  /**
   * Movement speed as a whole percentage: 100 is normal. Informative only: it never changes
   * a duel result, it only tells who can catch up with or escape from whom.
   */
  move?: number;
  /** Attack per channel. Values on both channels make a mixed attack. */
  atk: Record<string, number>;
  /** Armor per channel. How much of each channel it stops is set by the armor coverage. */
  def: Record<string, number>;
  tags: Record<string, string>;
  /** Extra whole-number columns. */
  stats: Record<string, number>;
  /** Cells of columns Métrix does not use, by column position, kept as written for export. */
  extra: Record<string, string>;
}

/**
 * Item obtained during a match that adds attack or armor to every character of one class.
 * Its values are bonuses: whole numbers of 0 or more, added to the base values.
 */
export interface Complement {
  id: string;
  /** Display name, e.g. "Tower Shield". */
  name: string;
  /** Class that receives the bonuses. */
  class: string;
  /** Attack added per channel. */
  atk: Record<string, number>;
  /** Armor added per channel. */
  def: Record<string, number>;
  /** Attack speed points added (110 instead of 100 for a bonus of 10). Optional. */
  speed?: number;
  /** Movement speed points added. Optional. */
  move?: number;
  /** Cells of columns Métrix does not use, by column position, kept as written for export. */
  extra: Record<string, string>;
}

/** Game genre: decides which measure ranks duels and how results are explained. */
export type Genre = 'card' | 'shooter' | 'rpg' | 'moba' | 'board' | 'other';

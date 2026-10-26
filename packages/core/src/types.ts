/**
 * A damage channel (for example physical or magic). Métrix works with exactly two.
 * An attack on a channel is only reduced by defense on that same channel.
 */
export interface Channel {
  /** Name used in the CSV columns (`atk:<key>`, `def:<key>`). */
  key: string;
  /** Display name chosen by the user. */
  label: string;
}

/** What kind of damage an entity deals. Every entity deals exactly one kind, or none. */
export type AttackType = 'none' | 'channel' | 'hybrid';

/**
 * A balanceable catalog item: card, champion, unit, weapon, enemy…
 * Every game value is a whole number.
 */
export interface Entity {
  id: string;
  name: string;
  category?: string;
  cost?: number;
  hp?: number;
  /** Single-channel attack: at most one channel holds a value above 0. */
  atk: Record<string, number>;
  /**
   * Hybrid attack: one value per channel, both dealt on every hit.
   * Present only for hybrid attackers, which deal no single-channel attack.
   */
  hybridAtk?: Record<string, number>;
  /** Base defense per channel: reduces every attack on its channel. */
  def: Record<string, number>;
  /** Armor against hybrid attacks only, added to the base defense of its channel. */
  hybridDef: Record<string, number>;
  tags: Record<string, string>;
  /** Extra whole-number columns. */
  stats: Record<string, number>;
  /** Cells of columns Métrix does not use, by column position, kept as written for export. */
  extra: Record<string, string>;
}

/** Game genre: decides which measure ranks duels and how results are explained. */
export type Genre = 'card' | 'shooter' | 'rpg' | 'moba' | 'board' | 'other';

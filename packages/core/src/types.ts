/** How a channel's defense reduces incoming attack. */
export type Mitigation = 'percent' | 'subtractive' | 'ratio' | 'none';

/** A damage channel: attack on channel N is only countered by defense on channel N. */
export interface Channel {
  key: string;
  label: string;
  mitigation: Mitigation;
  /** Damage floor for `subtractive` mitigation. Defaults to 0. */
  minDamage?: number;
}

/** A balanceable catalog item: card, champion, unit, weapon, enemy… */
export interface Entity {
  id: string;
  name: string;
  category?: string;
  cost?: number;
  hp?: number;
  /** Attacks per second or per turn. Defaults to 1. */
  rate: number;
  /** Attack per channel key. */
  atk: Record<string, number>;
  /** Defense per channel key. */
  def: Record<string, number>;
  tags: Record<string, string>;
  /** Extra numeric columns. */
  stats: Record<string, number>;
}

/** Damage multipliers between values of one tag (types, classes, elements). */
export interface InteractionMatrix {
  tagKey: string;
  /** attacker tag value → defender tag value → multiplier. Missing pairs count as 1. */
  multipliers: Record<string, Record<string, number>>;
}

export interface Project {
  name: string;
  genre?: string;
  channels: Channel[];
  entities: Entity[];
  interactions?: InteractionMatrix;
  /** Version label used to compare patches. */
  version: string;
}

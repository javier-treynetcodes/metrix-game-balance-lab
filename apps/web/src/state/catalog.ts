/**
 * @file Catalog model of the web app: rows, change tracking and browser persistence.
 */

import {
  coverageValue,
  labelFor,
  type ArmorCoverage,
  type Channel,
  type Complement,
  type CsvLayout,
  type Entity,
  type Genre,
  type ImportIssue,
} from '@metrix/core';

/** An entity with a stable key, so edits can be tracked even when its id changes. */
export interface Row {
  key: string;
  entity: Entity;
}

/** A successfully imported catalog, ready to analyze, edit and export. */
export interface Catalog {
  version: 3;
  /** File name, or a label for built-in data. */
  source: string;
  importedAt: string;
  /** Columns, order and separator of the source file, reused by the export. */
  layout: CsvLayout;
  channels: Channel[];
  rows: Row[];
  /** Rows as imported, to show and revert changes. */
  original: Row[];
  /** Complements of the file, by class. Read-only in the app: they come from the CSV. */
  complements: Complement[];
  /**
   * Ids of complements switched off in the app. A viewing setting, not an edit: it is not
   * exported, has no undo step and every complement is active again after an import.
   */
  inactiveComplements: string[];
  /** Armor coverage as edited in the Damage rules tab. */
  coverage: ArmorCoverage;
  /** Armor coverage as imported, to show and revert changes. */
  originalCoverage: ArmorCoverage;
  /** Non-blocking issues reported during import. */
  warnings: ImportIssue[];
  genre?: Genre;
  /** Increases with every edit; compared with `exportedRevision` to flag unexported changes. */
  revision: number;
  exportedRevision: number;
  nextKey: number;
}

/**
 * Builds a fresh catalog from an import. Each entity gets a stable row key (`r0`, `r1`...) so
 * changes are tracked even if the user edits the id, and `original` keeps the imported state
 * for highlighting changes and "Revert all".
 */
export function createCatalog(
  source: string,
  layout: CsvLayout,
  channels: Channel[],
  entities: Entity[],
  warnings: ImportIssue[],
  complements: Complement[] = [],
  coverage: ArmorCoverage = {},
): Catalog {
  const rows = entities.map((entity, index) => ({ key: `r${index}`, entity }));
  return {
    version: 3,
    source,
    importedAt: new Date().toISOString(),
    layout,
    channels,
    rows,
    original: rows,
    complements,
    inactiveComplements: [],
    coverage,
    originalCoverage: coverage,
    warnings,
    revision: 0,
    exportedRevision: 0,
    nextKey: rows.length,
  };
}

/** Fields of an entity as the catalog shows them, for change tracking. */
export function entityFields(entity: Entity): Record<string, string> {
  const fields: Record<string, string> = {
    id: entity.id,
    name: entity.name,
    character: entity.character ?? '',
    class: entity.class ?? '',
    cost: String(entity.cost ?? ''),
    hp: String(entity.hp ?? ''),
  };
  for (const [key, value] of Object.entries(entity.atk)) fields[`atk:${key}`] = String(value);
  for (const [key, value] of Object.entries(entity.def)) fields[`def:${key}`] = String(value);
  for (const [key, value] of Object.entries(entity.tags)) fields[`tag:${key}`] = value;
  for (const [key, value] of Object.entries(entity.stats)) fields[`stat:${key}`] = String(value);
  return fields;
}

/** Field names that differ between two versions of an entity. */
export function changedFields(before: Entity | undefined, after: Entity): Set<string> {
  if (!before) return new Set(['*']);
  const a = entityFields(before);
  const b = entityFields(after);
  // A missing defense, tag or stat means the same as an empty or zero one.
  const same = (key: string) => {
    const x = a[key] ?? '';
    const y = b[key] ?? '';
    return x === y || (key.includes(':') && (x || '0') === (y || '0'));
  };
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return new Set([...keys].filter((key) => !same(key)));
}

/** Coverage values that differ from the imported ones, as `armor>attack` keys. */
export function changedCoverage(catalog: Catalog): Set<string> {
  const changed = new Set<string>();
  for (const armor of catalog.channels) {
    for (const attack of catalog.channels) {
      const before = coverageValue(catalog.originalCoverage, armor.key, attack.key);
      if (coverageValue(catalog.coverage, armor.key, attack.key) !== before) changed.add(`${armor.key}>${attack.key}`);
    }
  }
  return changed;
}

/** Active complements: every complement of the file except those switched off in the app. */
export function activeComplements(catalog: Catalog): Complement[] {
  const inactive = new Set(catalog.inactiveComplements);
  return catalog.complements.filter((complement) => !inactive.has(complement.id));
}

/**
 * Number of changes since import: edited fields, added and deleted entities, renamed channels
 * and coverage values.
 */
export function countChanges(catalog: Catalog): number {
  const original = new Map(catalog.original.map((row) => [row.key, row.entity]));
  const current = new Set(catalog.rows.map((row) => row.key));
  let count = catalog.original.filter((row) => !current.has(row.key)).length;
  for (const row of catalog.rows) {
    const before = original.get(row.key);
    count += before ? changedFields(before, row.entity).size : 1;
  }
  count += catalog.channels.filter((channel) => channel.label !== labelFor(channel.key)).length;
  count += changedCoverage(catalog).size;
  return count;
}

const STORAGE_KEY = 'metrix:catalog:v3';
/** Keys used by older versions, whose catalogs no longer match the current model. */
const LEGACY_KEYS = ['metrix:catalog:v1', 'metrix:catalog:v2'];

/** What `loadSavedCatalog` found in this browser. */
export interface SavedState {
  catalog: Catalog | null;
  /** A catalog saved by an older version was found and discarded: it must be imported again. */
  discardedLegacy: boolean;
}

/**
 * Restores the last catalog from this browser. Storage can be missing, blocked or hold
 * data from an older version, so any failure simply means "nothing saved".
 */
export function loadSavedCatalog(): SavedState {
  let discardedLegacy = false;
  try {
    for (const key of LEGACY_KEYS) {
      if (window.localStorage.getItem(key) !== null) {
        window.localStorage.removeItem(key);
        discardedLegacy = true;
      }
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { catalog: null, discardedLegacy };
    const data: unknown = JSON.parse(raw);
    return { catalog: isCatalog(data) ? data : null, discardedLegacy };
  } catch {
    return { catalog: null, discardedLegacy };
  }
}

/**
 * Saves the catalog in this browser, or removes it when `null`. Storage may be full or blocked
 * (private mode); then the session keeps working and the catalog is just not restored on reload.
 */
export function saveCatalog(catalog: Catalog | null): void {
  try {
    if (catalog) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage full or blocked: the session keeps working, it just will not be restored.
  }
}

function isCatalog(value: unknown): value is Catalog {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.version === 3 &&
    typeof candidate.source === 'string' &&
    Array.isArray(candidate.channels) &&
    Array.isArray(candidate.rows) &&
    Array.isArray(candidate.original) &&
    Array.isArray(candidate.complements) &&
    Array.isArray(candidate.inactiveComplements) &&
    typeof candidate.coverage === 'object' &&
    typeof candidate.originalCoverage === 'object' &&
    typeof candidate.layout === 'object'
  );
}

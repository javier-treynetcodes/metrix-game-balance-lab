import { labelFor, type Channel, type CsvLayout, type Entity, type Genre, type ImportIssue } from '@metrix/core';

/** An entity with a stable key, so edits can be tracked even when its id changes. */
export interface Row {
  key: string;
  entity: Entity;
}

/** A successfully imported catalog, ready to analyze, edit and export. */
export interface Catalog {
  version: 2;
  /** File name, or a label for built-in data. */
  source: string;
  importedAt: string;
  /** Columns, order and separator of the source file, reused by the export. */
  layout: CsvLayout;
  channels: Channel[];
  rows: Row[];
  /** Rows as imported, to show and revert changes. */
  original: Row[];
  /** Non-blocking issues reported during import. */
  warnings: ImportIssue[];
  genre?: Genre;
  /** Increases with every edit; compared with `exportedRevision` to flag unexported changes. */
  revision: number;
  exportedRevision: number;
  nextKey: number;
}

export function createCatalog(
  source: string,
  layout: CsvLayout,
  channels: Channel[],
  entities: Entity[],
  warnings: ImportIssue[],
): Catalog {
  const rows = entities.map((entity, index) => ({ key: `r${index}`, entity }));
  return {
    version: 2,
    source,
    importedAt: new Date().toISOString(),
    layout,
    channels,
    rows,
    original: rows,
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
    category: entity.category ?? '',
    cost: String(entity.cost ?? ''),
    hp: String(entity.hp ?? ''),
    attack: JSON.stringify([entity.atk, entity.hybridAtk ?? null]),
  };
  for (const [key, value] of Object.entries(entity.def)) fields[`def:${key}`] = String(value);
  for (const [key, value] of Object.entries(entity.hybridDef)) fields[`hybridDef:${key}`] = String(value);
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

/** Number of changes since import: edited fields, added and deleted entities and renamed channels. */
export function countChanges(catalog: Catalog): number {
  const original = new Map(catalog.original.map((row) => [row.key, row.entity]));
  const current = new Set(catalog.rows.map((row) => row.key));
  let count = catalog.original.filter((row) => !current.has(row.key)).length;
  for (const row of catalog.rows) {
    const before = original.get(row.key);
    count += before ? changedFields(before, row.entity).size : 1;
  }
  count += catalog.channels.filter((channel) => channel.label !== labelFor(channel.key)).length;
  return count;
}

const STORAGE_KEY = 'metrix:catalog:v2';
const LEGACY_KEY = 'metrix:catalog:v1';

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
    if (window.localStorage.getItem(LEGACY_KEY) !== null) {
      window.localStorage.removeItem(LEGACY_KEY);
      discardedLegacy = true;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { catalog: null, discardedLegacy };
    const data: unknown = JSON.parse(raw);
    return { catalog: isCatalog(data) ? data : null, discardedLegacy };
  } catch {
    return { catalog: null, discardedLegacy };
  }
}

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
    candidate.version === 2 &&
    typeof candidate.source === 'string' &&
    Array.isArray(candidate.channels) &&
    Array.isArray(candidate.rows) &&
    Array.isArray(candidate.original) &&
    typeof candidate.layout === 'object'
  );
}

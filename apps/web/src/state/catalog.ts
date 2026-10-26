import type { Channel, Entity, ImportIssue } from '@metrix/core';

/** A successfully imported catalog, ready to analyze. */
export interface Catalog {
  /** File name, or a label for built-in data. */
  source: string;
  importedAt: string;
  channels: Channel[];
  entities: Entity[];
  /** Non-blocking issues reported during import. */
  warnings: ImportIssue[];
}

const STORAGE_KEY = 'metrix:catalog:v1';

/**
 * Restores the last catalog from this browser. Storage can be missing, blocked or hold
 * data from an older version, so any failure simply means "nothing saved".
 */
export function loadSavedCatalog(): Catalog | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!isCatalog(data)) return null;
    return data;
  } catch {
    return null;
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
    typeof candidate.source === 'string' &&
    typeof candidate.importedAt === 'string' &&
    Array.isArray(candidate.channels) &&
    Array.isArray(candidate.entities) &&
    Array.isArray(candidate.warnings)
  );
}

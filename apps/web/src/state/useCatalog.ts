import { useCallback, useEffect, useState } from 'react';
import { labelFor, type Entity, type Genre } from '@metrix/core';
import { loadSavedCatalog, saveCatalog, type Catalog, type Row } from './catalog';

const HISTORY_LIMIT = 100;

interface History {
  catalog: Catalog | null;
  past: Catalog[];
  future: Catalog[];
}

function uniqueId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/**
 * Current catalog with undo/redo, persisted in this browser so a reload does not lose the work.
 * Every edit is one undo step; viewing settings (genre) are not.
 */
export function useCatalog() {
  const [initial] = useState(loadSavedCatalog);
  const [history, setHistory] = useState<History>({ catalog: initial.catalog, past: [], future: [] });
  const { catalog } = history;

  useEffect(() => {
    saveCatalog(catalog);
  }, [catalog]);

  /** Replaces the catalog without an undo step (import, clear, viewing settings). */
  const replace = useCallback((next: Catalog | null, keepHistory = false) => {
    setHistory((current) => (keepHistory ? { ...current, catalog: next } : { catalog: next, past: [], future: [] }));
  }, []);

  /** Applies an edit as one undo step. */
  const edit = useCallback((change: (current: Catalog) => Catalog) => {
    setHistory((current) => {
      if (!current.catalog) return current;
      const next = change(current.catalog);
      if (next === current.catalog) return current;
      return {
        catalog: { ...next, revision: current.catalog.revision + 1 },
        past: [...current.past, current.catalog].slice(-HISTORY_LIMIT),
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (!previous || !current.catalog) return current;
      return { catalog: previous, past: current.past.slice(0, -1), future: [current.catalog, ...current.future] };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      const [next, ...rest] = current.future;
      if (!next || !current.catalog) return current;
      return { catalog: next, past: [...current.past, current.catalog], future: rest };
    });
  }, []);

  const updateEntities = useCallback(
    (updates: Record<string, Entity>) =>
      edit((current) => ({
        ...current,
        rows: current.rows.map((row) => (updates[row.key] ? { ...row, entity: updates[row.key] as Entity } : row)),
      })),
    [edit],
  );

  const addEntity = useCallback(
    (template: Entity) =>
      edit((current) => {
        const id = uniqueId(template.id, new Set(current.rows.map((row) => row.entity.id)));
        const row: Row = { key: `r${current.nextKey}`, entity: { ...template, id } };
        return { ...current, rows: [...current.rows, row], nextKey: current.nextKey + 1 };
      }),
    [edit],
  );

  const duplicateEntity = useCallback(
    (key: string) =>
      edit((current) => {
        const index = current.rows.findIndex((row) => row.key === key);
        const source = current.rows[index];
        if (!source) return current;
        const id = uniqueId(`${source.entity.id}-copy`, new Set(current.rows.map((row) => row.entity.id)));
        const copy: Row = {
          key: `r${current.nextKey}`,
          entity: { ...structuredClone(source.entity), id, name: `${source.entity.name} (copy)`, extra: {} },
        };
        const rows = [...current.rows];
        rows.splice(index + 1, 0, copy);
        return { ...current, rows, nextKey: current.nextKey + 1 };
      }),
    [edit],
  );

  const deleteEntity = useCallback(
    (key: string) => edit((current) => ({ ...current, rows: current.rows.filter((row) => row.key !== key) })),
    [edit],
  );

  const renameChannel = useCallback(
    (key: string, label: string) =>
      edit((current) => ({
        ...current,
        channels: current.channels.map((channel) => (channel.key === key ? { ...channel, label } : channel)),
      })),
    [edit],
  );

  const revertAll = useCallback(
    () =>
      edit((current) => ({
        ...current,
        rows: current.original,
        channels: current.channels.map((channel) => ({ ...channel, label: labelFor(channel.key) })),
      })),
    [edit],
  );

  const setGenre = useCallback(
    (genre: Genre) => setHistory((current) => (current.catalog ? { ...current, catalog: { ...current.catalog, genre } } : current)),
    [],
  );

  const markExported = useCallback(
    () =>
      setHistory((current) =>
        current.catalog ? { ...current, catalog: { ...current.catalog, exportedRevision: current.catalog.revision } } : current,
      ),
    [],
  );

  const dismissWarnings = useCallback(
    () => setHistory((current) => (current.catalog ? { ...current, catalog: { ...current.catalog, warnings: [] } } : current)),
    [],
  );

  return {
    catalog,
    discardedLegacy: initial.discardedLegacy,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    replace,
    undo,
    redo,
    updateEntities,
    addEntity,
    duplicateEntity,
    deleteEntity,
    renameChannel,
    revertAll,
    setGenre,
    markExported,
    dismissWarnings,
  };
}

export type CatalogActions = Omit<ReturnType<typeof useCatalog>, 'catalog' | 'discardedLegacy' | 'replace'>;


import { useMemo, useState } from 'react';
import type { Channel, Entity } from '@metrix/core';
import { formatNumber, plural } from '../../lib/format';

interface Column {
  key: string;
  label: string;
  numeric: boolean;
  value: (entity: Entity) => number | string | undefined;
}

function buildColumns(channels: readonly Channel[], entities: readonly Entity[]): Column[] {
  const tagKeys = [...new Set(entities.flatMap((entity) => Object.keys(entity.tags)))];
  const statKeys = [...new Set(entities.flatMap((entity) => Object.keys(entity.stats)))];
  const hasCategory = entities.some((entity) => entity.category !== undefined);
  const hasCost = entities.some((entity) => entity.cost !== undefined);

  return [
    { key: 'name', label: 'Name', numeric: false, value: (e) => e.name },
    ...(hasCategory ? [{ key: 'category', label: 'Category', numeric: false, value: (e: Entity) => e.category }] : []),
    ...(hasCost ? [{ key: 'cost', label: 'Cost', numeric: true, value: (e: Entity) => e.cost }] : []),
    { key: 'hp', label: 'HP', numeric: true, value: (e) => e.hp },
    { key: 'rate', label: 'Rate', numeric: true, value: (e) => e.rate },
    ...channels.flatMap((channel) => [
      { key: `atk:${channel.key}`, label: `${channel.label} atk`, numeric: true, value: (e: Entity) => e.atk[channel.key] },
      { key: `def:${channel.key}`, label: `${channel.label} def`, numeric: true, value: (e: Entity) => e.def[channel.key] },
    ]),
    ...tagKeys.map((key) => ({ key: `tag:${key}`, label: key, numeric: false, value: (e: Entity) => e.tags[key] })),
    ...statKeys.map((key) => ({ key: `stat:${key}`, label: key, numeric: true, value: (e: Entity) => e.stats[key] })),
  ];
}

function compare(a: number | string | undefined, b: number | string | undefined): number {
  if (a === undefined) return b === undefined ? 0 : 1;
  if (b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

export function CatalogTable({ channels, entities }: { channels: readonly Channel[]; entities: readonly Entity[] }) {
  const columns = useMemo(() => buildColumns(channels, entities), [channels, entities]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: string; direction: 1 | -1 } | null>(null);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? entities.filter((entity) =>
          [entity.id, entity.name, entity.category ?? '', ...Object.values(entity.tags)].some((text) =>
            text.toLowerCase().includes(needle),
          ),
        )
      : [...entities];
    const column = sort && columns.find((candidate) => candidate.key === sort.key);
    if (sort && column) {
      // Missing values always go last, whatever the direction.
      filtered.sort((a, b) => {
        const va = column.value(a);
        const vb = column.value(b);
        if (va === undefined || vb === undefined) return compare(va, vb);
        return compare(va, vb) * sort.direction;
      });
    }
    return filtered;
  }, [entities, columns, query, sort]);

  const toggleSort = (key: string) =>
    setSort((current) =>
      current?.key !== key ? { key, direction: 1 } : current.direction === 1 ? { key, direction: -1 } : null,
    );

  return (
    <div className="tab-body">
      <div className="toolbar">
        <label className="field">
          <span>Search</span>
          <input
            type="search"
            value={query}
            placeholder="Name, id, category or tag"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <p className="muted" aria-live="polite">
          {rows.length === entities.length
            ? plural(entities.length, 'entity', 'entities')
            : `${rows.length} of ${plural(entities.length, 'entity', 'entities')}`}
        </p>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => {
                const active = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={column.numeric ? 'num' : undefined}
                    aria-sort={active ? (sort.direction === 1 ? 'ascending' : 'descending') : 'none'}
                  >
                    <button type="button" className="sort-button" onClick={() => toggleSort(column.key)}>
                      {column.label}
                      <span aria-hidden="true" className="sort-icon">
                        {active ? (sort.direction === 1 ? '▲' : '▼') : ''}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((entity) => (
              <tr key={entity.id}>
                {columns.map((column) => {
                  const value = column.value(entity);
                  if (column.key === 'name') {
                    return (
                      <th key={column.key} scope="row">
                        <span className="entity-name">{entity.name}</span>
                        <span className="entity-id">{entity.id}</span>
                      </th>
                    );
                  }
                  return (
                    <td key={column.key} className={column.numeric ? 'num' : undefined}>
                      {typeof value === 'number' ? formatNumber(value) : (value ?? '—')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">No entity matches “{query}”.</p>}
      </div>
    </div>
  );
}

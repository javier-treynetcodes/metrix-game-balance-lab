/**
 * @file Catalog tab: the editable table of entities.
 */

import { useMemo, useState } from 'react';
import { validateEntity, type Entity } from '@metrix/core';
import { channelTone } from '../../components/AttackBadge';
import { StatCode } from '../../components/StatCode';
import { EditableCell } from '../../components/EditableCell';
import { plural } from '../../lib/format';
import { withKey } from '../../lib/record';
import { parseField } from '../../lib/parseField';
import { statCode } from '../../lib/codes';
import { blankEntity, type CatalogSchema } from '../../lib/schema';
import { changedFields, type Catalog, type Row } from '../../state/catalog';
import type { CatalogActions } from '../../state/useCatalog';

interface CatalogEditorProps {
  /** Catalog to show and edit, including the imported state used to highlight changes. */
  catalog: Catalog;
  /** Columns available in the imported file; only these can be edited. */
  schema: CatalogSchema;
  /** Edit actions; each call is one undo step. */
  actions: CatalogActions;
  /** Opens Versus with the entity of this row key as side A. */
  onCompare: (key: string) => void;
}

type SortKey = 'name' | 'cost' | 'hp';

/** Optional text fields of an entity, edited as free text and removed when emptied. */
type TextField = 'character' | 'class';

/**
 * Editable catalog table.
 *
 * - Columns are grouped by channel (ATK and DEF side by side). Only the columns of the imported
 *   file are shown: new columns are added through the template.
 * - An entity can attack on both channels at once (mixed attack): each ATK cell is independent.
 * - Every edit goes through `validateEntity`, the same rules as the import, and becomes one
 *   undo step. Invalid input stays in the cell with an explanation and is never saved.
 */
export function CatalogEditor({ catalog, schema, actions, onCompare }: CatalogEditorProps) {
  const { channels, rows } = catalog;
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; direction: 1 | -1 } | null>(null);
  const [notice, setNotice] = useState('');

  const original = useMemo(() => new Map(catalog.original.map((row) => [row.key, row.entity])), [catalog.original]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? rows.filter(({ entity }) =>
          [entity.id, entity.name, entity.character ?? '', entity.class ?? '', ...Object.values(entity.tags)].some((text) =>
            text.toLowerCase().includes(needle),
          ),
        )
      : [...rows];
    if (sort) {
      filtered.sort((a, b) => {
        if (sort.key === 'name') return a.entity.name.localeCompare(b.entity.name) * sort.direction;
        const va = a.entity[sort.key];
        const vb = b.entity[sort.key];
        // Missing values always go last, whatever the direction.
        if (va === undefined || vb === undefined) return va === vb ? 0 : va === undefined ? 1 : -1;
        return (va - vb) * sort.direction;
      });
    }
    return filtered;
  }, [rows, query, sort]);

  /** Validates and saves a new version of an entity; returns the problem to show, if any. */
  const save = (row: Row, next: Entity): string | null => {
    const problem = validateEntity(next)[0];
    if (problem) return problem.message;
    if (rows.some((other) => other.key !== row.key && other.entity.id === next.id)) {
      return `Id "${next.id}" is already used. Every id must be unique.`;
    }
    actions.updateEntities({ [row.key]: next });
    return null;
  };

  const saveNumber = (row: Row, text: string, apply: (entity: Entity, value: number | undefined) => Entity, required = false, allowNegative = false) => {
    const parsed = parseField(text, { required, allowNegative });
    return parsed.ok ? save(row, apply(row.entity, parsed.value)) : parsed.error;
  };

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current?.key !== key ? { key, direction: 1 } : current.direction === 1 ? { key, direction: -1 } : null,
    );

  /** Saves a character or class: trimmed, and removed when emptied. */
  const saveText = (row: Row, field: TextField, text: string) => {
    const value = text.trim();
    const next: Entity = { ...row.entity, [field]: value };
    // An emptied field is removed, so an entity without class or character has no such key at all.
    if (value === '') {
      if (field === 'class') delete next.class;
      else delete next.character;
    }
    return save(row, next);
  };

  // Columns grouped by channel: each channel's attack and defense side by side.
  const channelGroups = channels
    .map((channel) => ({
      channel,
      atk: schema.atkChannels.includes(channel.key),
      def: schema.defChannels.includes(channel.key),
    }))
    .filter((group) => group.atk || group.def);

  const sortHeader = (key: SortKey, label: string, numeric = false) => {
    const active = sort?.key === key;
    return (
      <th scope="col" rowSpan={2} className={numeric ? 'num' : undefined} aria-sort={active ? (sort.direction === 1 ? 'ascending' : 'descending') : 'none'}>
        <button type="button" className="sort-button" onClick={() => toggleSort(key)}>
          {label}
          <span aria-hidden="true" className="sort-icon">
            {active ? (sort.direction === 1 ? '▲' : '▼') : ''}
          </span>
        </button>
      </th>
    );
  };

  const remove = (row: Row) => {
    actions.deleteEntity(row.key);
    setNotice(`Deleted ${row.entity.name}.`);
  };

  return (
    <div className="tab-body">
      <div className="toolbar">
        <label className="field">
          <span>Search</span>
          <input type="search" value={query} placeholder="Name, character, class or tag" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="toolbar-actions">
          <p className="muted" aria-live="polite">
            {visible.length === rows.length
              ? plural(rows.length, 'entity', 'entities')
              : `${visible.length} of ${plural(rows.length, 'entity', 'entities')}`}
          </p>
          <button type="button" className="button button-primary" onClick={() => actions.addEntity(blankEntity(schema))}>
            Add entity
          </button>
        </div>
      </div>
      <p className="muted small intro">
        Click a value to edit it; Enter saves and moves down, Tab moves right. Whole numbers only. An entity with ATK on
        both channels deals a mixed attack. Changes are highlighted and update duels instantly. Complements are listed in
        their own tab. To add new columns, add them to your file from the template and import it again.
      </p>
      <p className="notice" role="status" aria-live="polite">
        {notice && (
          <>
            {notice}{' '}
            <button
              type="button"
              className="link-button"
              onClick={() => {
                actions.undo();
                setNotice('');
              }}
            >
              Undo
            </button>
          </>
        )}
      </p>

      <div className="table-scroll">
        <table className="data-table editor-table">
          <thead>
            <tr>
              {sortHeader('name', 'Unit · id')}
              {schema.hasCharacter && <th scope="col" rowSpan={2}>Character</th>}
              {schema.hasClass && <th scope="col" rowSpan={2}>Class</th>}
              {schema.hasCost && sortHeader('cost', 'Cost', true)}
              {schema.hasHp && sortHeader('hp', 'HP', true)}
              {channelGroups.map(({ channel, atk, def }) => (
                <th
                  key={channel.key}
                  scope="colgroup"
                  colSpan={Number(atk) + Number(def)}
                  className={`group-head tone-${channelTone(channels, channel.key)}`}
                >
                  {channel.label}
                </th>
              ))}
              {schema.tagKeys.map((key) => (
                <th key={`tag-${key}`} scope="col" rowSpan={2}>
                  {key}
                </th>
              ))}
              {schema.statKeys.map((key) => (
                <th key={`stat-${key}`} scope="col" rowSpan={2} className="num">
                  {key}
                </th>
              ))}
              <th scope="col" rowSpan={2}>
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
            <tr className="sub-head">
              {channelGroups.flatMap(({ channel, atk, def }) => [
                ...(atk
                  ? [
                      <th key={`atk-${channel.key}`} scope="col" className="num group-start">
                        <StatCode kind="atk" channels={channels} channelKey={channel.key} />
                      </th>,
                    ]
                  : []),
                ...(def
                  ? [
                      <th key={`def-${channel.key}`} scope="col" className={`num${atk ? '' : ' group-start'}`}>
                        <StatCode kind="def" channels={channels} channelKey={channel.key} />
                      </th>,
                    ]
                  : []),
              ])}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const { entity } = row;
              const changed = changedFields(original.get(row.key), entity);
              const isNew = changed.has('*');
              const mark = (field: string) => (isNew || changed.has(field) ? 'is-changed' : undefined);
              return (
                <tr key={row.key} className={isNew ? 'is-new' : undefined}>
                  <th scope="row" className={mark('name') ?? mark('id')}>
                    <EditableCell
                      label={`Name of ${entity.name}`}
                      value={entity.name}
                      display={<span className="entity-name">{entity.name}</span>}
                      onCommit={(text) => save(row, { ...entity, name: text.trim() })}
                    />
                    <EditableCell
                      label={`Id of ${entity.name}`}
                      value={entity.id}
                      display={<span className="entity-id">{entity.id}</span>}
                      onCommit={(text) => save(row, { ...entity, id: text.trim() })}
                    />
                  </th>
                  {(['character', 'class'] as const).map((field) =>
                    (field === 'character' ? schema.hasCharacter : schema.hasClass) ? (
                      <td key={field} className={mark(field)}>
                        <EditableCell
                          label={`${field === 'class' ? 'Class' : 'Character'} of ${entity.name}`}
                          value={entity[field] ?? ''}
                          display={entity[field] ?? <span className="faint">—</span>}
                          onCommit={(text) => saveText(row, field, text)}
                        />
                      </td>
                    ) : null,
                  )}
                  {schema.hasCost && (
                    <td className={`num ${mark('cost') ?? ''}`}>
                      <EditableCell
                        numeric
                        label={`Cost of ${entity.name}`}
                        value={String(entity.cost ?? '')}
                        display={entity.cost ?? '—'}
                        onCommit={(text) =>
                          saveNumber(row, text, (e, value) => {
                            const next = { ...e };
                            if (value === undefined) delete next.cost;
                            else next.cost = value;
                            return next;
                          })
                        }
                      />
                    </td>
                  )}
                  {schema.hasHp && (
                    <td className={`num ${mark('hp') ?? ''}`}>
                      <EditableCell
                        numeric
                        label={`HP of ${entity.name}`}
                        value={String(entity.hp ?? '')}
                        display={entity.hp ?? '—'}
                        onCommit={(text) =>
                          saveNumber(row, text, (e, value) => {
                            const next = { ...e };
                            if (value === undefined) delete next.hp;
                            else next.hp = value;
                            return next;
                          })
                        }
                      />
                    </td>
                  )}
                  {channelGroups.flatMap(({ channel, atk, def }) => {
                    const { key } = channel;
                    const cells = [];
                    if (atk) {
                      const value = entity.atk[key] ?? 0;
                      cells.push(
                        <td key={`atk-${key}`} className={`num group-start ${mark(`atk:${key}`) ?? ''}`}>
                          <EditableCell
                            numeric
                            label={`${statCode('atk', channels, key)} of ${entity.name}`}
                            value={value > 0 ? String(value) : ''}
                            display={
                              value > 0 ? (
                                <strong className={`value tone-${channelTone(channels, key)}`}>{value}</strong>
                              ) : (
                                <span className="faint">—</span>
                              )
                            }
                            onCommit={(text) =>
                              saveNumber(row, text, (e, parsed) => ({ ...e, atk: { ...e.atk, [key]: parsed ?? 0 } }))
                            }
                          />
                        </td>,
                      );
                    }
                    if (def) {
                      cells.push(
                        <td key={`def-${key}`} className={`num${atk ? '' : ' group-start'} ${mark(`def:${key}`) ?? ''}`}>
                          <EditableCell
                            numeric
                            label={`${statCode('def', channels, key)} of ${entity.name}`}
                            value={String(entity.def[key] ?? 0)}
                            display={entity.def[key] ?? 0}
                            onCommit={(text) =>
                              saveNumber(row, text, (e, value) => ({ ...e, def: { ...e.def, [key]: value ?? 0 } }))
                            }
                          />
                        </td>,
                      );
                    }
                    return cells;
                  })}
                  {schema.tagKeys.map((key) => (
                    <td key={`tag-${key}`} className={mark(`tag:${key}`)}>
                      <EditableCell
                        label={`${key} of ${entity.name}`}
                        value={entity.tags[key] ?? ''}
                        display={entity.tags[key] ?? '—'}
                        onCommit={(text) =>
                          save(row, { ...entity, tags: withKey(entity.tags, key, text.trim() === '' ? undefined : text.trim()) })
                        }
                      />
                    </td>
                  ))}
                  {schema.statKeys.map((key) => (
                    <td key={`stat-${key}`} className={`num ${mark(`stat:${key}`) ?? ''}`}>
                      <EditableCell
                        numeric
                        label={`${key} of ${entity.name}`}
                        value={String(entity.stats[key] ?? '')}
                        display={entity.stats[key] ?? '—'}
                        onCommit={(text) =>
                          saveNumber(
                            row,
                            text,
                            (e, value) => ({ ...e, stats: withKey(e.stats, key, value) }),
                            false,
                            true,
                          )
                        }
                      />
                    </td>
                  ))}
                  <td className="row-actions">
                    <button type="button" className="icon-button" onClick={() => onCompare(row.key)} aria-label={`Compare ${entity.name}`} title="Compare in Versus">
                      ⚔
                    </button>
                    <button type="button" className="icon-button" onClick={() => actions.duplicateEntity(row.key)} aria-label={`Duplicate ${entity.name}`} title="Duplicate">
                      ⧉
                    </button>
                    <button type="button" className="icon-button danger" onClick={() => remove(row)} aria-label={`Delete ${entity.name}`} title="Delete">
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && <p className="empty">{rows.length === 0 ? 'No entities. Add one to start.' : `No entity matches “${query}”.`}</p>}
      </div>
    </div>
  );
}

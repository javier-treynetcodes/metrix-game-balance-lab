import { useMemo, useState } from 'react';
import { validateEntity, type Entity } from '@metrix/core';
import { AttackBadge, ChannelDot } from '../../components/AttackBadge';
import { EditableCell } from '../../components/EditableCell';
import { plural } from '../../lib/format';
import { withKey } from '../../lib/record';
import { parseField } from '../../lib/parseField';
import {
  attackChoiceLabel,
  attackChoiceOf,
  blankEntity,
  channelLabel,
  withAttackChoice,
  type AttackChoice,
  type CatalogSchema,
} from '../../lib/schema';
import { changedFields, type Catalog, type Row } from '../../state/catalog';
import type { CatalogActions } from '../../state/useCatalog';

interface CatalogEditorProps {
  catalog: Catalog;
  schema: CatalogSchema;
  actions: CatalogActions;
  onCompare: (key: string) => void;
}

type SortKey = 'name' | 'cost' | 'hp';

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
          [entity.id, entity.name, entity.category ?? '', ...Object.values(entity.tags)].some((text) =>
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
    const problem = validateEntity(next, channels)[0];
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

  const sortHeader = (key: SortKey, label: string, numeric = false) => {
    const active = sort?.key === key;
    return (
      <th scope="col" className={numeric ? 'num' : undefined} aria-sort={active ? (sort.direction === 1 ? 'ascending' : 'descending') : 'none'}>
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
          <input type="search" value={query} placeholder="Name, id, category or tag" onChange={(event) => setQuery(event.target.value)} />
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
        Click a value to edit it. Whole numbers only. Changes are highlighted and update duels instantly. To add new
        columns, add them to your file from the template and import it again.
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
              {sortHeader('name', 'Name · id')}
              {schema.hasCategory && <th scope="col">Category</th>}
              {schema.hasCost && sortHeader('cost', 'Cost', true)}
              {schema.hasHp && sortHeader('hp', 'HP', true)}
              <th scope="col">Attack</th>
              {schema.defChannels.map((key) => (
                <th key={`def-${key}`} scope="col" className="num">
                  <ChannelDot channels={channels} channelKey={key} /> {channelLabel(channels, key)} def
                </th>
              ))}
              {schema.hybridDefChannels.map((key) => (
                <th key={`hdef-${key}`} scope="col" className="num">
                  <span className="dot tone-hybrid" aria-hidden="true" /> Hybrid armor {channelLabel(channels, key)}
                </th>
              ))}
              {schema.tagKeys.map((key) => (
                <th key={`tag-${key}`} scope="col">
                  {key}
                </th>
              ))}
              {schema.statKeys.map((key) => (
                <th key={`stat-${key}`} scope="col" className="num">
                  {key}
                </th>
              ))}
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const { entity } = row;
              const changed = changedFields(original.get(row.key), entity);
              const isNew = changed.has('*');
              const mark = (field: string) => (isNew || changed.has(field) ? 'is-changed' : undefined);
              const choice = attackChoiceOf(entity);
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
                  {schema.hasCategory && (
                    <td className={mark('category')}>
                      <EditableCell
                        label={`Category of ${entity.name}`}
                        value={entity.category ?? ''}
                        display={entity.category ?? '—'}
                        onCommit={(text) => {
                          const next = { ...entity };
                          if (text.trim() === '') delete next.category;
                          else next.category = text.trim();
                          return save(row, next);
                        }}
                      />
                    </td>
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
                  <td className={`attack-cell ${mark('attack') ?? ''}`}>
                    <div className="attack-editor">
                      <select
                        aria-label={`Attack type of ${entity.name}`}
                        value={choice}
                        onChange={(event) => save(row, withAttackChoice(entity, event.target.value as AttackChoice, channels))}
                      >
                        {schema.attackChoices.map((option) => (
                          <option key={option} value={option}>
                            {attackChoiceLabel(option, channels)}
                          </option>
                        ))}
                      </select>
                      {choice.startsWith('ch:') && (
                        <EditableCell
                          numeric
                          label={`${attackChoiceLabel(choice, channels)} attack of ${entity.name}`}
                          value={String(entity.atk[choice.slice(3)] ?? 0)}
                          display={entity.atk[choice.slice(3)] ?? 0}
                          onCommit={(text) =>
                            saveNumber(row, text, (e, value) => ({ ...e, atk: { ...e.atk, [choice.slice(3)]: value ?? 0 } }))
                          }
                        />
                      )}
                      {choice === 'hybrid' &&
                        channels.map((channel) => (
                          <span key={channel.key} className="hybrid-part">
                            <ChannelDot channels={channels} channelKey={channel.key} />
                            <EditableCell
                              numeric
                              label={`Hybrid ${channel.label} attack of ${entity.name}`}
                              value={String(entity.hybridAtk?.[channel.key] ?? 0)}
                              display={entity.hybridAtk?.[channel.key] ?? 0}
                              onCommit={(text) =>
                                saveNumber(row, text, (e, value) => ({
                                  ...e,
                                  hybridAtk: { ...e.hybridAtk, [channel.key]: value ?? 0 },
                                }))
                              }
                            />
                          </span>
                        ))}
                    </div>
                  </td>
                  {schema.defChannels.map((key) => (
                    <td key={`def-${key}`} className={`num ${mark(`def:${key}`) ?? ''}`}>
                      <EditableCell
                        numeric
                        label={`${channelLabel(channels, key)} defense of ${entity.name}`}
                        value={String(entity.def[key] ?? 0)}
                        display={entity.def[key] ?? 0}
                        onCommit={(text) => saveNumber(row, text, (e, value) => ({ ...e, def: { ...e.def, [key]: value ?? 0 } }))}
                      />
                    </td>
                  ))}
                  {schema.hybridDefChannels.map((key) => (
                    <td key={`hdef-${key}`} className={`num ${mark(`hybridDef:${key}`) ?? ''}`}>
                      <EditableCell
                        numeric
                        label={`Hybrid armor ${channelLabel(channels, key)} of ${entity.name}`}
                        value={String(entity.hybridDef[key] ?? '')}
                        display={entity.hybridDef[key] ?? '—'}
                        onCommit={(text) =>
                          saveNumber(row, text, (e, value) => ({ ...e, hybridDef: withKey(e.hybridDef, key, value) }))
                        }
                      />
                    </td>
                  ))}
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
                    <AttackBadge entity={entity} channels={channels} />
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

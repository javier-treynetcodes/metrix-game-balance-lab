import { useRef, useState, type KeyboardEvent } from 'react';
import { IssueList } from '../import/IssueList';
import { plural } from '../../lib/format';
import type { Catalog } from '../../state/catalog';
import type { ChannelPatch } from '../../state/useCatalog';
import { CatalogTable } from './CatalogTable';
import { DefenseRules } from './DefenseRules';
import { DuelMatrix } from './DuelMatrix';

const TABS = [
  { id: 'catalog', label: 'Catalog' },
  { id: 'defense', label: 'Defense rules' },
  { id: 'duels', label: 'Duels' },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface WorkspaceProps {
  catalog: Catalog;
  onImportAnother: () => void;
  onClear: () => void;
  onChannelChange: (key: string, patch: ChannelPatch) => void;
  onDismissWarnings: () => void;
}

export function Workspace({ catalog, onImportAnother, onClear, onChannelChange, onDismissWarnings }: WorkspaceProps) {
  const [tab, setTab] = useState<TabId>('catalog');
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});
  const { entities, channels, warnings } = catalog;

  // Arrow keys move between tabs, as in the WAI-ARIA tabs pattern.
  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const index = TABS.findIndex((candidate) => candidate.id === tab);
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = TABS[(index + step + TABS.length) % TABS.length];
    if (!next) return;
    setTab(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <div className="workspace">
      <section className="panel summary" aria-labelledby="catalog-title">
        <div>
          <h1 id="catalog-title">{catalog.source}</h1>
          <p className="muted">
            {plural(entities.length, 'entity', 'entities')} · {plural(channels.length, 'damage channel')} · imported{' '}
            {new Date(catalog.importedAt).toLocaleString()}
          </p>
        </div>
        <div className="button-row">
          <button type="button" className="button" onClick={onImportAnother}>
            Import another file
          </button>
          <button type="button" className="button button-ghost" onClick={onClear}>
            Clear data
          </button>
        </div>
      </section>

      {warnings.length > 0 && (
        <details className="panel warnings">
          <summary>
            Imported with {plural(warnings.length, 'warning')}. Some data was ignored or left out of parts of the analysis.
          </summary>
          <IssueList issues={warnings} />
          <button type="button" className="button button-ghost" onClick={onDismissWarnings}>
            Dismiss warnings
          </button>
        </details>
      )}

      <div className="panel tabs-panel">
        <div role="tablist" aria-label="Analysis" className="tabs" onKeyDown={onTabKeyDown}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              ref={(node) => {
                tabRefs.current[id] = node;
              }}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              className="tab"
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'catalog' && <CatalogTable channels={channels} entities={entities} />}
          {tab === 'defense' && <DefenseRules channels={channels} entities={entities} onChange={onChannelChange} />}
          {tab === 'duels' && <DuelMatrix channels={channels} entities={entities} />}
        </div>
      </div>
    </div>
  );
}

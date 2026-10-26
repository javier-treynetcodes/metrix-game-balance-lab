import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { exportCsv, type Genre } from '@metrix/core';
import { IssueList } from '../import/IssueList';
import { MoreMenu } from '../../components/MoreMenu';
import { HeartIcon } from '../../components/Icons';
import { downloadText } from '../../lib/download';
import { readRoute, writeRoute, type TabId } from '../../lib/hashRoute';
import { LINKS } from '../../lib/links';
import { readFlag, writeFlag } from '../../lib/storage';
import { plural } from '../../lib/format';
import { GENRES, genreProfile } from '../../lib/genres';
import { catalogSchema } from '../../lib/schema';
import { countChanges, type Catalog } from '../../state/catalog';
import type { CatalogActions } from '../../state/useCatalog';
import { CatalogEditor } from './CatalogEditor';
import { DamageRules } from './DamageRules';
import { DuelMatrix } from './DuelMatrix';
import { GenrePicker } from './GenrePicker';
import { Guide } from './Guide';
import { metricNameFor } from './genreText';
import { Versus } from './Versus';

const TABS: readonly { id: TabId; label: string }[] = [
  { id: 'catalog', label: 'Catalog' },
  { id: 'rules', label: 'Damage rules' },
  { id: 'duels', label: 'Duels' },
  { id: 'versus', label: 'Versus' },
];

const SPONSOR_NUDGE_DISMISSED = 'metrix:sponsor-nudge-dismissed';

interface WorkspaceProps {
  catalog: Catalog;
  actions: CatalogActions;
  onImportAnother: () => void;
  onClear: () => void;
}

function exportFileName(source: string): string {
  const base = source.replace(/\.[^.]+$/, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${base || 'catalog'}-metrix-${new Date().toISOString().slice(0, 10)}.csv`;
}

export function Workspace({ catalog, actions, onImportAnother, onClear }: WorkspaceProps) {
  const [initialRoute] = useState(readRoute);
  const [tab, setTabState] = useState<TabId>(initialRoute.tab);
  const [visited, setVisited] = useState<Set<TabId>>(() => new Set([initialRoute.tab]));
  const setTab = (next: TabId) => {
    setTabState(next);
    setVisited((current) => (current.has(next) ? current : new Set([...current, next])));
  };
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});
  const { rows, channels, warnings } = catalog;
  const [confirm, setConfirm] = useState<'clear' | 'import' | null>(null);
  const [exported, setExported] = useState<string | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(() => readFlag(SPONSOR_NUDGE_DISMISSED));
  const schema = useMemo(() => catalogSchema(catalog), [catalog]);
  const genre = genreProfile(catalog.genre);
  const changes = countChanges(catalog);
  const unexported = catalog.revision !== catalog.exportedRevision;
  const [genreNotice, setGenreNotice] = useState('');

  const [pair, setPair] = useState<[string, string]>(() => {
    const keyOf = (id: string | undefined) => rows.find((row) => row.entity.id === id)?.key;
    const [a, b] = initialRoute.versus ?? [];
    return [keyOf(a) ?? rows[0]?.key ?? '', keyOf(b) ?? rows[1]?.key ?? rows[0]?.key ?? ''];
  });
  // Keep the Versus pair valid when entities are deleted.
  const validPair: [string, string] = [
    rows.some((row) => row.key === pair[0]) ? pair[0] : (rows[0]?.key ?? ''),
    rows.some((row) => row.key === pair[1]) ? pair[1] : (rows[1]?.key ?? rows[0]?.key ?? ''),
  ];

  const pendingChanges = unexported && changes > 0;

  // Deep links: the address bar always reflects the open tab (and the Versus pair).
  const idOf = (key: string) => rows.find((row) => row.key === key)?.entity.id ?? '';
  const versusIds: [string, string] = [idOf(validPair[0]), idOf(validPair[1])];
  useEffect(() => {
    if (!catalog.genre) return;
    writeRoute(tab === 'versus' && versusIds[0] && versusIds[1] ? { tab, versus: versusIds } : { tab });
    // Bring the active tab into view inside the tab bar only (scrollIntoView would also scroll the page).
    const button = tabRefs.current[tab];
    const bar = button?.parentElement;
    if (button && bar) {
      const left = button.offsetLeft - bar.offsetLeft;
      if (left < bar.scrollLeft || left + button.offsetWidth > bar.scrollLeft + bar.clientWidth) {
        bar.scrollLeft = left - 16;
      }
    }
  }, [tab, versusIds[0], versusIds[1], catalog.genre]); // eslint-disable-line react-hooks/exhaustive-deps

  const { undo, redo } = actions;
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

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

  const exportFile = () => {
    downloadText(
      exportFileName(catalog.source),
      exportCsv(catalog.layout, channels, rows.map((row) => row.entity)),
    );
    actions.markExported();
    setExported(exportFileName(catalog.source));
  };

  const askImport = () => (pendingChanges ? setConfirm('import') : onImportAnother());

  const pickGenre = (next: Genre, announce = true) => {
    actions.setGenre(next);
    const profile = genreProfile(next);
    if (announce) setGenreNotice(`${profile.name}: duels now rank by ${metricNameFor(profile)}. Your data hasn't changed.`);
  };

  if (!catalog.genre) {
    return (
      <div className="workspace">
        <GenrePicker onPick={(next) => pickGenre(next, false)} />
      </div>
    );
  }

  return (
    <div className="workspace">
      <section className="panel summary" aria-labelledby="catalog-title">
        <div className="summary-main">
          <h1 id="catalog-title">{catalog.source}</h1>
          <p className="muted">
            {plural(rows.length, 'entity', 'entities')} · imported {new Date(catalog.importedAt).toLocaleString()}
          </p>
          <div className="summary-meta">
            <label className="genre-chip">
              <span className="visually-hidden">Genre</span>
              <select value={genre.id} onChange={(event) => pickGenre(event.target.value as Genre)}>
                {GENRES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            {changes > 0 ? (
              <span className="changes">
                {plural(changes, 'change')} since import ·{' '}
                <button type="button" className="link-button" onClick={actions.revertAll}>
                  Revert all
                </button>
              </span>
            ) : (
              <span className="muted small">No changes since import</span>
            )}
          </div>
        </div>
        <div className="summary-actions">
          <div className="button-row">
            <button type="button" className="button button-ghost" onClick={actions.undo} disabled={!actions.canUndo} title="Undo (Ctrl/Cmd+Z)">
              ↶ Undo
            </button>
            <button type="button" className="button button-ghost" onClick={actions.redo} disabled={!actions.canRedo} title="Redo (Ctrl/Cmd+Shift+Z)">
              ↷ Redo
            </button>
            <button type="button" className="button button-primary export-button" onClick={exportFile}>
              Export CSV
              {unexported && <span className="unsaved-dot" aria-label="Changes not exported yet" />}
            </button>
            <MoreMenu
              label="More actions"
              items={[
                { label: 'Import another file', onSelect: askImport },
                { label: 'Clear data…', onSelect: () => setConfirm('clear'), danger: true },
              ]}
            />
          </div>
        </div>
        {confirm && (
          <div className="confirm-bar" role="alertdialog" aria-labelledby="confirm-text">
            <p id="confirm-text">
              {confirm === 'clear'
                ? `Delete this catalog${changes > 0 ? ` and its ${plural(changes, 'change')}` : ''} from this browser? This cannot be undone.${pendingChanges ? ' Your changes are not exported yet.' : ''}`
                : `You have ${plural(changes, 'change')} not exported. Importing another file replaces this catalog.`}
            </p>
            <div className="button-row">
              {pendingChanges && (
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    exportFile();
                    setConfirm(null);
                  }}
                >
                  Export first
                </button>
              )}
              <button
                type="button"
                className="button button-danger"
                onClick={() => {
                  const action = confirm;
                  setConfirm(null);
                  if (action === 'clear') {
                    writeRoute({ tab: 'catalog' });
                    onClear();
                  } else onImportAnother();
                }}
              >
                {confirm === 'clear' ? 'Delete catalog' : 'Continue to import'}
              </button>
              <button type="button" className="button button-ghost" onClick={() => setConfirm(null)} autoFocus>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
      {exported && (
        <div className="export-toast" role="status">
          <p>
            <strong>Exported ✓</strong> {exported}
            {!nudgeDismissed && (
              <>
                {' '}
                · If Métrix saved you time, consider{' '}
                <a href={LINKS.sponsor} target="_blank" rel="noreferrer" className="sponsor-link">
                  <HeartIcon /> sponsoring it
                </a>
                .
              </>
            )}
          </p>
          <button
            type="button"
            className="icon-button"
            aria-label="Close"
            onClick={() => {
              setExported(null);
              if (!nudgeDismissed) {
                writeFlag(SPONSOR_NUDGE_DISMISSED);
                setNudgeDismissed(true);
              }
            }}
          >
            ✕
          </button>
        </div>
      )}
      {genreNotice && (
        <p className="notice genre-notice" role="status">
          {genreNotice}
        </p>
      )}

      {warnings.length > 0 && (
        <details className="panel warnings">
          <summary>
            Imported with {plural(warnings.length, 'warning')}. Some data was kept as is and not analyzed.
          </summary>
          <IssueList issues={warnings} />
          <button type="button" className="button button-ghost" onClick={actions.dismissWarnings}>
            Dismiss warnings
          </button>
        </details>
      )}

      {catalog.source === 'Example catalog' && (
        <Guide
          edited={changes > 0}
          visitedDuels={visited.has('duels')}
          visitedVersus={visited.has('versus')}
          onGo={setTab}
        />
      )}

      <div className="panel tabs-panel">
        <div role="tablist" aria-label="Workspace" className="tabs" onKeyDown={onTabKeyDown}>
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
          {tab === 'catalog' && (
            <CatalogEditor
              catalog={catalog}
              schema={schema}
              actions={actions}
              onCompare={(key) => {
                const other = rows.find((row) => row.key !== key)?.key ?? key;
                setPair([key, validPair[1] === key ? other : validPair[1]]);
                setTab('versus');
              }}
            />
          )}
          {tab === 'rules' && (
            <DamageRules channels={channels} entities={rows.map((row) => row.entity)} onRename={actions.renameChannel} />
          )}
          {tab === 'duels' && (
            <>
              <p className="how-to-read muted small">
                <strong>How to read this ({genre.name}):</strong> {genre.howToRead}
              </p>
              <DuelMatrix
                key={genre.id}
                channels={channels}
                rows={rows}
                genre={genre}
                onOpen={(attacker, defender) => {
                  setPair([attacker, defender]);
                  setTab('versus');
                }}
              />
            </>
          )}
          {tab === 'versus' && (
            <Versus
              key={validPair.join('|')}
              rows={rows}
              channels={channels}
              schema={schema}
              genre={genre}
              pair={validPair}
              onPairChange={setPair}
              onApply={actions.updateEntities}
            />
          )}
        </div>
      </div>
    </div>
  );
}

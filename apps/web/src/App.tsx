/**
 * @file Application shell: header, main content (welcome/import or workspace) and footer.
 */

import { useState } from 'react';
import { AppHeader } from './features/shell/AppHeader';
import { AppFooter } from './features/shell/AppFooter';
import { ImportPanel } from './features/import/ImportPanel';
import { Welcome } from './features/welcome/Welcome';
import { Workspace } from './features/workspace/Workspace';
import { useCatalog } from './state/useCatalog';

/**
 * Root component. Shows the welcome and import screens until a catalog is loaded, then the
 * workspace. "Import another file" swaps back to the import screen without losing the current
 * catalog until the new one imports successfully.
 */
export function App() {
  const { catalog, discardedLegacy, replace, ...actions } = useCatalog();
  const [importing, setImporting] = useState(false);

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <AppHeader />
      <main id="main" className="app-main">
        {catalog && !importing ? (
          <Workspace
            key={catalog.importedAt}
            catalog={catalog}
            actions={actions}
            onImportAnother={() => setImporting(true)}
            onClear={() => replace(null)}
          />
        ) : (
          <div className="stack">
            {!catalog && <Welcome />}
            <ImportPanel
              legacyNotice={discardedLegacy && !catalog}
              onImported={(next) => {
                replace(next);
                setImporting(false);
              }}
              {...(catalog ? { onCancel: () => setImporting(false) } : {})}
            />
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}

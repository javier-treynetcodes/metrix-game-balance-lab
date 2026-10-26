import { useState } from 'react';
import { AppHeader } from './features/shell/AppHeader';
import { AppFooter } from './features/shell/AppFooter';
import { ImportPanel } from './features/import/ImportPanel';
import { Welcome } from './features/welcome/Welcome';
import { Workspace } from './features/workspace/Workspace';
import { useCatalog } from './state/useCatalog';

export function App() {
  const { catalog, setCatalog, updateChannel, dismissWarnings } = useCatalog();
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
            onImportAnother={() => setImporting(true)}
            onClear={() => setCatalog(null)}
            onChannelChange={updateChannel}
            onDismissWarnings={dismissWarnings}
          />
        ) : (
          <div className="stack">
            {!catalog && <Welcome />}
            <ImportPanel
              onImported={(next) => {
                setCatalog(next);
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

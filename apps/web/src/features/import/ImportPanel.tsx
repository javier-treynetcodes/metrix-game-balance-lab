/**
 * @file Import screen: file input, template actions, example data and the error report.
 */

import { useRef, useState, type DragEvent } from 'react';
import { CSV_TEMPLATE, CSV_TEMPLATE_FILE_NAME } from '@metrix/core';
import { copyText, downloadText } from '../../lib/download';
import { plural } from '../../lib/format';
import type { Catalog } from '../../state/catalog';
import { ACCEPT_ATTRIBUTE, importFile, importText, type ImportOutcome } from './importFile';
import { IssueList } from './IssueList';

interface ImportPanelProps {
  onImported: (catalog: Catalog) => void;
  /** Shown when a catalog is already loaded, to go back without importing. */
  onCancel?: () => void;
  /** A catalog saved by an older version of Métrix was discarded. */
  legacyNotice?: boolean;
}

type Failure = Exclude<ImportOutcome, { kind: 'imported' }>;

/**
 * Entry point for data: drag and drop, file picker, template download/copy and example data.
 * A file that fails to import shows every problem at once and loads nothing; a valid one
 * is handed to `onImported`.
 */
export function ImportPanel({ onImported, onCancel, legacyNotice = false }: ImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [notice, setNotice] = useState('');

  const handle = (outcome: ImportOutcome) => {
    if (outcome.kind === 'imported') {
      setFailure(null);
      onImported(outcome.catalog);
    } else {
      setFailure(outcome);
    }
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setNotice('');
    try {
      handle(await importFile(file));
    } catch {
      setFailure({
        kind: 'rejected',
        source: file.name,
        message: 'The file could not be read. Check that it is not open in another app and try again.',
      });
    } finally {
      setBusy(false);
      // Allow choosing the same file again after fixing it.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void readFile(event.dataTransfer.files[0]);
  };

  const copyTemplate = async () => {
    const copied = await copyText(CSV_TEMPLATE);
    setNotice(copied ? 'Template copied. Paste it into a spreadsheet.' : 'Copying is blocked in this browser. Use Download template instead.');
  };

  const errorCount =
    failure?.kind === 'invalid' ? failure.result.issues.filter((issue) => issue.severity === 'error').length : 0;

  return (
    <section className="panel import-panel" aria-labelledby="import-title">
      <div className="section-head">
        <div>
          <h2 id="import-title">Import your catalog</h2>
          <p className="muted">
            One CSV row per card, champion, unit or weapon. The file is read in your browser and never uploaded.
          </p>
        </div>
        {onCancel && (
          <button type="button" className="button button-ghost" onClick={onCancel}>
            Back to current catalog
          </button>
        )}
      </div>

      {legacyNotice && (
        <p className="legacy-notice">
          Métrix now uses whole numbers, two damage channels and hybrid attacks. Your previous catalog was saved in the old
          format: import your file again (or start from the new template) to keep working.
        </p>
      )}

      <div
        className={`dropzone${dragging ? ' is-dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <p className="dropzone-title">{busy ? 'Checking your file…' : 'Drag your CSV file here'}</p>
        <p className="muted">or</p>
        <button type="button" className="button button-primary" onClick={() => inputRef.current?.click()} disabled={busy}>
          Choose CSV file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => void readFile(event.target.files?.[0])}
        />
      </div>

      <div className="template-row">
        <div>
          <h3>No file yet?</h3>
          <p className="muted">Start from the template, or explore Métrix with example data first.</p>
        </div>
        <div className="button-row">
          <button type="button" className="button" onClick={() => downloadText(CSV_TEMPLATE_FILE_NAME, CSV_TEMPLATE)}>
            Download template
          </button>
          <button type="button" className="button" onClick={() => void copyTemplate()}>
            Copy template
          </button>
          <button type="button" className="button" onClick={() => handle(importText(CSV_TEMPLATE, 'Example catalog'))}>
            Try with example data
          </button>
        </div>
      </div>
      <p className="notice" role="status" aria-live="polite">
        {notice}
      </p>

      {failure && (
        <div className="import-report" role="alert">
          <h3>
            {failure.kind === 'invalid'
              ? `${failure.source} was not imported: ${plural(errorCount, 'error')} to fix`
              : `${failure.source} was not imported`}
          </h3>
          {failure.kind === 'invalid' ? (
            <>
              <p className="muted">Nothing is loaded until every error is fixed. Correct the file and import it again.</p>
              <IssueList issues={failure.result.issues} />
            </>
          ) : (
            <p>{failure.message}</p>
          )}
        </div>
      )}
    </section>
  );
}

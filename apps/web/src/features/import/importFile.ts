/**
 * @file Turns a dropped/picked file or text into a catalog, or explains why it cannot.
 */

import { importEntities, type ImportResult } from '@metrix/core';
import { createCatalog, type Catalog } from '../../state/catalog';

/** Larger files are almost certainly not a catalog and would freeze the tab while parsing. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = ['.csv', '.tsv', '.txt'];

/** Value for the file input's `accept` attribute, so the picker suggests text and CSV files first. */
export const ACCEPT_ATTRIBUTE = [...ACCEPTED_EXTENSIONS, 'text/csv', 'text/tab-separated-values'].join(',');

/**
 * What happened to an import attempt:
 * - `imported`: the file was valid and became a catalog.
 * - `invalid`: the importer found errors; `result` lists them.
 * - `rejected`: the file was refused before parsing (wrong type, too large, unreadable, no rows).
 */
export type ImportOutcome =
  | { kind: 'imported'; catalog: Catalog }
  | { kind: 'invalid'; source: string; result: ImportResult }
  | { kind: 'rejected'; source: string; message: string };

/**
 * Checks the file type and size, reads it as text and imports it.
 * Never throws for bad content: every problem comes back as an outcome to show the user.
 */
export async function importFile(file: File): Promise<ImportOutcome> {
  const dot = file.name.lastIndexOf('.');
  const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return {
      kind: 'rejected',
      source: file.name,
      message:
        'Métrix reads CSV files. In Excel, Google Sheets or Numbers, export your sheet as CSV and import that file.',
    };
  }
  if (file.size > MAX_FILE_BYTES) {
    return {
      kind: 'rejected',
      source: file.name,
      message: 'The file is larger than 10 MB. Check that it is the catalog export and not a different file.',
    };
  }
  return importText(await file.text(), file.name);
}

/**
 * Imports CSV text that is already in memory (a read file or the built-in example).
 * `source` is the name shown in the workspace header.
 */
export function importText(text: string, source: string): ImportOutcome {
  const result = importEntities(text);
  if (!result.ok) return { kind: 'invalid', source, result };
  if (result.entities.length === 0) {
    return {
      kind: 'rejected',
      source,
      message: 'The file has a header row but no entities. Add one row per entity below the header.',
    };
  }
  return {
    kind: 'imported',
    catalog: createCatalog(source, result.layout, result.channels, result.entities, result.issues),
  };
}

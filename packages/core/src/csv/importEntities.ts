/**
 * @file CSV importer: turns a file into channels and entities, or a complete list of problems.
 */

import type { Channel, Entity } from '../types';
import { ENTITY_MESSAGES, validateEntity, type EntityProblemCode } from '../validateEntity';
import { classifyHeader, type ColumnRole } from './columns';
import { parseCsv, type CsvSyntaxError, type Delimiter } from './parseCsv';
import { parseInteger } from './parseInteger';

/**
 * Every problem the importer can report. Errors block the import; warnings only inform.
 * The entity-level codes come from `validateEntity`, so the import and the editor share them.
 */
export type ImportIssueCode =
  | 'empty-file'
  | 'unclosed-quote'
  | 'stray-quote'
  | 'missing-column'
  | 'duplicate-column'
  | 'empty-header'
  | 'too-many-channels'
  | 'hybrid-needs-two-channels'
  | 'missing-hybrid-column'
  | 'reserved-column'
  | 'row-too-long'
  | 'row-too-short'
  | 'duplicate-id'
  | 'not-a-whole-number'
  | EntityProblemCode
  | 'text-column-ignored'
  | 'unsupported-column'
  | 'rate-not-used'
  | 'missing-cost'
  | 'missing-hp';

/**
 * One problem found in the file. Issues with the same code and column are merged,
 * so each one lists every affected line instead of repeating the message.
 */
export interface ImportIssue {
  severity: 'error' | 'warning';
  code: ImportIssueCode;
  message: string;
  /** Column header as written in the file. */
  column?: string;
  /** 1-based source line numbers affected. */
  lines?: number[];
}

/** How the source file was laid out, so an export can keep the same columns, order and separator. */
export interface CsvLayout {
  delimiter: Delimiter;
  /** Headers as written in the file (trimmed), in order. */
  headers: string[];
}

/**
 * Outcome of `importEntities`. When `ok` is false, `channels` and `entities` are empty:
 * the import is all or nothing so an analysis never runs on a silently incomplete catalog.
 */
export interface ImportResult {
  /** True when there are no errors. Warnings do not block the import. */
  ok: boolean;
  delimiter: Delimiter;
  layout: CsvLayout;
  channels: Channel[];
  entities: Entity[];
  issues: ImportIssue[];
}

type Role = ColumnRole | { kind: 'ignored' };

interface Column {
  /** Header as written in the file (trimmed). */
  name: string;
  role: Role;
}

/** Métrix compares exactly this many damage channels. */
export const CHANNEL_COUNT = 2;

const DELIMITER_NAMES: Record<Delimiter, string> = { ',': 'comma', ';': 'semicolon', '\t': 'tab' };

const QUOTE_MESSAGES: Record<CsvSyntaxError['code'], string> = {
  'unclosed-quote':
    'A value opened with a double quote is never closed. Add the closing double quote. Fix quote errors first, then import again to check the rest of the file.',
  'stray-quote':
    'A double quote appears inside a value that is not wrapped in quotes. Wrap the whole value in double quotes and double the inner quote, e.g. "12"" Cannon". Fix quote errors first, then import again to check the rest of the file.',
};

/** Default display name of a channel: "Channel N" for numeric keys, otherwise the key capitalized. */
export function labelFor(key: string): string {
  if (/^\d+$/.test(key)) return `Channel ${key}`;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

class IssueLog {
  private readonly byKey = new Map<string, ImportIssue>();

  add(issue: Omit<ImportIssue, 'lines'>, line?: number): void {
    const key = `${issue.code}|${issue.column ?? ''}`;
    let entry = this.byKey.get(key);
    if (!entry) {
      entry = { ...issue };
      this.byKey.set(key, entry);
    }
    if (line === undefined) return;
    entry.lines ??= [];
    if (entry.lines.at(-1) !== line) entry.lines.push(line);
  }

  hasErrors(): boolean {
    return this.all.some((issue) => issue.severity === 'error');
  }

  get all(): ImportIssue[] {
    return [...this.byKey.values()];
  }
}

/**
 * Imports a CSV catalog that follows the Métrix template (see `CSV_TEMPLATE`).
 * Every game value must be a whole number of 0 or more. All or nothing: any error rejects the
 * whole file, and every error is reported at once with the lines to fix.
 * Pure and synchronous: safe to run in a Web Worker.
 */
export function importEntities(text: string): ImportResult {
  const { delimiter, records, syntaxErrors } = parseCsv(text);
  const log = new IssueLog();
  let headers: string[] = [];
  const result = (channels: Channel[], entities: Entity[]): ImportResult => {
    const issues = log.all;
    const ok = !log.hasErrors();
    return {
      ok,
      delimiter,
      layout: { delimiter, headers },
      channels: ok ? channels : [],
      entities: ok ? entities : [],
      issues,
    };
  };

  // Quote errors shift every following cell, so later checks would only produce noise.
  if (syntaxErrors.length > 0) {
    for (const { code, line } of syntaxErrors) {
      log.add({ severity: 'error', code, message: QUOTE_MESSAGES[code] }, line);
    }
    return result([], []);
  }

  const [headerRecord, ...dataRows] = records;
  if (!headerRecord) {
    log.add({
      severity: 'error',
      code: 'empty-file',
      message: 'The file is empty. Download the template and fill it with your catalog.',
    });
    return result([], []);
  }

  // Resolve every header to its role.
  headers = headerRecord.cells.map((cell) => cell.trim());
  const seen = new Set<string>();
  const columns: Column[] = headers.map((name) => ({ name, role: resolveRole(name) }));

  function resolveRole(original: string): Role {
    if (original === '') {
      log.add({ severity: 'warning', code: 'empty-header', message: 'A column without a header was kept as is and not analyzed.' });
      return { kind: 'ignored' };
    }
    const canonical = original.toLowerCase();
    if (seen.has(canonical)) {
      log.add({
        severity: 'error',
        code: 'duplicate-column',
        message: `Column "${original}" appears more than once (names are not case-sensitive). Keep one and delete the others.`,
        column: original,
      });
      return { kind: 'ignored' };
    }
    seen.add(canonical);
    const role = classifyHeader(canonical);
    switch (role.kind) {
      case 'unsupported':
        log.add({
          severity: 'warning',
          code: 'unsupported-column',
          message: `Column "${original}" is not supported and was kept as is.`,
          column: original,
        });
        return { kind: 'ignored' };
      case 'rate':
        log.add({
          severity: 'warning',
          code: 'rate-not-used',
          message: `Métrix compares entities by hits, not by attack speed, so column "${original}" was kept as is and not analyzed.`,
          column: original,
        });
        return { kind: 'ignored' };
      case 'reserved':
        log.add({
          severity: 'error',
          code: 'reserved-column',
          message: `Column "${original}" is not valid. Hybrid columns name a channel: atk:hybrid:1 and atk:hybrid:2 for attack, def:hybrid:1 and def:hybrid:2 for armor.`,
          column: original,
        });
        return { kind: 'ignored' };
      default:
        return role;
    }
  }

  for (const required of ['id', 'name'] as const) {
    if (!columns.some(({ role }) => role.kind === required)) {
      log.add({
        severity: 'error',
        code: 'missing-column',
        message: `Required column "${required}" is missing. Add it to the header row, as in the template.`,
        column: required,
      });
    }
  }

  // Channels in order of first appearance, at most two.
  const channelKeys: string[] = [];
  for (const { role } of columns) {
    if ('channel' in role && !channelKeys.includes(role.channel)) channelKeys.push(role.channel);
  }
  if (channelKeys.length > CHANNEL_COUNT) {
    log.add({
      severity: 'error',
      code: 'too-many-channels',
      message: `Métrix works with two damage channels, and this file has ${channelKeys.length}: ${channelKeys.join(', ')}. Keep two, and turn attacks that hit both into hybrid attacks with atk:hybrid:<channel> columns.`,
    });
  }
  const hybridAttackChannels = columns.flatMap(({ role }) => (role.kind === 'hybridAtk' ? [role.channel] : []));
  if (hybridAttackChannels.length > 0) {
    if (channelKeys.length < CHANNEL_COUNT) {
      log.add({
        severity: 'error',
        code: 'hybrid-needs-two-channels',
        message: 'Hybrid attacks hit two channels, but this file has only one. Add the atk: and def: columns of the second channel.',
      });
    } else {
      for (const key of channelKeys) {
        if (!hybridAttackChannels.includes(key)) {
          log.add({
            severity: 'error',
            code: 'missing-hybrid-column',
            message: `Hybrid attacks need one column per channel. Add column "atk:hybrid:${key}".`,
            column: `atk:hybrid:${key}`,
          });
        }
      }
    }
  }
  if (log.hasErrors()) return result([], []);

  const channels: Channel[] = channelKeys.map((key) => ({ key, label: labelFor(key) }));

  // Extra columns are analyzed only when every value is a whole number; otherwise they are kept as is.
  columns.forEach((column, index) => {
    const { role } = column;
    if (role.kind !== 'stat') return;
    const hasText = dataRows.some(({ cells }) => Number.isNaN(parseInteger(cells[index] ?? '')));
    if (hasText) {
      log.add({
        severity: 'warning',
        code: 'text-column-ignored',
        message: `Column "${column.name}" is not made of whole numbers, so it was kept as is and not analyzed. Rename it to "tag:${role.key}" to use it as a tag.`,
        column: column.name,
      });
      column.role = { kind: 'ignored' };
    }
  });

  const separatorName = DELIMITER_NAMES[delimiter];
  const hasCost = columns.some(({ role }) => role.kind === 'cost');
  const entities: Entity[] = [];
  const ids = new Set<string>();

  dataRows.forEach(({ cells: row, line }) => {
    if (row.length !== columns.length) {
      const tooLong = row.length > columns.length;
      log.add(
        {
          severity: 'error',
          code: tooLong ? 'row-too-long' : 'row-too-short',
          message: tooLong
            ? `Some rows have more cells than the header. Text that contains a ${separatorName} must be wrapped in double quotes, e.g. "Ranged Unit${delimiter === '\t' ? '\t' : delimiter} Elite".`
            : `Some rows have fewer cells than the header. Every row needs one cell per column, even when empty: keep the ${separatorName}s between empty cells.`,
        },
        line,
      );
      return;
    }

    const entity: Entity = { id: '', name: '', atk: {}, def: {}, hybridDef: {}, tags: {}, stats: {}, extra: {} };
    const hybrid: Record<string, number> = {};
    let hybridCells = 0;
    let rowValid = true;

    // Row length was validated above, so every cell has a matching column.
    row.forEach((cell, index) => {
      const { name: column, role } = columns[index] as Column;
      const raw = cell.trim();

      switch (role.kind) {
        case 'id':
          entity.id = raw;
          return;
        case 'name':
          entity.name = raw;
          return;
        case 'category':
          if (raw !== '') entity.category = raw;
          return;
        case 'tag':
          if (raw !== '') entity.tags[role.key] = raw;
          return;
        case 'ignored':
          entity.extra[String(index)] = cell;
          return;
        case 'stat': {
          const value = parseInteger(raw);
          if (value !== undefined) entity.stats[role.key] = value;
          return;
        }
      }

      const value = parseInteger(raw);
      if (value !== undefined && (Number.isNaN(value) || value < 0)) {
        log.add(
          {
            severity: 'error',
            code: 'not-a-whole-number',
            message: `Column "${column}" must contain whole numbers of 0 or more: write 48, not 48.5, -48 or "48 hp".`,
            column,
          },
          line,
        );
        rowValid = false;
        return;
      }

      switch (role.kind) {
        case 'atk':
          entity.atk[role.channel] = value ?? 0;
          return;
        case 'def':
          entity.def[role.channel] = value ?? 0;
          return;
        case 'hybridAtk':
          if (value !== undefined) {
            hybrid[role.channel] = value;
            hybridCells++;
          }
          return;
        case 'hybridDef':
          if (value !== undefined) entity.hybridDef[role.channel] = value;
          return;
        case 'cost':
        case 'hp':
          if (value !== undefined) entity[role.kind] = value;
      }
    });

    if (hybridCells > 0) {
      if (hybridCells < channels.length) {
        log.add({ severity: 'error', code: 'incomplete-hybrid', message: ENTITY_MESSAGES['incomplete-hybrid'] }, line);
        rowValid = false;
      } else {
        entity.hybridAtk = hybrid;
      }
    }

    for (const problem of validateEntity(entity, channels)) {
      log.add(
        {
          severity: 'error',
          code: problem.code,
          message: problem.message,
          ...(problem.field === 'id' && problem.code === 'invalid-id' ? { column: 'id' } : {}),
          ...(problem.field === 'hp' ? { column: 'hp' } : {}),
        },
        line,
      );
      rowValid = false;
    }
    if (entity.id !== '' && ids.has(entity.id)) {
      log.add(
        {
          severity: 'error',
          code: 'duplicate-id',
          message: `Id "${entity.id}" is used more than once. Every id must be unique.`,
          column: 'id',
        },
        line,
      );
      rowValid = false;
    }
    ids.add(entity.id);
    if (!rowValid) return;

    if (entity.cost === undefined && hasCost) {
      log.add(
        { severity: 'warning', code: 'missing-cost', message: 'Entities without cost cannot be compared by cost.', column: 'cost' },
        line,
      );
    }
    if (entity.hp === undefined) {
      log.add(
        { severity: 'warning', code: 'missing-hp', message: 'Entities without hp cannot be defeated, so they have no hits to defeat.', column: 'hp' },
        line,
      );
    }
    entities.push(entity);
  });

  return result(channels, entities);
}

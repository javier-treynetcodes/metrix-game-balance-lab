import type { Channel, Entity } from '../types';
import { parseCsv, type CsvSyntaxError, type Delimiter } from './parseCsv';
import { parseNumber } from './parseNumber';

export type ImportIssueCode =
  | 'empty-file'
  | 'unclosed-quote'
  | 'stray-quote'
  | 'missing-column'
  | 'duplicate-column'
  | 'empty-header'
  | 'row-too-long'
  | 'row-too-short'
  | 'missing-id'
  | 'invalid-id'
  | 'duplicate-id'
  | 'missing-name'
  | 'not-a-number'
  | 'negative-value'
  | 'negative-defense'
  | 'defense-without-attack'
  | 'text-column-ignored'
  | 'unsupported-column'
  | 'missing-cost'
  | 'missing-hp';

export interface ImportIssue {
  severity: 'error' | 'warning';
  code: ImportIssueCode;
  message: string;
  /** Column header as written in the file. */
  column?: string;
  /** 1-based source line numbers affected. */
  lines?: number[];
}

export interface ImportResult {
  /** True when there are no errors. Warnings do not block the import. */
  ok: boolean;
  delimiter: Delimiter;
  channels: Channel[];
  entities: Entity[];
  issues: ImportIssue[];
}

type ColumnRole =
  | { kind: 'id' | 'name' | 'category' }
  | { kind: 'cost' | 'hp' | 'rate' }
  | { kind: 'atk' | 'def'; channel: string }
  | { kind: 'tag'; key: string }
  | { kind: 'stat'; key: string }
  | { kind: 'ignored' };

interface Column {
  /** Header as written in the file (trimmed). */
  name: string;
  role: ColumnRole;
}

const FIXED_COLUMNS = ['id', 'name', 'category', 'cost', 'hp', 'rate'] as const;
const NON_NEGATIVE = new Set(['hp', 'rate', 'atk']);

const DELIMITER_NAMES: Record<Delimiter, string> = { ',': 'comma', ';': 'semicolon', '\t': 'tab' };

const QUOTE_MESSAGES: Record<CsvSyntaxError['code'], string> = {
  'unclosed-quote':
    'A value opened with a double quote is never closed. Add the closing double quote. Fix quote errors first, then import again to check the rest of the file.',
  'stray-quote':
    'A double quote appears inside a value that is not wrapped in quotes. Wrap the whole value in double quotes and double the inner quote, e.g. "12"" Cannon". Fix quote errors first, then import again to check the rest of the file.',
};

function classify(canonical: string): ColumnRole {
  if ((FIXED_COLUMNS as readonly string[]).includes(canonical)) {
    return { kind: canonical as (typeof FIXED_COLUMNS)[number] };
  }
  const separator = canonical.indexOf(':');
  if (separator > 0) {
    const prefix = canonical.slice(0, separator);
    const key = canonical.slice(separator + 1).trim();
    if (key !== '' && (prefix === 'atk' || prefix === 'def')) return { kind: prefix, channel: key };
    if (key !== '' && prefix === 'tag') return { kind: 'tag', key };
    if (prefix === 'pen') return { kind: 'ignored' };
  }
  return { kind: 'stat', key: canonical };
}

function labelFor(key: string): string {
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

  get all(): ImportIssue[] {
    return [...this.byKey.values()];
  }
}

/**
 * Imports a CSV catalog that follows the Métrix template (see `CSV_TEMPLATE`).
 * All or nothing: any error rejects the whole file, and every error is reported at once
 * with the lines to fix. Pure and synchronous: safe to run in a Web Worker.
 */
export function importEntities(text: string): ImportResult {
  const { delimiter, records, syntaxErrors } = parseCsv(text);
  const log = new IssueLog();
  const result = (channels: Channel[], entities: Entity[]): ImportResult => {
    const issues = log.all;
    const ok = issues.every((issue) => issue.severity !== 'error');
    return {
      ok,
      delimiter,
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
  const decimalComma = delimiter === ';';
  const separatorName = DELIMITER_NAMES[delimiter];

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
  const seen = new Set<string>();
  const columns: Column[] = headerRecord.cells.map((cell) => {
    const name = cell.trim();
    return { name, role: resolveRole(name) };
  });

  function resolveRole(original: string): ColumnRole {
    if (original === '') {
      log.add({
        severity: 'warning',
        code: 'empty-header',
        message: 'A column without a header was ignored.',
      });
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
    const role = classify(canonical);
    if (role.kind === 'ignored') {
      log.add({
        severity: 'warning',
        code: 'unsupported-column',
        message: `Column "${original}" is not supported yet and was ignored.`,
        column: original,
      });
    }
    return role;
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
  if (!log.all.every((issue) => issue.code !== 'missing-column')) return result([], []);

  // Free-text columns without a prefix are ignored (only fully numeric extra columns become stats).
  columns.forEach((column, index) => {
    const { role } = column;
    if (role.kind !== 'stat') return;
    const hasText = dataRows.some(({ cells }) =>
      Number.isNaN(parseNumber(cells[index] ?? '', decimalComma)),
    );
    if (hasText) {
      log.add({
        severity: 'warning',
        code: 'text-column-ignored',
        message: `Column "${column.name}" contains text and was ignored. Rename it to "tag:${role.key}" to use it as a tag.`,
        column: column.name,
      });
      column.role = { kind: 'ignored' };
    }
  });

  // Channels in order of first appearance.
  const channelOrder: string[] = [];
  const attackChannels = new Set<string>();
  const defenseChannels = new Set<string>();
  for (const { role } of columns) {
    if (role.kind !== 'atk' && role.kind !== 'def') continue;
    if (!channelOrder.includes(role.channel)) channelOrder.push(role.channel);
    (role.kind === 'atk' ? attackChannels : defenseChannels).add(role.channel);
  }
  const channels: Channel[] = channelOrder.map((key) => ({
    key,
    label: labelFor(key),
    mitigation: defenseChannels.has(key) ? 'percent' : 'none',
  }));
  for (const key of defenseChannels) {
    if (!attackChannels.has(key)) {
      log.add({
        severity: 'warning',
        code: 'defense-without-attack',
        message: `Channel "${key}" has a defense column but no attack column.`,
        column: `def:${key}`,
      });
    }
  }

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
            ? `Some rows have more cells than the header. Text that contains a ${separatorName} must be wrapped in double quotes, e.g. "Archer${delimiter === '\t' ? '\t' : delimiter} the Swift".`
            : `Some rows have fewer cells than the header. Every row needs one cell per column, even when empty: keep the ${separatorName}s between empty cells.`,
        },
        line,
      );
      return;
    }

    const entity: Entity = { id: '', name: '', rate: 1, atk: {}, def: {}, tags: {}, stats: {} };
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
          return;
      }

      const value = parseNumber(raw, decimalComma);
      if (Number.isNaN(value)) {
        log.add(
          {
            severity: 'error',
            code: 'not-a-number',
            message: `Column "${column}" must contain numbers only. Remove units, symbols and text (write 600, not "600 hp") and use ${decimalComma ? 'a comma or a dot' : 'a dot'} for decimals.`,
            column,
          },
          line,
        );
        rowValid = false;
        return;
      }
      if (value !== undefined && value < 0) {
        if (role.kind === 'def') {
          log.add(
            {
              severity: 'warning',
              code: 'negative-defense',
              message: `Column "${column}" has negative values; they are treated as 0 in formulas.`,
              column,
            },
            line,
          );
        } else if (NON_NEGATIVE.has(role.kind)) {
          log.add(
            {
              severity: 'error',
              code: 'negative-value',
              message: `Column "${column}" cannot be negative. Use 0 or a positive number.`,
              column,
            },
            line,
          );
          rowValid = false;
          return;
        }
      }

      switch (role.kind) {
        case 'atk':
          entity.atk[role.channel] = value ?? 0;
          return;
        case 'def':
          entity.def[role.channel] = value ?? 0;
          return;
        case 'rate':
          entity.rate = value ?? 1;
          return;
        case 'stat':
          if (value !== undefined) entity.stats[role.key] = value;
          return;
        default:
          if (value !== undefined) entity[role.kind] = value;
      }
    });

    if (entity.id === '') {
      log.add(
        {
          severity: 'error',
          code: 'missing-id',
          message: 'Some rows have no id. Give every row a unique id.',
        },
        line,
      );
      rowValid = false;
    } else if (/\s/.test(entity.id)) {
      log.add(
        {
          severity: 'error',
          code: 'invalid-id',
          message: 'Ids cannot contain spaces. Use hyphens instead, e.g. "stone-guardian".',
          column: 'id',
        },
        line,
      );
      rowValid = false;
    } else if (ids.has(entity.id)) {
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
    } else {
      ids.add(entity.id);
    }
    if (entity.name === '') {
      log.add(
        {
          severity: 'error',
          code: 'missing-name',
          message: 'Some rows have no name. Fill in the name column.',
        },
        line,
      );
      rowValid = false;
    }
    if (!rowValid) return;

    if (entity.cost === undefined && columns.some(({ role }) => role.kind === 'cost')) {
      log.add(
        {
          severity: 'warning',
          code: 'missing-cost',
          message: 'Entities without cost are left out of the cost/power curve.',
          column: 'cost',
        },
        line,
      );
    }
    if (entity.hp === undefined) {
      log.add(
        {
          severity: 'warning',
          code: 'missing-hp',
          message: 'Entities without hp are left out of duels.',
          column: 'hp',
        },
        line,
      );
    }
    entities.push(entity);
  });

  return result(channels, entities);
}

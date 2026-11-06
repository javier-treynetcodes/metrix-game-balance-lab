/**
 * @file CSV importer: turns a file into channels, entities, complements and armor coverage,
 * or a complete list of problems.
 */

import { MAX_COVERAGE } from '../coverage';
import type { ArmorCoverage, Channel, Complement, Entity } from '../types';
import {
  ENTITY_MESSAGES,
  validateComplement,
  validateEntity,
  type EntityProblem,
  type EntityProblemCode,
} from '../validateEntity';
import { classifyHeader, type ColumnRole, type RetiredColumn } from './columns';
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
  | 'retired-column'
  | 'row-too-long'
  | 'row-too-short'
  | 'unknown-kind'
  | 'duplicate-id'
  | 'not-a-whole-number'
  | EntityProblemCode
  | 'complement-field'
  | 'rule-unknown-channel'
  | 'rule-field'
  | 'coverage-over-100'
  | 'text-column-ignored'
  | 'unsupported-column'
  | 'rate-not-used'
  | 'missing-speed'
  | 'high-speed'
  | 'unused-speed-bonus'
  | 'unused-complement'
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
 * Outcome of `importEntities`. When `ok` is false, every list is empty and `coverage` has no
 * values: the import is all or nothing so an analysis never runs on a silently incomplete catalog.
 */
export interface ImportResult {
  /** True when there are no errors. Warnings do not block the import. */
  ok: boolean;
  delimiter: Delimiter;
  layout: CsvLayout;
  channels: Channel[];
  /** Rows of kind `unit`, in file order. */
  entities: Entity[];
  /** Rows of kind `complement`, in file order. */
  complements: Complement[];
  /** Coverage read from rows of kind `rule`; values not written there follow the default rule. */
  coverage: ArmorCoverage;
  issues: ImportIssue[];
}

/** The three kinds of row a catalog file can hold, in the `kind` column. */
export type RowKind = 'unit' | 'complement' | 'rule';

const ROW_KINDS: readonly RowKind[] = ['unit', 'complement', 'rule'];

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

const RETIRED_MESSAGES: Record<RetiredColumn, (column: string) => string> = {
  category: (column) => `Column "${column}" is now called "class". Rename the header to "class".`,
  hybrid: (column) =>
    `Column "${column}" is no longer used: an entity can now attack on both channels at once. Move hybrid attack values into the atk: columns of each channel, delete the hybrid columns, and set how much each armor stops in the armor coverage instead of hybrid armor.`,
};

/**
 * Default display name of a channel: "Channel N" for `N` or `channelN` keys,
 * otherwise the key capitalized ("physical" -> "Physical").
 */
export function labelFor(key: string): string {
  const numbered = /^(?:channel)?(\d+)$/.exec(key);
  if (numbered) return `Channel ${numbered[1]}`;
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
 * A rule row needs an id and a name. Whether the id names a channel is checked by the caller,
 * which knows the channels of the file.
 */
function ruleProblems(row: { id: string; name: string }): EntityProblem[] {
  const problems: EntityProblem[] = [];
  if (row.id.trim() === '') problems.push({ code: 'missing-id', field: 'id', message: ENTITY_MESSAGES['missing-id'] });
  if (row.name.trim() === '') problems.push({ code: 'missing-name', field: 'name', message: ENTITY_MESSAGES['missing-name'] });
  return problems;
}

/** Columns a complement row must leave empty: they only describe units. */
const UNIT_ONLY = new Set(['character', 'cost', 'hp', 'tag', 'stat']);
/** Columns a rule row must leave empty: only `def:` holds its percentages. */
const RULE_EMPTY = new Set(['character', 'class', 'cost', 'hp', 'speed', 'move', 'atk', 'tag', 'stat']);

/** Optional percentage stats: when a catalog uses one, every unit needs it. */
type SpeedStat = 'speed' | 'move';

/** Above this a speed is almost always a typo (1250 instead of 125), so it gets a warning. */
export const HIGH_SPEED = 300;

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
  const result = (
    channels: Channel[],
    entities: Entity[],
    complements: Complement[],
    coverage: ArmorCoverage,
  ): ImportResult => {
    const ok = !log.hasErrors();
    return {
      ok,
      delimiter,
      layout: { delimiter, headers },
      channels: ok ? channels : [],
      entities: ok ? entities : [],
      complements: ok ? complements : [],
      coverage: ok ? coverage : {},
      issues: log.all,
    };
  };
  const failed = () => result([], [], [], {});

  // Quote errors shift every following cell, so later checks would only produce noise.
  if (syntaxErrors.length > 0) {
    for (const { code, line } of syntaxErrors) {
      log.add({ severity: 'error', code, message: QUOTE_MESSAGES[code] }, line);
    }
    return failed();
  }

  const [headerRecord, ...dataRows] = records;
  if (!headerRecord) {
    log.add({
      severity: 'error',
      code: 'empty-file',
      message: 'The file is empty. Download the template and fill it with your catalog.',
    });
    return failed();
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
          message: `Column "${original}" was kept as is and not analyzed. For attack speed, use a "speed" column with a whole percentage where 100 is normal, e.g. 125 for 25% faster.`,
          column: original,
        });
        return { kind: 'ignored' };
      case 'retired':
        log.add({
          severity: 'error',
          code: 'retired-column',
          message: RETIRED_MESSAGES[role.column](original),
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
      message: `Métrix works with two damage channels, and this file has ${channelKeys.length}: ${channelKeys.join(', ')}. Keep two: an entity can attack on both at once.`,
    });
  }
  if (log.hasErrors()) return failed();

  const channels: Channel[] = channelKeys.map((key) => ({ key, label: labelFor(key) }));

  // Extra columns are analyzed only when every unit value is a whole number; otherwise they are kept as is.
  const kindIndex = columns.findIndex(({ role }) => role.kind === 'kind');
  const kindOf = (cells: readonly string[]): string =>
    kindIndex < 0 ? 'unit' : (cells[kindIndex] ?? '').trim().toLowerCase() || 'unit';
  columns.forEach((column, index) => {
    const { role } = column;
    if (role.kind !== 'stat') return;
    const hasText = dataRows.some(
      ({ cells }) => kindOf(cells) === 'unit' && Number.isNaN(parseInteger(cells[index] ?? '')),
    );
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

  // A speed column is "in use" when any unit fills it; then every unit must fill it.
  const usesStat: Record<SpeedStat, boolean> = { speed: false, move: false };
  columns.forEach(({ role }, index) => {
    if (role.kind !== 'speed' && role.kind !== 'move') return;
    usesStat[role.kind] = dataRows.some(({ cells }) => kindOf(cells) === 'unit' && (cells[index] ?? '').trim() !== '');
  });

  const separatorName = DELIMITER_NAMES[delimiter];
  const hasCost = columns.some(({ role }) => role.kind === 'cost');
  const entities: Entity[] = [];
  const complements: Complement[] = [];
  const coverage: ArmorCoverage = {};
  const ids = new Set<string>();

  /** Logs each problem as an error on `line`; returns true when there was any. */
  const reportProblems = (problems: readonly EntityProblem[], line: number): boolean => {
    for (const problem of problems) {
      const column = ['id', 'hp', 'class', 'speed', 'move'].includes(problem.field) ? problem.field : undefined;
      log.add({ severity: 'error', code: problem.code, message: problem.message, ...(column ? { column } : {}) }, line);
    }
    return problems.length > 0;
  };

  dataRows.forEach(({ cells: row, line }) => {
    if (row.length !== columns.length) {
      const tooLong = row.length > columns.length;
      log.add(
        {
          severity: 'error',
          code: tooLong ? 'row-too-long' : 'row-too-short',
          message: tooLong
            ? `Some rows have more cells than the header. Text that contains a ${separatorName} must be wrapped in double quotes, e.g. "Iron Vanguard${delimiter === '\t' ? '\t' : delimiter} Elite".`
            : `Some rows have fewer cells than the header. Every row needs one cell per column, even when empty: keep the ${separatorName}s between empty cells.`,
        },
        line,
      );
      return;
    }

    const kind = kindOf(row);
    if (!(ROW_KINDS as readonly string[]).includes(kind)) {
      log.add(
        {
          severity: 'error',
          code: 'unknown-kind',
          message: `Column "kind" only accepts unit, complement or rule. Leave it empty for units.`,
          column: 'kind',
        },
        line,
      );
      return;
    }
    const rowKind = kind as RowKind;

    const entity: Entity = { id: '', name: '', atk: {}, def: {}, tags: {}, stats: {}, extra: {} };
    const complement: Complement = { id: '', name: '', class: '', atk: {}, def: {}, extra: {} };
    const rule: Record<string, number> = {};
    let rowValid = true;

    const fail = (code: ImportIssueCode, message: string, column: string) => {
      log.add({ severity: 'error', code, message, column }, line);
      rowValid = false;
    };

    // Row length was validated above, so every cell has a matching column.
    row.forEach((cell, index) => {
      const { name: column, role } = columns[index] as Column;
      const raw = cell.trim();
      if (role.kind === 'kind') return;
      if (role.kind === 'ignored') {
        if (rowKind === 'unit') entity.extra[String(index)] = cell;
        else if (rowKind === 'complement') complement.extra[String(index)] = cell;
        return;
      }
      if (role.kind === 'id' || role.kind === 'name') {
        entity[role.kind] = raw;
        complement[role.kind] = raw;
        return;
      }

      // Columns that only describe units must stay empty in complement and rule rows.
      if (raw !== '' && rowKind === 'complement' && UNIT_ONLY.has(role.kind)) {
        fail(
          'complement-field',
          `Complement rows only use id, kind, name, class, the atk: and def: bonuses, and the speed and move bonuses. Leave column "${column}" empty.`,
          column,
        );
        return;
      }
      if (raw !== '' && rowKind === 'rule' && RULE_EMPTY.has(role.kind)) {
        fail(
          'rule-field',
          `Rule rows only use id, kind, name and the def: percentages. Leave column "${column}" empty.`,
          column,
        );
        return;
      }

      switch (role.kind) {
        case 'character':
          if (raw !== '') entity.character = raw;
          return;
        case 'class':
          if (raw !== '') entity.class = raw;
          complement.class = raw;
          return;
        case 'tag':
          if (raw !== '') entity.tags[role.key] = raw;
          return;
        case 'stat': {
          const value = parseInteger(raw);
          if (value !== undefined) entity.stats[role.key] = value;
          return;
        }
      }

      const value = parseInteger(raw);
      if (value !== undefined && (Number.isNaN(value) || value < 0)) {
        fail(
          'not-a-whole-number',
          `Column "${column}" must contain whole numbers of 0 or more: write 48, not 48.5, -48 or "48 hp".`,
          column,
        );
        return;
      }

      switch (role.kind) {
        case 'atk':
          if (rowKind === 'unit') entity.atk[role.channel] = value ?? 0;
          else if (value) complement.atk[role.channel] = value;
          return;
        case 'def':
          if (rowKind === 'unit') entity.def[role.channel] = value ?? 0;
          else if (rowKind === 'complement') {
            if (value) complement.def[role.channel] = value;
          } else if (value !== undefined) {
            if (value > MAX_COVERAGE) {
              fail(
                'coverage-over-100',
                `In rule rows, "${column}" is the percentage this armor stops: write a whole number from 0 to 100.`,
                column,
              );
            } else rule[role.channel] = value;
          }
          return;
        case 'cost':
        case 'hp':
          if (value !== undefined) entity[role.kind] = value;
          return;
        case 'speed':
        case 'move':
          if (rowKind === 'complement') {
            if (value) complement[role.kind] = value;
          } else if (value !== undefined) {
            entity[role.kind] = value;
            if (value > HIGH_SPEED) {
              log.add(
                {
                  severity: 'warning',
                  code: 'high-speed',
                  message: `Some values in "${column}" are above ${HIGH_SPEED}%: that is more than three times the normal speed. Check for a typo, e.g. 1250 instead of 125.`,
                  column,
                },
                line,
              );
            }
          } else if (usesStat[role.kind]) {
            fail(
              'missing-speed',
              `Column "${column}" is used, so every unit needs a value: write a whole percentage where 100 is normal. Leave the whole column empty if your game does not use it.`,
              column,
            );
          }
      }
    });

    const problems =
      rowKind === 'unit'
        ? validateEntity(entity)
        : rowKind === 'complement'
          ? validateComplement(complement)
          : ruleProblems(entity);
    if (reportProblems(problems, line)) rowValid = false;

    if (rowKind === 'rule' && entity.id !== '' && !channelKeys.includes(entity.id.toLowerCase())) {
      fail(
        'rule-unknown-channel',
        `A rule row's id is the channel whose armor it describes: ${channelKeys.join(' or ')}.`,
        'id',
      );
    }

    if (entity.id !== '' && ids.has(entity.id)) {
      fail('duplicate-id', `Id "${entity.id}" is used more than once. Every id must be unique.`, 'id');
    }
    ids.add(entity.id);
    if (!rowValid) return;

    if (rowKind === 'complement') {
      complements.push(complement);
      return;
    }
    if (rowKind === 'rule') {
      coverage[entity.id.toLowerCase()] = rule;
      return;
    }
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

  // A complement whose class no unit has affects nobody: probably a typo in the class name.
  const classes = new Set(entities.flatMap((entity) => (entity.class ? [entity.class] : [])));
  for (const complement of complements) {
    if (!classes.has(complement.class)) {
      log.add({
        severity: 'warning',
        code: 'unused-complement',
        message: `Complement "${complement.name}" is for class "${complement.class}", which no unit has, so it affects nobody. Check the class name.`,
        column: 'class',
      });
    }
  }

  // Speed bonuses only add to a speed that exists: without the stat on units they do nothing.
  for (const stat of ['speed', 'move'] as const) {
    if (!usesStat[stat] && complements.some((complement) => complement[stat] !== undefined)) {
      log.add({
        severity: 'warning',
        code: 'unused-speed-bonus',
        message: `Some complements add ${stat}, but no unit has ${stat}, so those bonuses do nothing. Add ${stat} to every unit or leave it empty in the complements.`,
        column: stat,
      });
    }
  }

  return result(channels, entities, complements, coverage);
}

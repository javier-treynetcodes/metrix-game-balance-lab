/**
 * @file Public API of the Métrix engine (`@metrix/core`).
 *
 * The engine is pure TypeScript with no DOM access and no side effects, so it can run in the
 * browser, in a Web Worker, in Node or in tests. Every function here is covered by tests and
 * the build fails below 100% coverage. Every game value is a whole number and damage only
 * uses additions and subtractions.
 */

export type { AttackType, Channel, Entity, Genre } from './types';
export {
  attackType,
  damageBreakdown,
  hitsToDefeat,
  type DamageBreakdown,
  type DamageRow,
  type HitsToDefeat,
} from './combat';
export {
  hitsMargin,
  matchup,
  matchupMatrix,
  metricValue,
  METRICS,
  winnerBy,
  type Matchup,
  type Metric,
  type Winner,
} from './matchup';
export {
  ENTITY_MESSAGES,
  isWholeNumber,
  validateEntity,
  type EntityProblem,
  type EntityProblemCode,
} from './validateEntity';
export {
  detectDelimiter,
  parseCsv,
  type CsvRecord,
  type CsvSyntaxError,
  type Delimiter,
  type ParsedCsv,
} from './csv/parseCsv';
export { parseInteger } from './csv/parseInteger';
export {
  CHANNEL_COUNT,
  importEntities,
  labelFor,
  type CsvLayout,
  type ImportIssue,
  type ImportIssueCode,
  type ImportResult,
} from './csv/importEntities';
export { channelColumnName, exportCsv } from './csv/exportCsv';
export { classifyHeader, type ColumnRole } from './csv/columns';
export { CSV_TEMPLATE, CSV_TEMPLATE_FILE_NAME } from './csv/template';

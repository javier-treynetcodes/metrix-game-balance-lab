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

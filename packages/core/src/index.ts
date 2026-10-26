export type { Channel, Entity, InteractionMatrix, Mitigation, Project } from './types';
export { mitigate } from './mitigation';
export { damagePerHit, interactionMultiplier, timeToDefeat, type TimeToDefeat } from './combat';
export { duel, duelMatrix, type Duel, type DuelWinner } from './duels';
export {
  detectDelimiter,
  parseCsv,
  type CsvRecord,
  type CsvSyntaxError,
  type Delimiter,
  type ParsedCsv,
} from './csv/parseCsv';
export { parseNumber } from './csv/parseNumber';
export {
  importEntities,
  type ImportIssue,
  type ImportIssueCode,
  type ImportResult,
} from './csv/importEntities';
export { CSV_TEMPLATE, CSV_TEMPLATE_FILE_NAME } from './csv/template';

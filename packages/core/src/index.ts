export type { Channel, Entity, InteractionMatrix, Mitigation, Project } from './types';
export { mitigate } from './mitigation';
export { damagePerHit, interactionMultiplier, timeToDefeat, type TimeToDefeat } from './combat';
export {
  detectDelimiter,
  parseCsv,
  type CsvRecord,
  type Delimiter,
  type ParsedCsv,
} from './csv/parseCsv';
export { parseNumber } from './csv/parseNumber';
export {
  importEntities,
  type ImportIssue,
  type ImportIssueCode,
  type ImportOptions,
  type ImportResult,
} from './csv/importEntities';

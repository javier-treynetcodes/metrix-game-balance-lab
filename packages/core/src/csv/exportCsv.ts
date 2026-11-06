/**
 * @file CSV export that keeps the source file's layout and round-trips through the importer.
 */

import { isDefaultCoverage, resolveCoverage } from '../coverage';
import type { ArmorCoverage, Channel, Complement, Entity } from '../types';
import { classifyHeader, headerFor, type ColumnRole } from './columns';
import { labelFor, type CsvLayout } from './importEntities';

/** Byte order mark: makes Excel read the file as UTF-8 so accents survive. */
const BOM = '﻿';

/** Channel names that would be read as columns of older templates, so a channel never takes them. */
const RESERVED_CHANNEL_NAMES = new Set(['hybrid']);

/** Column-safe version of a display name: lower case, no separators or quotes. */
function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[\s,;:"]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Name a channel would like in its columns: its key until the user renames it. */
function preferredName(channel: Channel): string {
  if (channel.label === labelFor(channel.key)) return channel.key;
  const slug = slugify(channel.label);
  return slug === '' || RESERVED_CHANNEL_NAMES.has(slug) ? channel.key : slug;
}

/**
 * Column name for a channel. A renamed channel uses its new display name (`Fire` -> `atk:fire`);
 * it keeps its original key when that name would clash with the other channel.
 */
export function channelColumnName(channel: Channel, channels: readonly Channel[]): string {
  const name = preferredName(channel);
  const clash = channels.some(
    (other) => other !== channel && (other.key === name || preferredName(other) === name),
  );
  return clash ? channel.key : name;
}

function quote(value: string, delimiter: string): string {
  const needsQuotes =
    value.includes(delimiter) || /["\r\n]/.test(value) || value !== value.trim();
  return needsQuotes ? `"${value.replaceAll('"', '""')}"` : value;
}

function numberCell(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

/** One output column: its header, what it means and, if it came from the file, its position there. */
interface OutputColumn {
  header: string;
  role: ColumnRole | undefined;
  /** Index in the source file, used to write back kept cells. Undefined for added columns. */
  source: number | undefined;
}

/**
 * Columns of the export: the source file's columns, plus `kind` (after `id`) and `class`
 * (after `name`) when the export needs them and the file did not have them.
 */
function outputColumns(layout: CsvLayout, needsKind: boolean, needsClass: boolean): OutputColumn[] {
  const seen = new Set<string>();
  const columns: OutputColumn[] = layout.headers.map((header, index) => {
    const canonical = header.toLowerCase();
    const duplicate = header === '' || seen.has(canonical);
    seen.add(canonical);
    return { header, role: duplicate ? undefined : classifyHeader(canonical), source: index };
  });
  const insertAfter = (kind: 'id' | 'name', header: 'kind' | 'class') => {
    const at = columns.findIndex(({ role }) => role?.kind === kind);
    columns.splice(at + 1, 0, { header, role: { kind: header }, source: undefined });
  };
  if (needsKind && !columns.some(({ role }) => role?.kind === 'kind')) insertAfter('id', 'kind');
  if (needsClass && !columns.some(({ role }) => role?.kind === 'class')) insertAfter('name', 'class');
  return columns;
}

/**
 * Writes the catalog back as CSV, keeping the source file's columns, order and separator.
 *
 * - Units come first, then complements, then one `rule` row per armor when the coverage
 *   differs from the default (each armor stops only its own channel).
 * - Channel columns take the channel's current display name. Columns Métrix does not analyze
 *   are written back exactly as they were imported.
 * - Importing the result gives the same catalog.
 */
export function exportCsv(
  layout: CsvLayout,
  channels: readonly Channel[],
  entities: readonly Entity[],
  complements: readonly Complement[] = [],
  coverage: ArmorCoverage = {},
): string {
  const { delimiter } = layout;
  const names = new Map(channels.map((channel) => [channel.key, channelColumnName(channel, channels)]));
  const channelName = (key: string) => names.get(key) ?? key;
  const writeRules = !isDefaultCoverage(channels, coverage);
  const columns = outputColumns(layout, complements.length > 0 || writeRules, complements.length > 0);

  const headerLine = columns.map(({ header, role }) =>
    quote(role ? headerFor(role, header, channelName) : header, delimiter),
  );

  const unitRows = entities.map((entity) =>
    columns.map(({ role, source }) => {
      const kept = source === undefined ? undefined : entity.extra[String(source)];
      if (kept !== undefined || !role) return quote(kept ?? '', delimiter);
      switch (role.kind) {
        case 'id':
        case 'name':
          return quote(entity[role.kind], delimiter);
        case 'kind':
          return 'unit';
        case 'character':
        case 'class':
          return quote(entity[role.kind] ?? '', delimiter);
        case 'cost':
        case 'hp':
        case 'speed':
        case 'move':
          return numberCell(entity[role.kind]);
        case 'atk':
        case 'def':
          return numberCell(entity[role.kind][role.channel] ?? 0);
        case 'tag':
          return quote(entity.tags[role.key] ?? '', delimiter);
        case 'stat':
          return numberCell(entity.stats[role.key]);
        default:
          return '';
      }
    }),
  );

  const complementRows = complements.map((complement) =>
    columns.map(({ role, source }) => {
      const kept = source === undefined ? undefined : complement.extra[String(source)];
      if (kept !== undefined || !role) return quote(kept ?? '', delimiter);
      switch (role.kind) {
        case 'id':
        case 'name':
        case 'class':
          return quote(complement[role.kind], delimiter);
        case 'kind':
          return 'complement';
        case 'speed':
        case 'move':
          return numberCell(complement[role.kind]);
        case 'atk':
        case 'def':
          return numberCell(complement[role.kind][role.channel]);
        default:
          return '';
      }
    }),
  );

  const resolved = resolveCoverage(channels, coverage);
  const ruleRows = writeRules
    ? channels.map((armor) =>
        columns.map(({ role }) => {
          switch (role?.kind) {
            case 'id':
              return quote(channelName(armor.key), delimiter);
            case 'kind':
              return 'rule';
            case 'name':
              return quote(`${armor.label} armor`, delimiter);
            case 'def':
              return numberCell(resolved[armor.key]?.[role.channel]);
            default:
              return '';
          }
        }),
      )
    : [];

  return (
    BOM +
    [headerLine, ...unitRows, ...complementRows, ...ruleRows].map((cells) => cells.join(delimiter)).join('\r\n') +
    '\r\n'
  );
}

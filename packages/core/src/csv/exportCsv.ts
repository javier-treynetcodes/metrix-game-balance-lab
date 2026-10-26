import type { Channel, Entity } from '../types';
import { classifyHeader, HYBRID, headerFor } from './columns';
import { labelFor, type CsvLayout } from './importEntities';

/** Byte order mark: makes Excel read the file as UTF-8 so accents survive. */
const BOM = '﻿';

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
  return slug === '' || slug === HYBRID ? channel.key : slug;
}

/**
 * Column name for a channel. A renamed channel uses its new display name (`Fire` → `atk:fire`);
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

/**
 * Writes the catalog back as CSV, keeping the source file's columns, order and separator.
 * Channel columns take the channel's current display name. Columns Métrix does not analyze
 * are written back exactly as they were imported. Importing the result gives the same catalog.
 */
export function exportCsv(layout: CsvLayout, channels: readonly Channel[], entities: readonly Entity[]): string {
  const { delimiter, headers } = layout;
  const names = new Map(channels.map((channel) => [channel.key, channelColumnName(channel, channels)]));
  const channelName = (key: string) => names.get(key) ?? key;
  const seen = new Set<string>();
  const roles = headers.map((header) => {
    const canonical = header.toLowerCase();
    if (header === '' || seen.has(canonical)) return undefined;
    seen.add(canonical);
    return classifyHeader(canonical);
  });

  const headerLine = headers.map((header, index) => {
    const role = roles[index];
    return quote(role ? headerFor(role, header, channelName) : header, delimiter);
  });

  const rows = entities.map((entity) =>
    headers.map((_header, index) => {
      const role = roles[index];
      const kept = entity.extra[String(index)];
      if (kept !== undefined || !role) return quote(kept ?? '', delimiter);
      switch (role.kind) {
        case 'id':
        case 'name':
          return quote(entity[role.kind], delimiter);
        case 'category':
          return quote(entity.category ?? '', delimiter);
        case 'cost':
        case 'hp':
          return numberCell(entity[role.kind]);
        case 'atk':
          return entity.hybridAtk ? '0' : numberCell(entity.atk[role.channel] ?? 0);
        case 'def':
          return numberCell(entity.def[role.channel] ?? 0);
        case 'hybridAtk':
          return numberCell(entity.hybridAtk?.[role.channel]);
        case 'hybridDef':
          return numberCell(entity.hybridDef[role.channel]);
        case 'tag':
          return quote(entity.tags[role.key] ?? '', delimiter);
        case 'stat':
          return numberCell(entity.stats[role.key]);
        default:
          return '';
      }
    }),
  );

  return BOM + [headerLine, ...rows].map((cells) => cells.join(delimiter)).join('\r\n') + '\r\n';
}

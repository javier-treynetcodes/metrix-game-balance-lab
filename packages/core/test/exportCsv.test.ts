import { describe, expect, it } from 'vitest';
import { channelColumnName, CSV_TEMPLATE, exportCsv, importEntities } from '../src';
import type { Channel } from '../src';
import { entity } from './helpers';

const roundTrip = (text: string) => {
  const first = importEntities(text);
  const exported = exportCsv(first.layout, first.channels, first.entities);
  return { first, exported, second: importEntities(exported) };
};

describe('exportCsv', () => {
  it('gives back the same catalog when imported again', () => {
    const { first, exported, second } = roundTrip(CSV_TEMPLATE);
    expect(exported.startsWith('﻿id,name,category,cost,hp,atk:1,def:1')).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.channels).toEqual(first.channels);
    expect(second.entities).toEqual(first.entities);
  });

  it('keeps the separator, the column order and the columns Métrix does not analyze', () => {
    const source = 'name;id;notes;rate;;hp;range;tag:role\nA;a; tough one ;0,7;x;10;-3;\nB;b;"semi;colon";1;;;;tank';
    const { exported, first, second } = roundTrip(source);
    expect(exported).toBe(
      '﻿name;id;notes;rate;;hp;range;tag:role\r\nA;a;" tough one ";0,7;x;10;-3;\r\nB;b;"semi;colon";1;;;;tank\r\n',
    );
    expect(second.entities).toEqual(first.entities);
  });

  it('quotes values with quotes and line breaks', () => {
    const { exported, first, second } = roundTrip('id,name,category\na,"12"" Cannon","Line\nbreak"');
    expect(exported).toContain('"12"" Cannon","Line\nbreak"');
    expect(second.entities).toEqual(first.entities);
  });

  it('names channel columns after renamed channels', () => {
    const { layout, channels, entities } = importEntities(
      'id,name,atk:1,def:1,atk:2,def:2,atk:hybrid:1,atk:hybrid:2,def:hybrid:1,def:hybrid:2\nh,H,0,1,0,2,3,4,5,6',
    );
    const renamed: Channel[] = [
      { key: '1', label: 'Fire Damage' },
      { key: '2', label: 'Ice' },
    ];
    const exported = exportCsv(layout, renamed, entities);
    expect(exported.split('\r\n')[0]).toBe(
      '﻿id,name,atk:fire-damage,def:fire-damage,atk:ice,def:ice,atk:hybrid:fire-damage,atk:hybrid:ice,def:hybrid:fire-damage,def:hybrid:ice',
    );
    expect(exportCsv(layout, channels, entities).split('\r\n')[1]).toBe('h,H,0,1,0,2,3,4,5,6');
  });

  it('writes entities added in the app, with empty cells where they have no value', () => {
    const { layout, channels } = importEntities(
      'id,name,category,cost,hp,atk:1,def:1,atk:2,def:2,atk:hybrid:1,atk:hybrid:2,def:hybrid:1,tag:role,range,notes,pen:1\nx,X,,,,,,,,,,,,,text,',
    );
    const added = [
      entity('new', { name: 'New', hp: 10, atk: { '2': 7 }, def: { '1': 3 } }),
      entity('mix', { name: 'Mix', hybridAtk: { '1': 1, '2': 2 }, atk: { '1': 9 } }),
    ];
    expect(exportCsv(layout, channels, added).split('\r\n').slice(1, 3)).toEqual([
      'new,New,,,10,0,3,7,0,,,,,,,',
      'mix,Mix,,,,0,0,0,0,1,2,,,,,',
    ]);
  });

  it('keeps duplicate and headerless columns as they were', () => {
    const { layout, channels, entities } = importEntities('id,name,,hp\na,A,x,1');
    expect(exportCsv(layout, channels, [...entities, entity('b', { name: 'B' })]).split('\r\n').slice(1, 3)).toEqual([
      'a,A,x,1',
      'b,B,,',
    ]);
    const duplicated = exportCsv(
      { delimiter: ',', headers: ['id', 'name', 'ID', 'atk:x'] },
      [],
      [entity('c', { name: 'C', atk: { x: 4 } })],
    );
    expect(duplicated.split('\r\n')).toEqual(['\uFEFFid,name,ID,atk:x', 'c,C,,4', '']);
  });
});

describe('channelColumnName', () => {
  const one: Channel = { key: '1', label: 'Channel 1' };
  const two: Channel = { key: '2', label: 'Channel 2' };

  it('keeps the key until the channel is renamed', () => {
    expect(channelColumnName(one, [one, two])).toBe('1');
    expect(channelColumnName({ key: 'magic', label: 'Magic' }, [])).toBe('magic');
    expect(channelColumnName({ key: '1', label: '  Dark Arts; v2 ' }, [])).toBe('dark-arts-v2');
  });

  it('falls back to the key for unusable or clashing names', () => {
    expect(channelColumnName({ key: '1', label: ' ; ' }, [])).toBe('1');
    expect(channelColumnName({ key: '1', label: 'Hybrid' }, [])).toBe('1');
    const clash: Channel = { key: '2', label: '1' };
    expect(channelColumnName(clash, [one, clash])).toBe('2');
    const a: Channel = { key: '1', label: 'Fire' };
    const b: Channel = { key: '2', label: 'fire' };
    expect([channelColumnName(a, [a, b]), channelColumnName(b, [a, b])]).toEqual(['1', '2']);
  });
});

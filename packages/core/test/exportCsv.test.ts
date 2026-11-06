import { describe, expect, it } from 'vitest';
import { channelColumnName, CSV_TEMPLATE, exportCsv, importEntities } from '../src';
import type { Channel } from '../src';
import { complement, entity } from './helpers';

const roundTrip = (text: string) => {
  const first = importEntities(text);
  const exported = exportCsv(first.layout, first.channels, first.entities, first.complements, first.coverage);
  return { first, exported, second: importEntities(exported) };
};

describe('exportCsv', () => {
  it('gives back the same catalog when imported again', () => {
    const { first, exported, second } = roundTrip(CSV_TEMPLATE);
    expect(exported.startsWith('﻿id,kind,name,character,class,cost,hp,atk:channel1,def:channel1')).toBe(true);
    expect(exported).toBe(`\uFEFF${CSV_TEMPLATE.trimEnd().split('\n').join('\r\n')}\r\n`);
    expect(second.ok).toBe(true);
    expect(second.channels).toEqual(first.channels);
    expect(second.entities).toEqual(first.entities);
    expect(second.complements).toEqual(first.complements);
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
    const { exported, first, second } = roundTrip('id,name,class\na,"12"" Cannon","Line\nbreak"');
    expect(exported).toContain('"12"" Cannon","Line\nbreak"');
    expect(second.entities).toEqual(first.entities);
  });

  it('names channel columns after renamed channels', () => {
    const { layout, channels, entities } = importEntities('id,name,atk:1,def:1,atk:2,def:2\nm,M,3,1,4,2');
    const renamed: Channel[] = [
      { key: '1', label: 'Fire Damage' },
      { key: '2', label: 'Ice' },
    ];
    expect(exportCsv(layout, renamed, entities).split('\r\n')[0]).toBe('﻿id,name,atk:fire-damage,def:fire-damage,atk:ice,def:ice');
    expect(exportCsv(layout, channels, entities).split('\r\n')[1]).toBe('m,M,3,1,4,2');
  });

  it('writes entities added in the app, with empty cells where they have no value', () => {
    const { layout, channels } = importEntities(
      'id,name,character,class,cost,hp,atk:1,def:1,atk:2,def:2,tag:role,range,notes,pen:1\nx,X,,,,,,,,,,,text,',
    );
    const added = [
      entity('new', { name: 'New', hp: 10, atk: { '2': 7 }, def: { '1': 3 } }),
      entity('mix', { name: 'Mix', character: 'Kael', class: 'fighter', atk: { '1': 9, '2': 1 } }),
    ];
    expect(exportCsv(layout, channels, added).split('\r\n').slice(1, 3)).toEqual([
      'new,New,,,,10,0,3,7,0,,,,',
      'mix,Mix,Kael,fighter,,,9,0,1,0,,,,',
    ]);
  });

  it('adds kind and class columns and writes complements after the units', () => {
    const { layout, channels } = importEntities('id,name,hp,atk:1,def:1\na,A,10,1,1');
    const units = [entity('a', { name: 'A', hp: 10, class: 'tank', atk: { '1': 1 }, def: { '1': 1 } })];
    const lines = exportCsv(layout, channels, units, [complement('shield', { name: 'Shield', def: { '1': 4 } })]).split('\r\n');
    expect(lines.slice(0, 3)).toEqual(['﻿id,kind,name,class,hp,atk:1,def:1', 'a,unit,A,tank,10,1,1', 'shield,complement,Shield,tank,,,4']);
    expect(importEntities(lines.join('\n')).complements).toHaveLength(1);
  });

  it('keeps unanalyzed cells of complements and leaves headerless columns empty', () => {
    const source = 'id,kind,name,class,atk:1,notes\na,unit,A,tank,1,text\nc,complement,C,tank,2,kept';
    const { exported, first, second } = roundTrip(source);
    expect(exported.split('\r\n')[2]).toBe('c,complement,C,tank,2,kept');
    expect(second.complements).toEqual(first.complements);
    const headerless = exportCsv({ delimiter: ',', headers: ['id', 'kind', 'name', 'class', ''] }, [], [], [complement('x')]);
    expect(headerless.split('\r\n')[1]).toBe('x,complement,x,tank,');
  });

  it('writes one rule row per armor when the coverage is not the default', () => {
    const source = 'id,name,atk:1,def:1,atk:2,def:2\na,A,1,1,1,1';
    const { layout, entities } = importEntities(source);
    const renamed: Channel[] = [
      { key: '1', label: 'Physical' },
      { key: '2', label: 'Channel 2' },
    ];
    const exported = exportCsv(layout, renamed, entities, [], { '1': { '2': 30 } });
    expect(exported.split('\r\n').slice(0, 4)).toEqual([
      '﻿id,kind,name,atk:physical,def:physical,atk:2,def:2',
      'a,unit,A,1,1,1,1',
      'physical,rule,Physical armor,,100,,30',
      '2,rule,Channel 2 armor,,0,,100',
    ]);
    const again = importEntities(exported);
    expect(again.coverage).toEqual({ physical: { physical: 100, '2': 30 }, '2': { physical: 0, '2': 100 } });
    expect(exportCsv(layout, renamed, entities, [], { '1': { '1': 100 } }).split('\r\n')).toHaveLength(3);
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

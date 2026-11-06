import { describe, expect, it } from 'vitest';
import { CSV_TEMPLATE, importEntities, type ImportIssueCode, type ImportResult } from '../src';

const codes = (result: ImportResult): ImportIssueCode[] => result.issues.map((issue) => issue.code);
const issue = (result: ImportResult, code: ImportIssueCode) =>
  result.issues.find((entry) => entry.code === code);

const HEADER = 'id,name,hp,atk:1,def:1,atk:2,def:2';

describe('importEntities', () => {
  it('imports the official template without issues', () => {
    const result = importEntities(CSV_TEMPLATE);
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.channels).toEqual([
      { key: 'channel1', label: 'Channel 1' },
      { key: 'channel2', label: 'Channel 2' },
    ]);
    expect(result.entities).toHaveLength(8);
    expect(result.entities[0]).toEqual({
      id: 'vanguard',
      name: 'Iron Vanguard',
      character: 'Aria',
      class: 'tank',
      cost: 45,
      hp: 600,
      atk: { channel1: 30, channel2: 0 },
      def: { channel1: 30, channel2: 10 },
      tags: { role: 'frontline' },
      stats: {},
      extra: {},
    });
    expect(result.complements[0]).toEqual({
      id: 'shield',
      name: 'Tower Shield',
      class: 'tank',
      atk: {},
      def: { channel1: 2, channel2: 10 },
      extra: {},
    });
    expect(result.coverage).toEqual({});
    expect(result.layout).toEqual({ delimiter: ',', headers: CSV_TEMPLATE.split('\n')[0]?.split(',') });
  });

  it('names channels after their columns, case-insensitively', () => {
    const result = importEntities('ID,Name,ATK:Physical,DEF:magic\na,A,10,5');
    expect(result.channels).toEqual([
      { key: 'physical', label: 'Physical' },
      { key: 'magic', label: 'Magic' },
    ]);
    expect(result.entities[0]).toMatchObject({ atk: { physical: 10 }, def: { magic: 5 } });
  });

  it('fills empty attack and defense cells with 0 and warns about missing hp and cost', () => {
    const result = importEntities('id,name,character,class,cost,hp,atk:1,def:1,tag:role\na,A,,,,,,,');
    expect(result.ok).toBe(true);
    expect(result.entities[0]).toEqual({
      id: 'a',
      name: 'A',
      atk: { '1': 0 },
      def: { '1': 0 },
      tags: {},
      stats: {},
      extra: {},
    });
    expect(codes(result)).toEqual(['missing-cost', 'missing-hp']);
  });

  it('accepts semicolon and tab separated files', () => {
    expect(importEntities('id;name;hp\na;A;10').entities[0]?.hp).toBe(10);
    expect(importEntities('id\tname\thp\na\tA\t10').delimiter).toBe('\t');
  });

  it('keeps whole-number extra columns as stats, negative values included', () => {
    const result = importEntities('id,name,hp,range\na,A,1,-3');
    expect(result.entities[0]?.stats).toEqual({ range: -3 });
  });

  it('keeps other columns as written, for the export', () => {
    const result = importEntities('id,name,notes,pen:1,rate,,hp\na,A, tough one ,5,0.7,x,10');
    expect(result.ok).toBe(true);
    expect(codes(result)).toEqual(['unsupported-column', 'rate-not-used', 'empty-header', 'text-column-ignored']);
    expect(issue(result, 'text-column-ignored')?.message).toContain('tag:notes');
    expect(result.entities[0]?.extra).toEqual({ '2': ' tough one ', '3': '5', '4': '0.7', '5': 'x' });
  });

  it('reads prefixes without a key as extra columns', () => {
    const result = importEntities('id,name,tag:,atk:\na,A,1,2');
    expect(result.entities[0]?.stats).toEqual({ 'tag:': 1, 'atk:': 2 });
    expect(result.channels).toEqual([]);
  });

  it('rejects retired columns and explains how to move their values', () => {
    for (const header of ['atk:hybrid', 'def:hybrid', 'atk:hybrid:1', 'def:hybrid:2']) {
      const result = importEntities(`id,name,atk:1,atk:2,${header}\na,A,0,0,1`);
      expect(issue(result, 'retired-column')).toMatchObject({ severity: 'error', column: header });
      expect(issue(result, 'retired-column')?.message).toContain('both channels');
    }
    expect(issue(importEntities('id,name,Category\na,A,unit'), 'retired-column')?.message).toContain('"class"');
  });

  it('allows two channels at most', () => {
    const result = importEntities('id,name,atk:1,atk:2,atk:3\na,A,1,0,0');
    expect(result.ok).toBe(false);
    expect(issue(result, 'too-many-channels')?.message).toContain('1, 2, 3');
  });

  it('accepts attacks on both channels (mixed attack)', () => {
    const result = importEntities('id,name,atk:1,atk:2\nm,Mixed,30,14');
    expect(result.ok).toBe(true);
    expect(result.entities[0]?.atk).toEqual({ '1': 30, '2': 14 });
  });

  it('reads the kind of each row, unit by default', () => {
    const result = importEntities('id,kind,name,class,atk:1,def:1\na,,A,tank,1,1\nb,UNIT,B,tank,2,2\nc,complement,C,tank,3,');
    expect(result.ok).toBe(true);
    expect(result.entities.map((entity) => entity.id)).toEqual(['a', 'b']);
    expect(result.complements).toEqual([{ id: 'c', name: 'C', class: 'tank', atk: { '1': 3 }, def: {}, extra: {} }]);
    expect(issue(importEntities('id,kind,name\na,boss,A'), 'unknown-kind')).toMatchObject({ column: 'kind', lines: [2] });
  });

  it('checks complements: a class, only bonuses, never negative', () => {
    const header = 'id,kind,name,character,class,cost,hp,atk:1,def:1,tag:role,range,notes';
    const result = importEntities(
      `${header}\nt,unit,T,,tank,1,10,1,1,,,note\nnoclass,complement,No class,,,,,1,,,,\nchar,complement,Char,Aria,tank,,,1,,,,\nhp,complement,HP,,tank,,5,,,,,\nneg,complement,Neg,,tank,,,-1,,,,\nok,complement,Ok,,tank,,,,4,,,kept`,
    );
    expect(issue(result, 'missing-class')).toMatchObject({ column: 'class', lines: [3] });
    expect(result.issues.filter((entry) => entry.code === 'complement-field').map((entry) => [entry.column, entry.lines])).toEqual([
      ['character', [4]],
      ['hp', [5]],
    ]);
    expect(issue(result, 'not-a-whole-number')).toMatchObject({ column: 'atk:1', lines: [6] });
    const valid = importEntities(`${header}\nt,unit,T,,tank,1,10,1,1,,,note\nok,complement,Ok,,tank,,,,4,,,kept`);
    expect(valid.complements[0]).toEqual({ id: 'ok', name: 'Ok', class: 'tank', atk: {}, def: { '1': 4 }, extra: { '11': 'kept' } });
  });

  it('warns about complements for a class no unit has', () => {
    const result = importEntities('id,kind,name,class,atk:1\na,unit,A,tank,1\nx,complement,X,mage,2');
    expect(result.ok).toBe(true);
    expect(issue(result, 'unused-complement')).toMatchObject({ severity: 'warning', column: 'class' });
    expect(issue(result, 'unused-complement')?.message).toContain('"mage"');
  });

  it('reads the armor coverage from rule rows', () => {
    const result = importEntities('id,kind,name,atk:physical,def:physical,atk:magic,def:magic\na,unit,A,1,1,1,1\nphysical,rule,Physical armor,,100,,20\nMagic,rule,Magic armor,,,,90');
    expect(result.ok).toBe(true);
    expect(result.coverage).toEqual({ physical: { physical: 100, magic: 20 }, magic: { magic: 90 } });
    expect(result.entities).toHaveLength(1);
  });

  it('checks rule rows: a channel id, a name, def: percentages only, at most 100', () => {
    const header = 'id,kind,name,class,atk:1,def:1,def:2';
    const result = importEntities(
      `${header}\nfire,rule,Fire,,,50,\n1,rule,,,,50,\n2,rule,Two,mage,,,\n1x,rule,X,,4,,\n,rule,No id,,,,\n2b,rule,Over,,,,`.replace('2b,rule,Over,,,,', '2,rule,Over,,,,101'),
    );
    expect(issue(result, 'rule-unknown-channel')?.lines).toEqual([2, 5]);
    expect(issue(result, 'missing-name')?.lines).toEqual([3]);
    expect(result.issues.filter((entry) => entry.code === 'rule-field').map((entry) => entry.column)).toEqual(['class', 'atk:1']);
    expect(issue(result, 'missing-id')?.lines).toEqual([6]);
    expect(issue(result, 'coverage-over-100')).toMatchObject({ column: 'def:2', lines: [7] });
    expect(issue(result, 'duplicate-id')?.lines).toEqual([7]);
    expect(issue(importEntities('id,kind,name,def:1\n1,rule,One,-5'), 'not-a-whole-number')?.column).toBe('def:1');
    // Columns Métrix does not analyze are not part of a rule.
    const kept = importEntities('id,kind,name,def:1,notes\na,unit,A,1,text\n1,rule,One,50,ignored');
    expect(kept.coverage).toEqual({ '1': { '1': 50 } });
  });

  it('reports short rows even when they miss the kind cell', () => {
    expect(codes(importEntities('id,name,range,kind\na,A'))).toEqual(['row-too-short']);
  });

  it('accepts whole numbers of 0 or more only', () => {
    const result = importEntities(`${HEADER}\na,A,10.5,1,1,0,0\nb,B,10,-1,0,0,0\nc,C,lots,1,0,0,0`);
    expect(result.ok).toBe(false);
    expect(issue(result, 'not-a-whole-number')).toMatchObject({ column: 'hp', lines: [2, 4] });
    expect(issue(result, 'not-a-whole-number')?.message).toContain('whole numbers');
    expect(result.issues.find((entry) => entry.column === 'atk:1')?.lines).toEqual([3]);
  });

  it('requires at least 1 hp', () => {
    expect(issue(importEntities('id,name,hp\na,A,0'), 'zero-hp')).toMatchObject({ column: 'hp', lines: [2] });
  });

  it('validates ids and names', () => {
    const result = importEntities('id,name\n,No id\n,Also no id\nbad id,Spaces\nok,\ndup,One\ndup,Two');
    expect(issue(result, 'missing-id')?.lines).toEqual([2, 3]);
    expect(issue(result, 'invalid-id')).toMatchObject({ column: 'id', lines: [4] });
    expect(issue(result, 'missing-name')?.lines).toEqual([5]);
    expect(issue(result, 'duplicate-id')?.lines).toEqual([7]);
  });

  it('rejects rows longer than the header and explains quoting for the detected separator', () => {
    expect(issue(importEntities('id,name\na,A,extra'), 'row-too-long')?.message).toContain('"Iron Vanguard, Elite"');
    expect(issue(importEntities('id\tname\na\tA\textra'), 'row-too-long')?.message).toContain('Iron Vanguard\t Elite');
    expect(issue(importEntities('id;name;hp\na;A'), 'row-too-short')?.message).toContain('semicolons');
    expect(codes(importEntities('id,name,range\na,A'))).toEqual(['row-too-short']);
  });

  it('is all or nothing: one error rejects every row and channel', () => {
    const result = importEntities(`${HEADER}\na,A,10,1,0,0,0\nb,B,oops,1,0,0,0`);
    expect(result.ok).toBe(false);
    expect(result.entities).toEqual([]);
    expect(result.channels).toEqual([]);
  });

  it('reports only quote errors when the file has any', () => {
    const result = importEntities('id,name,hp\na,12" Cannon,lots\nb,"Open,10\nc,C,10');
    expect(codes(result)).toEqual(['stray-quote', 'unclosed-quote']);
    expect(issue(result, 'stray-quote')?.lines).toEqual([2]);
    expect(issue(result, 'unclosed-quote')?.lines).toEqual([3]);
  });

  it('lists a line only once per issue', () => {
    // Two stray quotes on the same line raise the same issue twice; the line is kept once.
    const quotes = importEntities('id,name\na,12" x 4" Cannon');
    expect(issue(quotes, 'stray-quote')?.lines).toEqual([2]);
  });

  it('rejects duplicate columns', () => {
    const result = importEntities('id,name,HP,hp\na,A,1,2');
    expect(issue(result, 'duplicate-column')).toMatchObject({ severity: 'error', column: 'hp' });
  });

  it('requires id and name columns', () => {
    const result = importEntities('hp\n10');
    expect(result.issues.filter((entry) => entry.code === 'missing-column').map((entry) => entry.column)).toEqual([
      'id',
      'name',
    ]);
  });

  it('reports an empty file', () => {
    const result = importEntities('   \n');
    expect(result.ok).toBe(false);
    expect(codes(result)).toEqual(['empty-file']);
    expect(result.layout.headers).toEqual([]);
  });

  it('imports 5,000 entities well under the 2 s budget', () => {
    const rows = ['id,kind,name,character,class,cost,hp,atk:1,def:1,atk:2,def:2,tag:role'];
    for (let i = 0; i < 5000; i++) rows.push(`e${i},unit,Entity ${i},Name ${i},class${i % 6},${i},500,50,30,10,30,front`);
    for (let i = 0; i < 6; i++) rows.push(`c${i},complement,Item ${i},,class${i},,,4,2,,,`);
    const start = performance.now();
    const result = importEntities(rows.join('\n'));
    const elapsed = performance.now() - start;
    expect(result.entities).toHaveLength(5000);
    expect(result.complements).toHaveLength(6);
    expect(elapsed).toBeLessThan(500);
  });
});

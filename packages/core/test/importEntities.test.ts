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
      { key: '1', label: 'Channel 1' },
      { key: '2', label: 'Channel 2' },
    ]);
    expect(result.entities).toHaveLength(6);
    const [heavy, , , hybrid, , warden] = result.entities;
    expect(heavy).toEqual({
      id: 'heavy',
      name: 'Heavy Unit',
      category: 'unit',
      cost: 48,
      hp: 620,
      atk: { '1': 34, '2': 0 },
      def: { '1': 32, '2': 8 },
      hybridDef: {},
      tags: { role: 'tank' },
      stats: {},
      extra: {},
    });
    expect(hybrid?.hybridAtk).toEqual({ '1': 30, '2': 34 });
    expect(warden?.hybridDef).toEqual({ '1': 10, '2': 10 });
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
    const result = importEntities('id,name,cost,hp,atk:1,def:1,def:hybrid:1,category,tag:role\na,A,,,,,,,');
    expect(result.ok).toBe(true);
    expect(result.entities[0]).toEqual({
      id: 'a',
      name: 'A',
      atk: { '1': 0 },
      def: { '1': 0 },
      hybridDef: {},
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

  it('rejects reserved hybrid column names', () => {
    for (const header of ['atk:hybrid', 'def:hybrid', 'atk:hybrid:', 'def:hybrid:hybrid']) {
      const result = importEntities(`id,name,atk:1,atk:2,${header}\na,A,0,0,1`);
      expect(issue(result, 'reserved-column')?.column).toBe(header);
    }
  });

  it('allows two channels at most', () => {
    const result = importEntities('id,name,atk:1,atk:2,atk:3\na,A,1,0,0');
    expect(result.ok).toBe(false);
    expect(issue(result, 'too-many-channels')?.message).toContain('1, 2, 3');
  });

  it('needs two channels and a column per channel for hybrid attacks', () => {
    expect(codes(importEntities('id,name,atk:hybrid:1\na,A,1'))).toEqual(['hybrid-needs-two-channels']);
    const result = importEntities('id,name,atk:1,def:2,atk:hybrid:1\na,A,0,0,1');
    expect(issue(result, 'missing-hybrid-column')?.column).toBe('atk:hybrid:2');
  });

  it('reads hybrid attacks and hybrid armor', () => {
    const result = importEntities(
      'id,name,atk:1,atk:2,atk:hybrid:1,atk:hybrid:2,def:hybrid:2\nh,H,0,0,30,0,\nd,D,5,0,,,4',
    );
    expect(result.ok).toBe(true);
    expect(result.entities[0]?.hybridAtk).toEqual({ '1': 30, '2': 0 });
    expect(result.entities[1]).toMatchObject({ atk: { '1': 5, '2': 0 }, hybridDef: { '2': 4 } });
    expect(result.entities[1]?.hybridAtk).toBeUndefined();
  });

  it('rejects a hybrid attack with only one value', () => {
    const result = importEntities('id,name,atk:hybrid:1,atk:hybrid:2\nh,H,30,');
    expect(issue(result, 'incomplete-hybrid')?.lines).toEqual([2]);
  });

  it('allows one kind of damage per entity', () => {
    const result = importEntities('id,name,atk:1,atk:2,atk:hybrid:1,atk:hybrid:2\na,A,5,5,,\nb,B,5,0,1,1');
    expect(issue(result, 'mixed-attack')?.lines).toEqual([2, 3]);
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
    expect(issue(importEntities('id,name\na,A,extra'), 'row-too-long')?.message).toContain('"Ranged Unit, Elite"');
    expect(issue(importEntities('id\tname\na\tA\textra'), 'row-too-long')?.message).toContain('Ranged Unit\t Elite');
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
    const rows = ['id,name,cost,hp,atk:1,def:1,atk:2,def:2,atk:hybrid:1,atk:hybrid:2,def:hybrid:1,def:hybrid:2'];
    for (let i = 0; i < 5000; i++) rows.push(`e${i},Entity ${i},${i},500,50,30,0,30,,,5,5`);
    const start = performance.now();
    const result = importEntities(rows.join('\n'));
    const elapsed = performance.now() - start;
    expect(result.entities).toHaveLength(5000);
    expect(elapsed).toBeLessThan(500);
  });
});

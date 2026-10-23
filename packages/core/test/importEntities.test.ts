import { describe, expect, it } from 'vitest';
import { CSV_TEMPLATE, importEntities, type ImportIssueCode, type ImportResult } from '../src';

const codes = (result: ImportResult): ImportIssueCode[] => result.issues.map((issue) => issue.code);
const issue = (result: ImportResult, code: ImportIssueCode) =>
  result.issues.find((entry) => entry.code === code);

const SAMPLE = [
  'id,name,category,cost,hp,atk:physical,atk:magic,def:physical,def:magic,rate,tag:role',
  'guardian,Stone Guardian,champion,4800,680,55,0,48,40,0.65,tank',
  'archer,Wind Archer,champion,4500,560,68,0,26,30,0.72,marksman',
].join('\n');

describe('importEntities', () => {
  it('imports the documented format', () => {
    const result = importEntities(SAMPLE);
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.delimiter).toBe(',');
    expect(result.channels).toEqual([
      { key: 'physical', label: 'Physical', mitigation: 'percent' },
      { key: 'magic', label: 'Magic', mitigation: 'percent' },
    ]);
    expect(result.entities[0]).toEqual({
      id: 'guardian',
      name: 'Stone Guardian',
      category: 'champion',
      cost: 4800,
      hp: 680,
      rate: 0.65,
      atk: { physical: 55, magic: 0 },
      def: { physical: 48, magic: 40 },
      tags: { role: 'tank' },
      stats: {},
    });
  });

  it('creates true-damage channels when there is no defense column', () => {
    const result = importEntities('id,name,hp,atk:true\na,A,10,5');
    expect(result.channels).toEqual([{ key: 'true', label: 'True', mitigation: 'none' }]);
  });

  it('accepts semicolons with decimal commas', () => {
    const result = importEntities('id;name;hp;rate\na;A;10;0,65');
    expect(result.delimiter).toBe(';');
    expect(result.entities[0]?.rate).toBe(0.65);
  });

  it('imports the official template without issues', () => {
    const result = importEntities(CSV_TEMPLATE);
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.entities).toHaveLength(4);
    expect(result.channels).toEqual([
      { key: '1', label: '1', mitigation: 'percent' },
      { key: '2', label: '2', mitigation: 'percent' },
      { key: '3', label: '3', mitigation: 'percent' },
    ]);
  });

  it('reads headers case-insensitively', () => {
    const result = importEntities('ID,Name,HP,ATK:Physical\na,A,10,3');
    expect(result.ok).toBe(true);
    expect(result.entities[0]).toMatchObject({ id: 'a', name: 'A', hp: 10, atk: { physical: 3 } });
  });

  it('applies defaults for empty cells', () => {
    const result = importEntities('id,name,cost,hp,rate,atk:x,def:x,speed,category,tag:role\na,A,,,,,,,,');
    const [entity] = result.entities;
    expect(entity).toEqual({ id: 'a', name: 'A', rate: 1, atk: { x: 0 }, def: { x: 0 }, tags: {}, stats: {} });
    expect(issue(result, 'missing-cost')?.lines).toEqual([2]);
    expect(issue(result, 'missing-hp')?.lines).toEqual([2]);
    expect(result.ok).toBe(true);
  });

  it('rejects rows shorter than the header', () => {
    const result = importEntities('id,name,hp,speed\na,A\nb,B,10,2');
    expect(issue(result, 'row-too-short')).toMatchObject({ severity: 'error', lines: [2] });
    expect(issue(result, 'row-too-short')?.message).toContain('commas');
    expect(result.entities).toEqual([]);
  });

  it('keeps fully numeric extra columns as stats', () => {
    const result = importEntities('id,name,hp,speed\na,A,10,3.5');
    expect(result.entities[0]?.stats).toEqual({ speed: 3.5 });
  });

  it('ignores free-text extra columns with a warning', () => {
    const result = importEntities('id,name,hp,rarity\na,A,10,epic\nb,B,10,3');
    expect(result.ok).toBe(true);
    expect(issue(result, 'text-column-ignored')).toMatchObject({ severity: 'warning', column: 'rarity' });
    expect(result.entities[1]?.stats).toEqual({});
  });

  it('ignores pen: columns as not supported yet', () => {
    const result = importEntities('id,name,hp,pen:physical\na,A,10,5');
    expect(issue(result, 'unsupported-column')).toMatchObject({ severity: 'warning' });
    expect(result.entities[0]?.stats).toEqual({});
  });

  it('treats prefixed columns without a key as stats', () => {
    const result = importEntities('id,name,hp,atk:\na,A,10,5');
    expect(result.entities[0]?.stats).toEqual({ 'atk:': 5 });
  });

  it('warns about headerless columns and defense without attack', () => {
    const result = importEntities('id,name,hp,,def:magic\na,A,10,x,4');
    expect(codes(result)).toEqual(['empty-header', 'defense-without-attack']);
    expect(result.ok).toBe(true);
  });

  it('allows negative defense with a warning', () => {
    const result = importEntities('id,name,hp,atk:x,def:x\na,A,10,1,-5');
    expect(result.ok).toBe(true);
    expect(issue(result, 'negative-defense')?.lines).toEqual([2]);
    expect(result.entities[0]?.def).toEqual({ x: -5 });
  });

  it('rejects negative hp, rate and attack', () => {
    const result = importEntities('id,name,hp,rate,atk:x\na,A,-1,1,1\nb,B,1,-1,1\nc,C,1,1,-1\nd,D,1,1,1');
    expect(result.ok).toBe(false);
    expect(result.issues.filter((entry) => entry.code === 'negative-value')).toHaveLength(3);
    expect(result.entities).toEqual([]);
  });

  it('allows negative extra stats and cost', () => {
    const result = importEntities('id,name,hp,cost,luck\na,A,1,-2,-3');
    expect(result.ok).toBe(true);
    expect(result.entities[0]).toMatchObject({ cost: -2, stats: { luck: -3 } });
  });

  it('rejects text in numeric columns', () => {
    const result = importEntities('id,name,hp\na,A,lots\nb,B,lots');
    expect(issue(result, 'not-a-number')).toMatchObject({ column: 'hp', lines: [2, 3] });
    expect(result.entities).toEqual([]);
  });

  it('validates ids and names', () => {
    const result = importEntities('id,name,hp\n,Nameless,1\nbad id,Bad,1\nok,,1\ndup,Dup,1\ndup,Dup,1');
    expect(codes(result)).toEqual(['missing-id', 'invalid-id', 'missing-name', 'duplicate-id']);
    expect(issue(result, 'duplicate-id')?.lines).toEqual([6]);
    expect(result.entities).toEqual([]);
  });

  it('rejects rows longer than the header and explains quoting for the detected separator', () => {
    const comma = importEntities('id,name\na,A,extra');
    expect(issue(comma, 'row-too-long')?.lines).toEqual([2]);
    expect(issue(comma, 'row-too-long')?.message).toContain('"Archer, the Swift"');
    expect(comma.entities).toEqual([]);
    const tab = importEntities('id\tname\na\tA\textra');
    expect(issue(tab, 'row-too-long')?.message).toContain('tab');
  });

  it('is all or nothing: one error rejects every row and channel', () => {
    const result = importEntities('id,name,hp,atk:x\na,A,10,1\nb,B,lots,1\nc,C,10,1');
    expect(result.ok).toBe(false);
    expect(result.entities).toEqual([]);
    expect(result.channels).toEqual([]);
  });

  it('reports every error in the file at once', () => {
    const result = importEntities('id,name,hp\na,A,lots\na,,10\nb c,B,-1');
    expect(codes(result)).toEqual([
      'not-a-number',
      'duplicate-id',
      'missing-name',
      'negative-value',
      'invalid-id',
    ]);
  });

  it('suggests decimal commas only for semicolon files', () => {
    expect(issue(importEntities('id,name,hp\na,A,x'), 'not-a-number')?.message).toContain('use a dot');
    expect(issue(importEntities('id;name;hp\na;A;x'), 'not-a-number')?.message).toContain('a comma or a dot');
  });

  it('lists a line only once per issue', () => {
    const result = importEntities('id,name,hp,atk:x\na,A,-1,-1');
    expect(issue(result, 'negative-value')?.lines).toEqual([2]);
  });

  it('reports only quote errors when the file has any', () => {
    const result = importEntities('id,name,hp\na,12" Cannon,lots\nb,"Open,10\nc,C,10');
    expect(codes(result)).toEqual(['stray-quote', 'unclosed-quote']);
    expect(issue(result, 'stray-quote')?.lines).toEqual([2]);
    expect(issue(result, 'unclosed-quote')?.lines).toEqual([3]);
    expect(result.entities).toEqual([]);
  });

  it('rejects duplicate columns', () => {
    const result = importEntities('id,name,HP,hp\na,A,1,2');
    expect(issue(result, 'duplicate-column')).toMatchObject({ severity: 'error', column: 'hp' });
    expect(result.ok).toBe(false);
  });

  it('requires id and name columns', () => {
    const result = importEntities('title,hp\nA,10');
    expect(codes(result)).toEqual(['missing-column', 'missing-column']);
    expect(result.entities).toEqual([]);
  });

  it('reports an empty file', () => {
    const result = importEntities('   \n');
    expect(result.ok).toBe(false);
    expect(codes(result)).toEqual(['empty-file']);
  });

  it('imports 5,000 entities well under the 2 s budget', () => {
    const rows = ['id,name,cost,hp,atk:physical,atk:magic,def:physical,def:magic,rate,tag:role'];
    for (let i = 0; i < 5000; i++) rows.push(`e${i},Entity ${i},${i},500,50,20,30,30,0.7,tank`);
    const start = performance.now();
    const result = importEntities(rows.join('\n'));
    const elapsed = performance.now() - start;
    expect(result.entities).toHaveLength(5000);
    expect(elapsed).toBeLessThan(500);
  });
});

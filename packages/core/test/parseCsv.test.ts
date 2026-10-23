import { describe, expect, it } from 'vitest';
import { detectDelimiter, parseCsv, parseNumber } from '../src';

describe('detectDelimiter', () => {
  it('detects comma, semicolon and tab from the header', () => {
    expect(detectDelimiter('a,b,c\n1;2;3')).toBe(',');
    expect(detectDelimiter('a;b;c\n1,2,3')).toBe(';');
    expect(detectDelimiter('a\tb\tc')).toBe('\t');
  });

  it('ignores delimiters inside quotes and defaults to comma', () => {
    expect(detectDelimiter('"a;b;c",d')).toBe(',');
    expect(detectDelimiter('single')).toBe(',');
  });

  it('stops at a carriage return', () => {
    expect(detectDelimiter('a;b\r\nc,d,e,f')).toBe(';');
  });
});

describe('parseCsv', () => {
  it('parses rows and line numbers, skipping blank lines', () => {
    const parsed = parseCsv('a,b\n1,2\n\n3,4');
    expect(parsed.records).toEqual([
      { cells: ['a', 'b'], line: 1 },
      { cells: ['1', '2'], line: 2 },
      { cells: ['3', '4'], line: 4 },
    ]);
  });

  it('handles CRLF, a BOM and a trailing newline', () => {
    const parsed = parseCsv('﻿a,b\r\n1,2\r\n');
    expect(parsed.records.map((record) => record.cells)).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('handles quotes, escaped quotes, delimiters and line breaks inside fields', () => {
    const parsed = parseCsv('name,notes\n"Doe, J","said ""hi""\nthen left"\nnext,x');
    expect(parsed.records[1]?.cells).toEqual(['Doe, J', 'said "hi"\nthen left']);
    expect(parsed.records.map((record) => record.line)).toEqual([1, 2, 4]);
  });

  it('accepts empty quoted values', () => {
    const parsed = parseCsv('a,b\n"",x\n1,""');
    expect(parsed.records.map((record) => record.cells)).toEqual([
      ['a', 'b'],
      ['', 'x'],
      ['1', ''],
    ]);
    expect(parsed.syntaxErrors).toEqual([]);
  });

  it('reports a quote inside an unquoted value', () => {
    expect(parseCsv('a,b\n12" Cannon,1').syntaxErrors).toEqual([{ code: 'stray-quote', line: 2 }]);
  });

  it('reports text right after a closing quote', () => {
    expect(parseCsv('a\n"Archer"s bow').syntaxErrors).toEqual([{ code: 'stray-quote', line: 2 }]);
  });

  it('reports an unclosed quote at the line where it starts', () => {
    const parsed = parseCsv('a,b\n1,"open\n2,3\n4,5');
    expect(parsed.syntaxErrors).toEqual([{ code: 'unclosed-quote', line: 2 }]);
  });

  it('returns no rows for empty input', () => {
    expect(parseCsv('').records).toEqual([]);
  });

  it('keeps a trailing empty cell', () => {
    expect(parseCsv('a,b\n1,').records[1]?.cells).toEqual(['1', '']);
  });
});

describe('parseNumber', () => {
  it('parses numbers and returns undefined for empty cells', () => {
    expect(parseNumber(' 42 ', false)).toBe(42);
    expect(parseNumber('-1.5e2', false)).toBe(-150);
    expect(parseNumber('.5', false)).toBe(0.5);
    expect(parseNumber('', false)).toBeUndefined();
  });

  it('rejects text and partial numbers', () => {
    expect(parseNumber('abc', false)).toBeNaN();
    expect(parseNumber('12px', false)).toBeNaN();
    expect(parseNumber('0,65', false)).toBeNaN();
  });

  it('accepts a decimal comma when enabled', () => {
    expect(parseNumber('0,65', true)).toBe(0.65);
  });
});

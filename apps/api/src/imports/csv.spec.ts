import { normaliseHeader, parseCsv, parseCsvRows } from './csv';

describe('parseCsv', () => {
  it('reads a plain file', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('handles CRLF, which is what Excel on Windows writes', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('strips the UTF-8 BOM so the first header is not corrupted', () => {
    expect(parseCsv('﻿code,name\nX,Y')[0][0]).toBe('code');
  });

  it('keeps commas inside quoted fields', () => {
    expect(parseCsv('a,b\n"Nagpur, Maharashtra",2')).toEqual([
      ['a', 'b'],
      ['Nagpur, Maharashtra', '2'],
    ]);
  });

  it('unescapes doubled quotes', () => {
    expect(parseCsv('a\n"He said ""go"""')).toEqual([['a'], ['He said "go"']]);
  });

  it('keeps newlines inside quoted fields', () => {
    expect(parseCsv('a,b\n"line one\nline two",2')).toEqual([
      ['a', 'b'],
      ['line one\nline two', '2'],
    ]);
  });

  it('drops entirely blank lines rather than reading them as rows', () => {
    expect(parseCsv('a,b\n1,2\n\n,\n3,4')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('flushes a final row with no trailing newline', () => {
    expect(parseCsv('a\n1')).toEqual([['a'], ['1']]);
  });
});

describe('normaliseHeader', () => {
  it.each([
    ['componentCode', 'componentCode'],
    ['Component Code', 'componentCode'],
    ['component_code', 'componentCode'],
    ['COMPONENT CODE', 'cOMPONENTCODE'],
    ['  name  ', 'name'],
  ])('maps %s to %s', (input, expected) => {
    expect(normaliseHeader(input)).toBe(expected);
  });
});

describe('parseCsvRows', () => {
  it('keys rows by normalised header and trims values', () => {
    const rows = parseCsvRows('Component Code,Name\n CMP-1 , Bracket ');
    expect(rows).toEqual([{ componentCode: 'CMP-1', name: 'Bracket' }]);
  });

  it('fills missing trailing cells with empty strings rather than undefined', () => {
    const rows = parseCsvRows('a,b,c\n1,2');
    expect(rows).toEqual([{ a: '1', b: '2', c: '' }]);
  });

  it('returns nothing for an empty file', () => {
    expect(parseCsvRows('')).toEqual([]);
  });
});

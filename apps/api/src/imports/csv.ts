/**
 * A small RFC 4180 reader. The reports module already writes CSV by hand; this is the other half,
 * and it keeps a parsing dependency out of an endpoint that accepts uploaded files.
 *
 * Handles quoted fields, escaped quotes (`""`), embedded commas and newlines, CRLF, and a UTF-8
 * BOM — which is what Excel produces on a Windows machine, so it matters here.
 */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  // A file that does not end in a newline still has a final field to flush.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((line) => line.some((cell) => cell.trim() !== ''));
}

/**
 * Parses into objects keyed by header. Headers are normalised so `Component Code`, `componentCode`
 * and `component_code` all land on the same key — people export these from wherever they keep them.
 */
export function parseCsvRows(input: string): Record<string, string>[] {
  const [header, ...lines] = parseCsv(input);
  if (!header) return [];
  const keys = header.map(normaliseHeader);

  return lines.map((line) => {
    const record: Record<string, string> = {};
    keys.forEach((key, index) => {
      if (key) record[key] = (line[index] ?? '').trim();
    });
    return record;
  });
}

export function normaliseHeader(header: string): string {
  const cleaned = header
    .trim()
    .replace(/[^a-zA-Z0-9]+(.)?/g, (_match, next: string | undefined) =>
      next ? next.toUpperCase() : '',
    );
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}

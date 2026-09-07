import * as React from 'react';

/**
 * The semantic shape of a column. Drives the glyph in the header, numeric
 * alignment, and whether a footer aggregate makes sense.
 *
 * Declared here rather than in `data-table` so both the server orchestrator
 * and the client grid can import it without a cycle.
 */
export type ColumnType = 'text' | 'number' | 'date' | 'status' | 'person' | 'location' | 'link';

/**
 * Column intelligence.
 *
 * Screens declare columns as `{ key, header, render }`. Rather than making
 * ~44 pages restate what is already obvious from the column's name, we infer
 * its type, a sort key and a sensible footer aggregate. Anything a screen
 * states explicitly always wins.
 */

/** Ordered most-specific first — the first pattern to match decides. */
const TYPE_PATTERNS: [ColumnType, RegExp][] = [
  ['date', /\b(date|due|deadline|created|updated|issued|received|dispatched|delivered|expiry|expires|period|timestamp|when|on)\b|at$/],
  ['status', /\b(status|state|stage|result|outcome|disposition|verdict|priority|severity|health)\b/],
  ['number', /\b(qty|quantity|count|total|sum|amount|value|rate|price|cost|score|percent|pct|days|hours|weight|balance|paid|due amount|variance|utilisation|utilization|capacity|accepted|rejected|scrapped|reworked)\b|%/],
  ['person', /\b(partner|vendor|supplier|user|owner|assignee|inspector|approver|raised by|created by|closed by|contact|operator|person|by)\b/],
  ['location', /\b(location|site|address|city|state|region|plant|warehouse|destination|origin|route)\b/],
  ['link', /\b(drawing|document|file|attachment|link|url|reference|ref)\b/],
];

export function inferColumnType(key: string, header: string): ColumnType {
  const haystack = `${key} ${header}`
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase();

  for (const [type, pattern] of TYPE_PATTERNS) {
    if (pattern.test(haystack)) return type;
  }
  return 'text';
}

/**
 * Flattens a rendered cell to its text content so a column built from JSX is
 * still sortable. Walks children rather than relying on the top-level node
 * being a bare string — most cells wrap their value in a span or a badge.
 */
export function extractText(node: React.ReactNode, depth = 0): string {
  // Cells are shallow; the cap only guards against a pathological tree.
  if (depth > 6) return '';
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map((child) => extractText(child, depth + 1)).join(' ');

  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode; value?: unknown; status?: unknown };
    // StatusBadge and friends carry their meaning in a prop, not in children.
    if (typeof props.status === 'string') return props.status;
    if (typeof props.value === 'string' || typeof props.value === 'number') return String(props.value);
    return extractText(props.children, depth + 1);
  }

  return '';
}

/** Parses "1,240", "₹ 12,400.50", "82%", "3 / 5" into a comparable number. */
export function parseNumeric(text: string): number | null {
  const match = text.replace(/[,\s]/g, '').match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

/**
 * Sums a numeric column for the footer rail. Returns null when the column
 * turns out not to be summable, so the footer cell stays empty rather than
 * showing a meaningless 0.
 */
export function sumColumn<T>(rows: T[], render: (row: T) => React.ReactNode): number | null {
  let total = 0;
  let seen = 0;
  for (const row of rows) {
    const value = parseNumeric(extractText(render(row)));
    if (value !== null) {
      total += value;
      seen += 1;
    }
  }
  return seen > 0 ? total : null;
}

export function formatAggregate(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

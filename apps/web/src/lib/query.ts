export type SearchParams = Record<string, string | string[] | undefined>;

export function readParam(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

export function readPage(params: SearchParams): number {
  const raw = readParam(params, 'page');
  const page = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(page) && page > 0 ? page : 1;
}

/** Builds a query string from the allowed keys present in the incoming params. */
export function buildQuery(
  params: SearchParams,
  keys: string[],
  extra: Record<string, string | number | undefined> = {},
): string {
  const query = new URLSearchParams();
  for (const key of keys) {
    const value = readParam(params, key);
    if (value) query.set(key, value);
  }
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

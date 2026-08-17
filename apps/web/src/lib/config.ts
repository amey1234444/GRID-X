const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX ?? 'api';

function normalizeApiUrl(raw: string): string {
  const base = raw.replace(/\/+$/, '');
  return base.endsWith(`/${API_PREFIX}`) ? base : `${base}/${API_PREFIX}`;
}

export const API_URL = normalizeApiUrl(
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
);

export const SESSION_COOKIE = 'gridx_session';
export const REFRESH_COOKIE = 'gridx_refresh';

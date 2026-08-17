'use client';

/**
 * Offline write queue for the partner PWA (Section 8). Milestone updates and
 * acknowledgements are queued in localStorage when the device is offline and
 * replayed automatically once connectivity returns. Every entry carries a
 * clientRequestId so replays are idempotent on the server.
 */

const STORAGE_KEY = 'gridx.offline.queue.v1';

export interface QueuedRequest {
  clientRequestId: string;
  path: string;
  body: Record<string, unknown>;
  label: string;
  queuedAt: string;
}

function read(): QueuedRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedRequest[]) : [];
  } catch {
    return [];
  }
}

function write(queue: QueuedRequest[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent('gridx:queue-changed', { detail: queue.length }));
}

export function queueSize(): number {
  return read().length;
}

export function enqueue(entry: Omit<QueuedRequest, 'queuedAt'>): void {
  write([...read(), { ...entry, queuedAt: new Date().toISOString() }]);
}

export function newRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function post(entry: QueuedRequest): Promise<boolean> {
  try {
    const response = await fetch(`/api/gridx${entry.path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...entry.body, clientRequestId: entry.clientRequestId, syncedFromOffline: true }),
    });
    // 4xx responses are permanent: the entry is dropped so the queue cannot jam.
    return response.ok || (response.status >= 400 && response.status < 500);
  } catch {
    return false;
  }
}

/** Sends one request, queueing it instead when the network is unavailable. */
export async function submit(entry: Omit<QueuedRequest, 'queuedAt'>): Promise<'sent' | 'queued' | 'rejected'> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    enqueue(entry);
    return 'queued';
  }
  try {
    const response = await fetch(`/api/gridx${entry.path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...entry.body, clientRequestId: entry.clientRequestId }),
    });
    if (response.ok) return 'sent';
    if (response.status >= 500) {
      enqueue(entry);
      return 'queued';
    }
    return 'rejected';
  } catch {
    enqueue(entry);
    return 'queued';
  }
}

/** Replays every queued request; returns how many were flushed. */
export async function flush(): Promise<number> {
  const queue = read();
  if (queue.length === 0) return 0;
  const remaining: QueuedRequest[] = [];
  let flushed = 0;
  for (const entry of queue) {
    const done = await post(entry);
    if (done) flushed += 1;
    else remaining.push(entry);
  }
  write(remaining);
  return flushed;
}

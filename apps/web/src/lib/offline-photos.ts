'use client';

/**
 * Offline photograph store for the partner PWA (Section 19).
 *
 * Milestone updates queue happily in localStorage because they are small JSON objects. Photographs
 * are not: a phone camera file is several megabytes of binary, which localStorage can neither hold
 * nor represent. Section 19 asks specifically for photographs to queue for upload, so they go in
 * IndexedDB as Blobs and are uploaded on reconnection, before the milestone that references them.
 */

const DB_NAME = 'gridx-offline';
const DB_VERSION = 1;
const STORE = 'photos';

export interface QueuedPhoto {
  id: string;
  /** Groups photographs with the milestone update they belong to. */
  clientRequestId: string;
  blob: Blob;
  fileName: string;
  category: string;
  queuedAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('clientRequestId', 'clientRequestId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB unavailable'));
  });
}

/** IndexedDB is missing in some private-browsing modes; the caller falls back to online-only. */
export function photosSupported(): boolean {
  return typeof indexedDB !== 'undefined';
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB write failed'));
        transaction.oncomplete = () => db.close();
      }),
  );
}

export async function queuePhotos(
  clientRequestId: string,
  files: File[],
  category = 'PROGRESS_PHOTO',
): Promise<string[]> {
  const ids: string[] = [];
  for (const file of files) {
    const id = `${clientRequestId}-${ids.length}-${Date.now()}`;
    await tx('readwrite', (store) =>
      store.put({
        id,
        clientRequestId,
        // Copying to a Blob detaches the entry from the file handle, which a phone may revoke as
        // soon as the picker closes.
        blob: file.slice(0, file.size, file.type),
        fileName: file.name,
        category,
        queuedAt: new Date().toISOString(),
      } satisfies QueuedPhoto),
    );
    ids.push(id);
  }
  return ids;
}

export async function photosFor(clientRequestId: string): Promise<QueuedPhoto[]> {
  const all = await tx<QueuedPhoto[]>('readonly', (store) => store.getAll() as IDBRequest<QueuedPhoto[]>);
  return all.filter((photo) => photo.clientRequestId === clientRequestId);
}

export async function pendingPhotoCount(): Promise<number> {
  if (!photosSupported()) return 0;
  try {
    return await tx<number>('readonly', (store) => store.count());
  } catch {
    return 0;
  }
}

export async function discardPhotos(ids: string[]): Promise<void> {
  for (const id of ids) {
    await tx('readwrite', (store) => store.delete(id) as unknown as IDBRequest<undefined>);
  }
}

/**
 * Uploads one queued photograph and returns the stored file id.
 *
 * Returns null when the upload failed for a reason worth retrying, and throws only when the server
 * has rejected the file outright — a photograph the server will never accept must not wedge the
 * queue behind it.
 */
export async function uploadQueuedPhoto(photo: QueuedPhoto): Promise<string | null> {
  const body = new FormData();
  body.append('file', new File([photo.blob], photo.fileName, { type: photo.blob.type }));

  let response: Response;
  try {
    response = await fetch(`/api/gridx/files/upload?category=${photo.category}`, {
      method: 'POST',
      body,
    });
  } catch {
    return null;
  }

  if (response.ok) {
    const payload = (await response.json()) as { id: string };
    return payload.id;
  }
  if (response.status >= 500) return null;
  throw new Error(`Photograph rejected (${response.status})`);
}

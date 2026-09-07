'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration(): null {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      /* registration is best-effort; the app works without it */
    });
  }, []);
  return null;
}

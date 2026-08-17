'use client';

import { useCallback, useEffect, useState } from 'react';
import { CloudOff, RefreshCw, Wifi } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { flush, queueSize } from '@/lib/offline';

export function OfflineBanner({ language }: { language: 'EN' | 'HI' }): React.JSX.Element | null {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    setSyncing(true);
    await flush();
    setPending(queueSize());
    setSyncing(false);
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    setPending(queueSize());

    const goOnline = (): void => {
      setOnline(true);
      void sync();
    };
    const goOffline = (): void => setOnline(false);
    const onQueueChange = (event: Event): void => {
      const detail = (event as CustomEvent<number>).detail;
      setPending(typeof detail === 'number' ? detail : queueSize());
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener('gridx:queue-changed', onQueueChange);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('gridx:queue-changed', onQueueChange);
    };
  }, [sync]);

  if (online && pending === 0) return null;

  const offlineText = language === 'HI' ? 'ऑफ़लाइन — काम सुरक्षित रहेगा' : 'Offline — your updates are saved on this device';
  const pendingText =
    language === 'HI'
      ? `${pending} अपडेट भेजना बाकी है`
      : `${pending} update${pending === 1 ? '' : 's'} waiting to sync`;

  return (
    <div className="flex items-center gap-3 border-b bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      {online ? <Wifi className="h-4 w-4 shrink-0" /> : <CloudOff className="h-4 w-4 shrink-0" />}
      <span className="flex-1">{online ? pendingText : offlineText}</span>
      {pending > 0 ? (
        <Button size="sm" variant="outline" onClick={() => void sync()} disabled={syncing || !online}>
          <RefreshCw className={syncing ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
          {language === 'HI' ? 'सिंक' : 'Sync'}
        </Button>
      ) : null}
    </div>
  );
}

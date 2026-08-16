'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';

import { api } from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDateTime } from '@/lib/format';

interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  readAt: string | null;
  link: string | null;
}

interface NotificationPage {
  data: NotificationRow[];
  meta?: { total: number };
}

export function NotificationBell(): React.JSX.Element {
  const [items, setItems] = useState<NotificationRow[]>([]);

  const load = useCallback(async () => {
    try {
      const page = await api.get<NotificationPage>('/notifications?unreadOnly=true&pageSize=8');
      setItems(page.data);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 60_000);
    return () => clearInterval(timer);
  }, [load]);

  const markAll = async (): Promise<void> => {
    try {
      await api.post('/notifications/read-all');
      setItems([]);
    } catch {
      /* the badge simply stays until the next poll */
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {items.length > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {items.length}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          {items.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => void markAll()}>
              <CheckCheck /> Mark all
            </Button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">You are all caught up.</p>
        ) : (
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="rounded-md px-2 py-2 hover:bg-secondary">
                <p className="text-sm font-medium">{item.title}</p>
                {item.body ? <p className="text-xs text-muted-foreground">{item.body}</p> : null}
                <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(item.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

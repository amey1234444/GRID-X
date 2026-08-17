'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';

import { api } from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  unreadCount: number;
}

/**
 * `inboxHref` is omitted by shells that have no full notifications page — the
 * Partner PWA keeps its navigation deliberately short.
 */
export function NotificationBell({
  inboxHref,
}: {
  inboxHref?: string;
} = {}): React.JSX.Element {
  const [items, setItems] = useState<NotificationRow[]>([]);
  // The dropdown lists the newest eight; the badge shows the true unread total.
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const page = await api.get<NotificationPage>('/notifications?unreadOnly=true&pageSize=8');
      setItems(page.data);
      setUnreadCount(page.unreadCount);
    } catch {
      setItems([]);
      setUnreadCount(0);
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
      setUnreadCount(0);
    } catch {
      /* the badge simply stays until the next poll */
    }
  };

  const markRead = async (id: string): Promise<void> => {
    setItems((current) => current.filter((item) => item.id !== id));
    setUnreadCount((count) => Math.max(0, count - 1));
    try {
      await api.post(`/notifications/${id}/read`);
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
          {unreadCount > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          {unreadCount > 0 ? (
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
            {items.map((item) => {
              const body = (
                <>
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.body ? <p className="text-xs text-muted-foreground">{item.body}</p> : null}
                  <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                </>
              );
              return (
                <li key={item.id} className="rounded-md hover:bg-secondary">
                  {item.link ? (
                    <Link href={item.link} className="block px-2 py-2" onClick={() => void markRead(item.id)}>
                      {body}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void markRead(item.id)}
                      className="block w-full px-2 py-2 text-left"
                    >
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {inboxHref ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={inboxHref} className="justify-center text-sm">
                View all notifications
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

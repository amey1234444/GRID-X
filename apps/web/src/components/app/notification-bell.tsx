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
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-input text-muted-foreground transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold leading-none text-destructive-foreground ring-2 ring-background">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between pr-1">
          Notifications
          {unreadCount > 0 ? (
            <Button variant="ghost" size="xs" onClick={() => void markAll()}>
              <CheckCheck /> Mark all read
            </Button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-2 py-8 text-center">
            <Bell className="h-5 w-5 text-subtle" />
            <p className="text-[0.8125rem] text-muted-foreground">You are all caught up.</p>
          </div>
        ) : (
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {items.map((item) => {
              const body = (
                <>
                  <p className="text-[0.8125rem] font-medium leading-snug text-foreground">{item.title}</p>
                  {item.body ? (
                    <p className="mt-0.5 line-clamp-2 text-[0.75rem] leading-snug text-muted-foreground">
                      {item.body}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-subtle">{formatDateTime(item.createdAt)}</p>
                </>
              );
              return (
                <li
                  key={item.id}
                  className="relative rounded-input transition-colors duration-100 hover:bg-surface-hover"
                >
                  {/* Unread marker — every row in this list is unread by query. */}
                  <span
                    className="absolute left-0 top-3 h-1.5 w-1.5 rounded-full bg-primary"
                    aria-hidden
                  />
                  {item.link ? (
                    <Link href={item.link} className="block py-2 pl-3.5 pr-2" onClick={() => void markRead(item.id)}>
                      {body}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void markRead(item.id)}
                      className="block w-full py-2 pl-3.5 pr-2 text-left"
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
              <Link href={inboxHref} className="justify-center text-[0.8125rem]">
                View all notifications
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

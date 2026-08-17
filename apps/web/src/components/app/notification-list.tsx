'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCheck } from 'lucide-react';

import { api } from '@/lib/client-api';
import { PaginationControls } from '@/components/app/pagination-controls';
import { EmptyState } from '@/components/app/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime, humanise } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface NotificationRow {
  id: string;
  event: string;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: string;
  readAt: string | null;
}

export function NotificationList({
  initial,
  page,
  totalPages,
  total,
}: {
  initial: NotificationRow[];
  page: number;
  totalPages: number;
  total: number;
}): React.JSX.Element {
  const [rows, setRows] = useState(initial);
  const unread = rows.filter((row) => row.readAt === null);

  const markRead = async (id: string): Promise<void> => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, readAt: new Date().toISOString() } : row)),
    );
    try {
      await api.post(`/notifications/${id}/read`);
    } catch {
      /* the next page load reconciles the badge */
    }
  };

  const markAll = async (): Promise<void> => {
    const now = new Date().toISOString();
    setRows((current) => current.map((row) => (row.readAt ? row : { ...row, readAt: now })));
    try {
      await api.post('/notifications/read-all');
    } catch {
      /* the next page load reconciles the badge */
    }
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nothing here yet"
        description="Notifications appear as jobs, material, inspections and invoices move through the workflow."
      />
    );
  }

  return (
    <div className="space-y-4">
      {unread.length > 0 ? (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => void markAll()}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        </div>
      ) : null}

      <ul className="space-y-2">
        {rows.map((row) => {
          const unreadRow = row.readAt === null;
          const content = (
            <CardContent className="flex items-start gap-3 p-4">
              <span
                className={cn(
                  'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                  unreadRow ? 'bg-primary' : 'bg-transparent',
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm', unreadRow && 'font-medium')}>{row.title}</p>
                {row.body ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">{row.body}</p>
                ) : null}
                <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="font-normal">
                    {humanise(row.event)}
                  </Badge>
                  {formatDateTime(row.createdAt)}
                </p>
              </div>
              {unreadRow ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(event) => {
                    event.preventDefault();
                    void markRead(row.id);
                  }}
                >
                  Mark read
                </Button>
              ) : null}
            </CardContent>
          );

          return (
            <li key={row.id}>
              <Card className={cn(unreadRow && 'border-primary/30 bg-primary/[0.03]')}>
                {row.link ? (
                  <Link href={row.link} onClick={() => void markRead(row.id)} className="block">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </Card>
            </li>
          );
        })}
      </ul>

      <PaginationControls page={page} totalPages={totalPages} total={total} />
    </div>
  );
}

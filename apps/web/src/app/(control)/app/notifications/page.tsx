import { PageHeader } from '@/components/app/page-header';
import {
  NotificationList,
  type NotificationRow,
} from '@/components/app/notification-list';
import { StatCard } from '@/components/app/stat-card';
import { formatNumber } from '@/lib/format';
import { readPage, type SearchParams } from '@/lib/query';
import { apiGet } from '@/lib/session';
import { emptyPage, type Paginated } from '@/lib/types';

export const metadata = { title: 'Notifications · GRID-X' };

type NotificationPage = Paginated<NotificationRow> & { unreadCount: number };

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const notifications = await apiGet<NotificationPage>(
    `/notifications?page=${page}&pageSize=30`,
    { ...emptyPage<NotificationRow>(), unreadCount: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Bell"
        title="Notifications"
        description="Everything GRID-X has raised for you — job acceptance, material acknowledgement, inspection results, invoice approvals and escalations."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="On this page" value={formatNumber(notifications.data.length)} />
        <StatCard
          label="Unread"
          value={formatNumber(notifications.unreadCount)}
          tone={notifications.unreadCount > 0 ? 'warning' : 'default'}
        />
        <StatCard label="Total" value={formatNumber(notifications.total)} />
      </div>

      <NotificationList
        initial={notifications.data}
        page={notifications.page}
        totalPages={notifications.totalPages}
        total={notifications.total}
      />
    </div>
  );
}

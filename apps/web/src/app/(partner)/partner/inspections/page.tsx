import Link from 'next/link';

import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime, formatNumber, humanise } from '@/lib/format';
import { readPage, type SearchParams } from '@/lib/query';
import { apiGet, currentUser } from '@/lib/session';
import { emptyPage, type InspectionRow, type Paginated, type ReworkRow } from '@/lib/types';

export const metadata = { title: 'Inspections · GRID-X Partner' };

export default async function PartnerInspectionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const [user, inspections, rework] = await Promise.all([
    currentUser(),
    apiGet<Paginated<InspectionRow>>(
      `/quality/inspections?page=${page}&pageSize=20`,
      emptyPage<InspectionRow>(),
    ),
    apiGet<Paginated<ReworkRow>>('/quality/rework?page=1&pageSize=20', emptyPage<ReworkRow>()),
  ]);
  const hindi = user?.language === 'HI';

  const pending = inspections.data.filter((row) => row.status !== 'COMPLETED').length;
  const rejected = inspections.data.reduce((sum, row) => sum + row.rejectedQuantity, 0);
  const openRework = rework.data.filter((row) => row.status !== 'COMPLETED' && row.status !== 'SCRAPPED');

  return (
    <div className="space-y-5">
      <PageHeader
        title={hindi ? 'जाँच' : 'Inspections'}
        description={
          hindi
            ? 'आपकी जाँच का नतीजा, अस्वीकृत मात्रा और रीवर्क।'
            : 'Inspection results for your batches, rejected quantity and open rework orders.'
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label={hindi ? 'जाँच बाकी' : 'Awaiting inspection'} value={formatNumber(pending)} tone={pending > 0 ? 'warning' : 'default'} />
        <StatCard label={hindi ? 'अस्वीकृत' : 'Rejected quantity'} value={formatNumber(rejected)} tone={rejected > 0 ? 'destructive' : 'default'} />
        <StatCard label={hindi ? 'रीवर्क' : 'Open rework'} value={formatNumber(openRework.length)} />
      </div>

      {inspections.data.length === 0 ? (
        <EmptyState
          title={hindi ? 'कोई जाँच नहीं' : 'No inspections yet'}
          description={
            hindi
              ? 'काम की स्क्रीन से बैच जाँच के लिए दें।'
              : 'Offer a completed batch for inspection from the job screen.'
          }
        />
      ) : (
        <ul className="space-y-3">
          {inspections.data.map((inspection) => (
            <li key={inspection.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-3 pt-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{inspection.inspectionNumber}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {humanise(inspection.type)}
                      {inspection.job ? ` · ${inspection.job.jobNumber}` : ''} · {formatDateTime(inspection.requestedAt)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatNumber(inspection.offeredQuantity)} {hindi ? 'दिए' : 'offered'} ·{' '}
                    {formatNumber(inspection.acceptedQuantity)} {hindi ? 'स्वीकृत' : 'accepted'} ·{' '}
                    {formatNumber(inspection.rejectedQuantity)} {hindi ? 'अस्वीकृत' : 'rejected'}
                  </span>
                  <StatusBadge language={hindi ? 'HI' : 'EN'} status={inspection.decision ?? inspection.status} />
                  {inspection.job ? (
                    <Link href={`/partner/jobs/${inspection.job.id}`} className="text-sm text-primary underline">
                      {hindi ? 'काम देखें' : 'View job'}
                    </Link>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {openRework.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {hindi ? 'रीवर्क' : 'Rework orders'}
          </h2>
          {openRework.map((order) => (
            <Card key={order.id}>
              <CardContent className="flex flex-wrap items-center gap-3 pt-6">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{order.reworkNumber}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatNumber(order.quantity)} {hindi ? 'नग' : 'nos'}
                    {order.job ? ` · ${order.job.jobNumber}` : ''} · {order.instructions}
                  </p>
                </div>
                <StatusBadge language={hindi ? 'HI' : 'EN'} status={order.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <PaginationControls page={inspections.page} totalPages={inspections.totalPages} total={inspections.total} />
    </div>
  );
}

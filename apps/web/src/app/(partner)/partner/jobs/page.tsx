import Link from 'next/link';

import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatusBadge } from '@/components/app/status-badge';
import { EmptyState } from '@/components/app/empty-state';
import { formatCurrency, formatDate, formatNumber, relativeDays } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { apiGet, currentUser } from '@/lib/session';
import { emptyPage, type JobRow, type Paginated } from '@/lib/types';

export const metadata = { title: 'Jobs · GRID-X Partner' };

const PARTNER_JOB_STATUSES = [
  'ALLOCATED',
  'ACCEPTED',
  'MATERIAL_ISSUED',
  'IN_PRODUCTION',
  'READY_FOR_INSPECTION',
  'COMPLETED',
  'CLOSED',
];

export default async function PartnerJobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '20' });
  for (const key of ['search', 'status']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const [user, jobs] = await Promise.all([
    currentUser(),
    apiGet<Paginated<JobRow>>(`/jobs?${query.toString()}`, emptyPage<JobRow>()),
  ]);
  const hindi = user?.language === 'HI';

  return (
    <div className="space-y-5">
      <PageHeader
        icon="ClipboardList"
        title={hindi ? 'काम' : 'Jobs'}
        description={
          hindi
            ? 'आपको दिए गए सभी काम — स्वीकार करें, प्रगति भेजें और जाँच के लिए दें।'
            : 'Every job allocated to you — accept, report progress and offer batches for inspection.'
        }
      />

      <SearchFilters
        searchPlaceholder={hindi ? 'जॉब नंबर या कंपोनेंट खोजें…' : 'Search job number or component…'}
        filters={[{ name: 'status', label: hindi ? 'स्थिति' : 'Status', options: optionsFrom(PARTNER_JOB_STATUSES) }]}
      />

      {jobs.data.length === 0 ? (
        <EmptyState
          title={hindi ? 'कोई काम नहीं मिला' : 'No jobs found'}
          description={hindi ? 'फ़िल्टर बदलकर देखें।' : 'Try a different status filter or search term.'}
        />
      ) : (
        <ul className="space-y-3">
          {jobs.data.map((job) => (
            <li key={job.id}>
              <Link
                href={`/partner/jobs/${job.id}`}
                className="block rounded-xl border bg-card p-4 transition-colors hover:bg-secondary/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{job.componentName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {job.jobNumber} · {job.componentCode}
                    </p>
                  </div>
                  <StatusBadge language={hindi ? 'HI' : 'EN'} status={job.status} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">{hindi ? 'मात्रा' : 'Quantity'}</dt>
                    <dd className="font-medium">{formatNumber(job.quantity)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{hindi ? 'तारीख' : 'Due'}</dt>
                    <dd className={job.isOverdue ? 'font-medium text-destructive' : 'font-medium'}>
                      {formatDate(job.dueDate)} · {relativeDays(job.dueDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{hindi ? 'मूल्य' : 'Value'}</dt>
                    <dd className="font-medium">{formatCurrency(job.value)}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <PaginationControls page={jobs.page} totalPages={jobs.totalPages} total={jobs.total} />
    </div>
  );
}

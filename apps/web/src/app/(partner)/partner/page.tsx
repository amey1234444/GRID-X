import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { EmptyState } from '@/components/app/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate, formatNumber, humanise, relativeDays } from '@/lib/format';
import { PARTNER_STRINGS, type Language } from '@/lib/i18n';
import { apiGet, currentUser } from '@/lib/session';
import { emptyPartnerDashboard, type PartnerDashboard } from '@/lib/types';

export const metadata = { title: 'Partner home · GRID-X' };

export default async function PartnerHomePage(): Promise<React.JSX.Element> {
  const [user, dashboard] = await Promise.all([
    currentUser(),
    apiGet<PartnerDashboard>('/dashboards/partner', emptyPartnerDashboard()),
  ]);
  const language: Language = user?.language === 'HI' ? 'HI' : 'EN';
  const s = (key: keyof typeof PARTNER_STRINGS): string => PARTNER_STRINGS[key][language];

  const openJobs = dashboard.jobs.slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        icon="LayoutDashboard"
        title={dashboard.businessName || (user?.partnerName ?? 'Partner')}
        description={
          language === 'HI'
            ? 'आपके चालू काम, माल और भुगतान की स्थिति।'
            : 'Your live jobs, material custody and payment status with OSWAR.'
        }
        actions={
          <Badge variant="secondary">
            {s('score')}: {dashboard.score === null ? '—' : formatNumber(dashboard.score, 1)} · {dashboard.category}
          </Badge>
        }
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard label={s('newJobs')} value={formatNumber(dashboard.newJobs)} tone={dashboard.newJobs > 0 ? 'warning' : 'default'} />
        <StatCard label={s('activeJobs')} value={formatNumber(dashboard.activeJobs)} />
        <StatCard label={s('awaitingMaterial')} value={formatNumber(dashboard.awaitingMaterialAck)} />
        <StatCard label={s('pendingInspections')} value={formatNumber(dashboard.pendingInspections)} />
        <StatCard label={language === 'HI' ? 'रीवर्क' : 'Rework open'} value={formatNumber(dashboard.reworkOpen)} tone={dashboard.reworkOpen > 0 ? 'destructive' : 'default'} />
        <StatCard label={s('paymentsDue')} value={formatCurrency(dashboard.paymentsDue)} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{s('jobs')}</CardTitle>
            <CardDescription>
              {language === 'HI' ? 'तारीख के अनुसार आपके काम' : 'Your jobs ordered by due date'}
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/partner/jobs">
              {language === 'HI' ? 'सभी' : 'All jobs'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {openJobs.length === 0 ? (
            <EmptyState
              title={language === 'HI' ? 'कोई काम नहीं' : 'No jobs yet'}
              description={
                language === 'HI'
                  ? 'नया काम मिलने पर यहाँ दिखेगा और आपको सूचना मिलेगी।'
                  : 'New jobs allocated by OSWAR appear here with a notification.'
              }
            />
          ) : (
            <ul className="divide-y">
              {openJobs.map((job) => (
                <li key={job.id}>
                  <Link href={`/partner/jobs/${job.id}`} className="flex items-center gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{job.componentName}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {job.jobNumber} · {formatNumber(job.quantity)} {language === 'HI' ? 'नग' : 'nos'} ·{' '}
                        {s('dueDate')} {formatDate(job.dueDate)}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={job.status} />
                      <span className={job.isOverdue ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
                        {relativeDays(job.dueDate)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{language === 'HI' ? 'ज़रूरी काम' : 'What needs you next'}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {[
            { href: '/partner/material', label: s('awaitingMaterial'), count: dashboard.awaitingMaterialAck },
            { href: '/partner/inspections', label: s('pendingInspections'), count: dashboard.pendingInspections },
            { href: '/partner/invoices', label: humanise('INVOICES_PENDING'), count: dashboard.invoicesPending },
            { href: '/partner/drawings', label: s('drawings'), count: null },
          ].map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-secondary"
            >
              <span className="text-sm font-medium">{tile.label}</span>
              <span className="text-sm text-muted-foreground">
                {tile.count === null ? <ArrowRight className="h-4 w-4" /> : formatNumber(tile.count)}
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

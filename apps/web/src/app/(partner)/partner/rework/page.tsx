import { AlertTriangle, IndianRupee } from 'lucide-react';

import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { readPage, type SearchParams } from '@/lib/query';
import { apiGet, currentUser } from '@/lib/session';
import { emptyPage, type Paginated, type ReworkRow } from '@/lib/types';

export const metadata = { title: 'Rework · GRID-X Partner' };

/**
 * Blueprint partner screen 10 — rework instructions.
 *
 * A partner could previously see that a job was in rework, but not what was wrong with it: the
 * defect, how many pieces, or what to correct all lived on the control side. Being told to redo
 * work without being told what to fix is how the same defect comes back twice.
 */
export default async function PartnerReworkPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const user = await currentUser();
  const hindi = user?.language === 'HI';

  const rework = await apiGet<Paginated<ReworkRow>>(
    `/quality/rework?page=${page}&pageSize=20`,
    emptyPage<ReworkRow>(),
  );

  const open = rework.data.filter((row) => row.completedAt === null);
  const chargeable = open.filter((row) => row.chargeToPartner);
  const chargeableValue = chargeable.reduce((sum, row) => sum + row.estimatedCost, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        icon="Hammer"
        title={hindi ? 'दोबारा काम' : 'Rework'}
        description={
          hindi
            ? 'जिन पुर्ज़ों में खराबी मिली है और उन्हें कैसे ठीक करना है।'
            : 'Parts that did not pass inspection, and exactly what needs correcting.'
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={hindi ? 'खुले काम' : 'Open'} value={String(open.length)} />
        <StatCard
          label={hindi ? 'आपके खाते में' : 'Chargeable to you'}
          value={String(chargeable.length)}
          hint={hindi ? 'बिल से कटेगा' : 'Deducted from your invoice'}
        />
        <StatCard
          label={hindi ? 'अनुमानित कटौती' : 'Estimated deduction'}
          value={formatCurrency(chargeableValue)}
        />
      </div>

      {rework.data.length === 0 ? (
        <EmptyState
          title={hindi ? 'कोई दोबारा काम नहीं' : 'No rework outstanding'}
          description={
            hindi
              ? 'आपके सभी पुर्ज़े जाँच में पास हुए हैं।'
              : 'Everything you have offered has passed inspection.'
          }
        />
      ) : (
        <div className="space-y-3">
          {rework.data.map((row) => (
            <Card key={row.id}>
              <CardContent className="space-y-3 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.reworkNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {row.job?.jobNumber}
                      {row.job?.component?.name ? ` · ${row.job.component.name}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={row.status} language={hindi ? 'HI' : 'EN'} />
                </div>

                {/* The instructions are the point of the screen, so they lead rather than sit in a
                    detail list below the metadata. */}
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {hindi ? 'क्या ठीक करना है' : 'What to correct'}
                  </p>
                  <p className="text-sm leading-relaxed">{row.instructions}</p>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {hindi ? 'कितने पुर्ज़े' : 'Quantity'}
                    </dt>
                    <dd className="tabular-nums">{formatNumber(row.quantity)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {hindi ? 'अंतिम तारीख' : 'Due'}
                    </dt>
                    <dd>{formatDate(row.dueDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {hindi ? 'जारी किया' : 'Issued'}
                    </dt>
                    <dd>{formatDate(row.issuedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {hindi ? 'खर्च किसका' : 'Cost'}
                    </dt>
                    <dd className="flex items-center gap-1">
                      {row.chargeToPartner ? (
                        <>
                          <IndianRupee className="h-3.5 w-3.5 text-destructive" />
                          <span className="text-destructive">
                            {formatCurrency(row.estimatedCost)}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          {hindi ? 'आपसे नहीं' : 'Not charged to you'}
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>

                <p className="text-xs text-muted-foreground">
                  {hindi
                    ? 'ठीक करने के बाद जाँच के लिए दोबारा भेजें।'
                    : 'Once corrected, offer the parts for inspection again from the job.'}
                </p>
              </CardContent>
            </Card>
          ))}
          <PaginationControls page={page} totalPages={rework.totalPages} total={rework.total} />
        </div>
      )}
    </div>
  );
}

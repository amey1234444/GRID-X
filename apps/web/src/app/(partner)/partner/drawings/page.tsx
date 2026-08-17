import { acknowledgeRevisionAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DrawingViewer } from '@/components/app/drawing-viewer';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatusBadge } from '@/components/app/status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { apiGet, currentUser } from '@/lib/session';
import { emptyPage, type DrawingRow, type Paginated } from '@/lib/types';

export const metadata = { title: 'Drawings · GRID-X Partner' };

export default async function PartnerDrawingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '20' });
  const search = readParam(searchParams, 'search');
  if (search) query.set('search', search);

  const [user, drawings] = await Promise.all([
    currentUser(),
    apiGet<Paginated<DrawingRow>>(`/drawings?${query.toString()}`, emptyPage<DrawingRow>()),
  ]);
  const hindi = user?.language === 'HI';

  return (
    <div className="space-y-5">
      <PageHeader
        title={hindi ? 'ड्रॉइंग' : 'Drawings'}
        description={
          hindi
            ? 'सिर्फ़ आपको दी गई मंज़ूर ड्रॉइंग दिखती हैं। हर बार देखने का रिकॉर्ड रखा जाता है।'
            : 'Only released revisions granted to you are visible. Every view is recorded in the drawing access log.'
        }
      />

      <SearchFilters searchPlaceholder={hindi ? 'ड्रॉइंग नंबर खोजें…' : 'Search drawing number or title…'} filters={[]} />

      {drawings.data.length === 0 ? (
        <EmptyState
          title={hindi ? 'कोई ड्रॉइंग नहीं' : 'No drawings available'}
          description={
            hindi
              ? 'काम मिलने पर OSWAR ड्रॉइंग की अनुमति देगा।'
              : 'OSWAR grants drawing access when a job is allocated to you.'
          }
        />
      ) : (
        <ul className="space-y-3">
          {drawings.data.map((drawing) => (
            <li key={drawing.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-3 pt-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{drawing.drawingNumber}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {drawing.title}
                      {drawing.componentCode ? ` · ${drawing.componentCode}` : ''}
                    </p>
                  </div>
                  {drawing.currentRevisionCode ? <Badge variant="secondary">Rev {drawing.currentRevisionCode}</Badge> : null}
                  {drawing.status ? <StatusBadge status={drawing.status} /> : null}
                  <span className="text-xs text-muted-foreground">
                    {drawing.releasedAt ? formatDate(drawing.releasedAt) : '—'}
                  </span>
                  {drawing.currentRevisionId ? (
                    <DrawingViewer
                      revisionId={drawing.currentRevisionId}
                      label={hindi ? 'ड्रॉइंग देखें' : 'View drawing'}
                    />
                  ) : null}
                  <ActionDialog
                    title={hindi ? 'ड्रॉइंग की पुष्टि' : 'Acknowledge revision'}
                    description={
                      hindi
                        ? 'पुष्टि करें कि आपने यही रिवीज़न पढ़ा और समझा है।'
                        : 'Confirm you have read and understood the current revision.'
                    }
                    triggerLabel={hindi ? 'पुष्टि' : 'Acknowledge'}
                    triggerVariant="outline"
                    submitLabel={hindi ? 'पुष्टि' : 'Acknowledge'}
                    action={acknowledgeRevisionAction}
                    hidden={{ revisionId: drawing.currentRevisionId ?? undefined }}
                    disabled={drawing.currentRevisionId === null}
                    fields={[{ name: 'remarks', label: hindi ? 'टिप्पणी' : 'Remarks', type: 'textarea', span: 2 }]}
                  />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <PaginationControls page={drawings.page} totalPages={drawings.totalPages} total={drawings.total} />
    </div>
  );
}

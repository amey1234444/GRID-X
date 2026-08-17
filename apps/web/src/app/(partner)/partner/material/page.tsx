import { acknowledgeMaterialAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate, formatNumber } from '@/lib/format';
import { readPage, type SearchParams } from '@/lib/query';
import { apiGet, currentUser } from '@/lib/session';
import { emptyPage, type MaterialIssueRow, type Paginated } from '@/lib/types';

export const metadata = { title: 'Material · GRID-X Partner' };

export default async function PartnerMaterialPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const [user, issues] = await Promise.all([
    currentUser(),
    apiGet<Paginated<MaterialIssueRow>>(
      `/materials/issues?page=${page}&pageSize=20`,
      emptyPage<MaterialIssueRow>(),
    ),
  ]);
  const hindi = user?.language === 'HI';

  const pending = issues.data.filter((issue) => issue.acknowledgements.length === 0);
  const custodyKg = issues.data.reduce((sum, issue) => sum + issue.totalIssueWeightKg, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title={hindi ? 'माल' : 'Material'}
        description={
          hindi
            ? 'OSWAR से मिला माल, पुष्टि और वापसी का हिसाब।'
            : 'Material issued to you by OSWAR, your acknowledgements and the weight still in your custody.'
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label={hindi ? 'चालान' : 'Challans'} value={formatNumber(issues.total)} />
        <StatCard
          label={hindi ? 'पुष्टि बाकी' : 'Awaiting acknowledgement'}
          value={formatNumber(pending.length)}
          tone={pending.length > 0 ? 'warning' : 'default'}
        />
        <StatCard label={hindi ? 'कुल वज़न' : 'Weight received'} value={`${formatNumber(custodyKg, 3)} kg`} />
      </div>

      {issues.data.length === 0 ? (
        <EmptyState
          title={hindi ? 'कोई चालान नहीं' : 'No material challans'}
          description={hindi ? 'माल भेजे जाने पर यहाँ दिखेगा।' : 'Challans appear here as soon as OSWAR dispatches material.'}
        />
      ) : (
        <ul className="space-y-3">
          {issues.data.map((issue) => {
            const ack = issue.acknowledgements[0];
            return (
              <li key={issue.id}>
                <Card>
                  <CardContent className="space-y-3 pt-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{issue.challanNumber}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatDate(issue.issueDate)}
                          {issue.job ? ` · ${issue.job.jobNumber}` : ''}
                          {issue.vehicleNumber ? ` · ${issue.vehicleNumber}` : ''}
                        </p>
                      </div>
                      <StatusBadge status={issue.status} />
                      {ack ? (
                        <span className="text-xs text-muted-foreground">
                          {formatNumber(ack.receivedWeightKg, 3)} kg {hindi ? 'मिला' : 'received'}
                          {ack.shortageWeightKg > 0
                            ? ` · ${formatNumber(ack.shortageWeightKg, 3)} kg ${hindi ? 'कमी' : 'short'}`
                            : ''}
                        </span>
                      ) : (
                        <ActionDialog
                          title={hindi ? 'माल की पुष्टि' : 'Acknowledge material'}
                          description={
                            hindi
                              ? 'तुलाई के बाद असली वज़न भरें। कमी दर्ज करने पर OSWAR को सूचना जाती है।'
                              : 'Enter the weight actually received after weighing. Shortages are escalated to OSWAR immediately.'
                          }
                          triggerLabel={hindi ? 'पुष्टि' : 'Acknowledge'}
                          submitLabel={hindi ? 'भेजें' : 'Acknowledge'}
                          action={acknowledgeMaterialAction}
                          hidden={{ issueId: issue.id }}
                          fields={[
                            {
                              name: 'receivedWeightKg',
                              label: hindi ? 'मिला वज़न (kg)' : 'Weight received (kg)',
                              type: 'number',
                              step: '0.001',
                              required: true,
                              defaultValue: String(issue.totalIssueWeightKg),
                            },
                            {
                              name: 'shortageWeightKg',
                              label: hindi ? 'कमी (kg)' : 'Shortage (kg)',
                              type: 'number',
                              step: '0.001',
                              defaultValue: '0',
                            },
                            { name: 'signatureName', label: hindi ? 'नाम' : 'Received by', required: true },
                            {
                              name: 'photographFileIds',
                              label: hindi ? 'फ़ोटो' : 'Photographs',
                              type: 'files',
                              category: 'PHOTOGRAPH',
                              accept: 'image/*',
                              span: 2,
                            },
                            {
                              name: 'damageRemarks',
                              label: hindi ? 'नुकसान' : 'Damage remarks',
                              type: 'textarea',
                              span: 2,
                            },
                          ]}
                        />
                      )}
                    </div>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {issue.items.map((item) => (
                        <li key={item.id}>
                          {item.item.code} · {item.item.name} · {formatNumber(item.quantity)} {item.uom}
                          {item.heatNumber ? ` · Heat ${item.heatNumber}` : ''}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <PaginationControls page={issues.page} totalPages={issues.totalPages} total={issues.total} />
    </div>
  );
}

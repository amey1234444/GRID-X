import { imsSyncAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable, type Column } from '@/components/app/data-table';
import { DetailList } from '@/components/app/detail-list';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, formatNumber, humanise } from '@/lib/format';
import { apiGet } from '@/lib/session';
import type { ImsLogRow, ImsStatus } from '@/lib/types';

export const metadata = { title: 'IMS integration · GRID-X' };

interface ImsEntities {
  inbound: string[];
  outbound: string[];
}

export default async function ImsPage(): Promise<React.JSX.Element> {
  const [status, entities, logs] = await Promise.all([
    apiGet<ImsStatus>('/ims/status', { enabled: false, configured: false, timeoutMs: 0 }),
    apiGet<ImsEntities>('/ims/entities', { inbound: [], outbound: [] }),
    apiGet<ImsLogRow[]>('/ims/logs?limit=100', []),
  ]);

  const columns: Column<ImsLogRow>[] = [
    { key: 'when', header: 'When', render: (row) => formatDateTime(row.createdAt) },
    {
      key: 'direction',
      header: 'Direction',
      render: (row) => <Badge variant="secondary" className="font-normal">{humanise(row.direction)}</Badge>,
    },
    { key: 'entity', header: 'Entity', render: (row) => humanise(row.entity) },
    {
      key: 'ref',
      header: 'Record',
      render: (row) => (row.recordRef ? <span className="font-mono text-xs">{row.recordRef}</span> : '—'),
    },
    { key: 'result', header: 'Result', render: (row) => <StatusBadge status={row.success ? 'SUCCESS' : 'FAILED'} /> },
    { key: 'message', header: 'Message', render: (row) => row.message ?? '—' },
  ];

  const failures = logs.filter((row) => !row.success).length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Network"
        title="IMS integration"
        description="GRID-X never duplicates IMS-owned data. Masters flow in; outsourcing facts flow back out."
        actions={
          <>
            <ActionDialog
              title="Pull from IMS"
              description="Imports or refreshes master data owned by the IMS."
              triggerLabel="Pull masters"
              submitLabel="Pull"
              action={imsSyncAction}
              hidden={{ direction: 'pull' }}
              fields={[
                {
                  name: 'entity',
                  label: 'Entity',
                  type: 'select',
                  required: true,
                  span: 2,
                  options: entities.inbound.map((value) => ({ value, label: humanise(value) })),
                },
              ]}
            />
            <ActionDialog
              title="Push to IMS"
              description="Sends a GRID-X record back to the IMS as an outsourcing fact."
              triggerLabel="Push fact"
              triggerVariant="outline"
              submitLabel="Push"
              action={imsSyncAction}
              hidden={{ direction: 'push' }}
              fields={[
                {
                  name: 'entity',
                  label: 'Entity',
                  type: 'select',
                  required: true,
                  span: 2,
                  options: entities.outbound.map((value) => ({ value, label: humanise(value) })),
                },
                {
                  name: 'recordRef',
                  label: 'GRID-X record id',
                  required: true,
                  span: 2,
                  help: 'Job, material issue, inspection or invoice id depending on the entity',
                },
              ]}
            />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Integration" value={status.enabled ? 'Enabled' : 'Disabled'} />
        <StatCard label="Endpoint" value={status.configured ? 'Configured' : 'Not configured'} />
        <StatCard label="Sync events" value={formatNumber(logs.length)} />
        <StatCard label="Failures" value={formatNumber(failures)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connection</CardTitle>
          <CardDescription>
            Set IMS_ENABLED, IMS_BASE_URL and IMS_API_KEY to activate live synchronisation. While disabled, pulls accept
            payloads posted directly to GRID-X so the boundary can be tested.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DetailList
            items={[
              { label: 'Base URL', value: status.baseUrl ?? 'Not set' },
              { label: 'Timeout', value: `${formatNumber(status.timeoutMs)} ms` },
            ]}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consumed from IMS</CardTitle>
            <CardDescription>The IMS remains the system of record for these entities.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {entities.inbound.map((entity) => (
              <Badge key={entity} variant="secondary" className="font-normal">
                {humanise(entity)}
              </Badge>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sent to IMS</CardTitle>
            <CardDescription>Outsourcing facts GRID-X owns and reports back.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {entities.outbound.map((entity) => (
              <Badge key={entity} variant="secondary" className="font-normal">
                {humanise(entity)}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Sync log</h2>
        <DataTable
          columns={columns}
          rows={logs}
          empty={{ title: 'No sync activity', description: 'Pull masters or push a fact to see the trail here.' }}
        />
      </section>
    </div>
  );
}

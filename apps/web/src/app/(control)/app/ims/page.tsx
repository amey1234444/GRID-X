import { imsSyncAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable, type Column } from '@/components/app/data-table';
import { DetailList } from '@/components/app/detail-list';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, formatNumber, humanise } from '@/lib/format';
import { apiGet } from '@/lib/session';
import type {
  ImsCursorRow,
  ImsEntityIntrospection,
  ImsHealth,
  ImsIntrospection,
  ImsLogRow,
  ImsStatus,
} from '@/lib/types';

export const metadata = { title: 'IMS integration · GRID-X' };

interface ImsEntities {
  inbound: string[];
  outbound: string[];
  persisted: string[];
}

const DRIVER_LABEL: Record<ImsStatus['driver'], string> = {
  database: 'Direct database',
  http: 'REST API',
  disabled: 'Disabled',
};

const WRITE_LABEL: Record<ImsStatus['writeMode'], string> = {
  outbox: 'Outbox table in the IMS database',
  http: 'POST to the IMS API',
  none: 'Recorded in the sync log only',
};

export default async function ImsPage(): Promise<React.JSX.Element> {
  const [status, entities, logs, health, cursors] = await Promise.all([
    apiGet<ImsStatus>('/ims/status', {
      enabled: false,
      configured: false,
      driver: 'disabled',
      writeMode: 'none',
      mappingProfile: 'prisma',
      mappingOverrides: [],
      mappingWarnings: [],
      timeoutMs: 0,
      statementTimeoutMs: 0,
      inboundSyncEnabled: false,
      syncEntities: [],
      batchSize: 0,
    }),
    apiGet<ImsEntities>('/ims/entities', { inbound: [], outbound: [], persisted: [] }),
    apiGet<ImsLogRow[]>('/ims/logs?limit=100', []),
    apiGet<ImsHealth>('/ims/health', { driver: 'disabled', reachable: false }),
    apiGet<ImsCursorRow[]>('/ims/cursors', []),
  ]);

  // Introspection is only meaningful for the direct driver, and only worth a round trip when the
  // connection is actually up — a probe that just failed has already said what is wrong.
  const introspection =
    status.driver === 'database' && health.reachable
      ? await apiGet<ImsIntrospection | null>('/ims/introspect', null)
      : null;

  const columns: Column<ImsLogRow>[] = [
    { key: 'when', header: 'When', render: (row) => formatDateTime(row.createdAt) },
    {
      key: 'direction',
      header: 'Direction',
      render: (row) => (
        <Badge variant="secondary" className="font-normal">
          {humanise(row.direction)}
        </Badge>
      ),
    },
    { key: 'entity', header: 'Entity', render: (row) => humanise(row.entity) },
    {
      key: 'ref',
      header: 'Record',
      render: (row) => (row.recordRef ? <span className="font-mono text-xs">{row.recordRef}</span> : '—'),
    },
    {
      key: 'result',
      header: 'Result',
      render: (row) => <StatusBadge status={row.success ? 'SUCCESS' : 'FAILED'} />,
    },
    { key: 'message', header: 'Message', render: (row) => row.message ?? '—' },
  ];

  const mappingColumns: Column<ImsEntityIntrospection>[] = [
    { key: 'entity', header: 'Entity', render: (row) => humanise(row.entity) },
    {
      key: 'table',
      header: 'IMS table',
      render: (row) => <span className="font-mono text-xs">{row.table}</span>,
    },
    {
      key: 'status',
      header: 'Mapping',
      render: (row) => (
        <StatusBadge
          status={row.status === 'ok' ? 'ACCEPTED' : row.status === 'degraded' ? 'PENDING' : 'FAILED'}
        />
      ),
    },
    {
      key: 'missing',
      header: 'Unresolved columns',
      render: (row) =>
        row.missingColumns.length > 0 ? (
          <span className="font-mono text-xs">{row.missingColumns.join(', ')}</span>
        ) : (
          '—'
        ),
    },
  ];

  const cursorColumns: Column<ImsCursorRow>[] = [
    { key: 'entity', header: 'Entity', render: (row) => humanise(row.entity) },
    { key: 'watermark', header: 'Data current to', render: (row) => formatDateTime(row.watermark) },
    { key: 'syncedAt', header: 'Last sweep', render: (row) => formatDateTime(row.syncedAt) },
  ];

  const failures = logs.filter((row) => !row.success).length;
  const brokenMappings = introspection?.entities.filter((row) => row.status === 'broken').length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Network"
        title="IMS integration"
        description="GRID-X never duplicates IMS-owned data. Masters flow in; outsourcing facts flow back out."
        actions={
          <>
            <ActionDialog
              title="Sync masters now"
              description={`Pulls ${status.syncEntities.join(', ') || 'the configured entities'} incrementally, the same sweep the scheduler runs every 30 minutes.`}
              triggerLabel="Sync now"
              submitLabel="Sync"
              action={imsSyncAction}
              hidden={{ direction: 'sync-all' }}
              fields={[]}
              disabled={!status.configured}
            />
            <ActionDialog
              title="Pull from IMS"
              description="Imports or refreshes one master entity in full, ignoring the stored watermark."
              triggerLabel="Pull masters"
              triggerVariant="outline"
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
            <ActionDialog
              title="Retry failed deliveries"
              description="Replays every outbound fact the IMS has not accepted yet, without waiting for the scheduler."
              triggerLabel="Retry"
              triggerVariant="outline"
              submitLabel="Retry"
              action={imsSyncAction}
              hidden={{ direction: 'retry' }}
              fields={[]}
              disabled={failures === 0}
            />
          </>
        }
      />

      {status.mappingWarnings.length > 0 ? (
        <Alert variant="warning">
          <span className="font-medium">Mapping override problems.</span>{' '}
          {status.mappingWarnings.join(' ')}
        </Alert>
      ) : null}

      {brokenMappings > 0 ? (
        <Alert variant="destructive">
          <span className="font-medium">
            {brokenMappings} entit{brokenMappings === 1 ? 'y' : 'ies'} cannot be read.
          </span>{' '}
          The mapped table or a required column is missing from the IMS schema. Run{' '}
          <span className="font-mono text-xs">pnpm ims:introspect --write</span> against this
          database and set <span className="font-mono text-xs">IMS_MAPPING_FILE</span>.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Transport" value={DRIVER_LABEL[status.driver]} />
        <StatCard
          label="Connection"
          value={health.reachable ? 'Reachable' : status.configured ? 'Unreachable' : 'Not configured'}
        />
        <StatCard label="Sync events" value={formatNumber(logs.length)} />
        <StatCard label="Failures" value={formatNumber(failures)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connection</CardTitle>
            <CardDescription>
              {status.driver === 'database'
                ? 'GRID-X reads the IMS database directly over a read-only connection. Reads never write, and outbound facts go to a GRID-X-owned outbox rather than an IMS table.'
                : 'Set IMS_ENABLED and IMS_DATABASE_URL to connect straight to the IMS database, or IMS_BASE_URL to use the IMS REST API.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DetailList
              items={[
                { label: 'Driver', value: DRIVER_LABEL[status.driver] },
                ...(status.driver === 'database'
                  ? [
                      { label: 'Database', value: status.databaseUrl ?? 'Not set' },
                      { label: 'Schema', value: status.schema ?? 'public' },
                      {
                        label: 'Statement timeout',
                        value: `${formatNumber(status.statementTimeoutMs)} ms`,
                      },
                    ]
                  : [
                      { label: 'Base URL', value: status.baseUrl ?? 'Not set' },
                      { label: 'Timeout', value: `${formatNumber(status.timeoutMs)} ms` },
                    ]),
                { label: 'Server', value: health.serverVersion ?? '—' },
                {
                  label: 'Probe',
                  value: health.reachable
                    ? `Reachable in ${formatNumber(health.latencyMs ?? 0)} ms`
                    : (health.message ?? 'Unreachable'),
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Synchronisation</CardTitle>
            <CardDescription>
              Masters are pulled incrementally every 30 minutes; outbound facts are delivered as they
              happen and replayed every 10 minutes until the IMS accepts them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DetailList
              items={[
                { label: 'Outbound facts', value: WRITE_LABEL[status.writeMode] },
                { label: 'Outbox table', value: status.outboxTable ?? '—' },
                {
                  label: 'Scheduled inbound sync',
                  value: status.inboundSyncEnabled ? 'On' : 'Off (manual only)',
                },
                { label: 'Entities swept', value: status.syncEntities.join(', ') || '—' },
                { label: 'Batch size', value: formatNumber(status.batchSize) },
                {
                  label: 'Mapping profile',
                  value:
                    status.mappingOverrides.length > 0
                      ? `${status.mappingProfile} (overridden: ${status.mappingOverrides.join(', ')})`
                      : status.mappingProfile,
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {introspection ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Schema mapping</h2>
          <p className="text-sm text-muted-foreground">
            How the configured mapping lines up with the {formatNumber(introspection.tables.length)}{' '}
            table(s) GRID-X can see in schema{' '}
            <span className="font-mono text-xs">{introspection.schema}</span>. An entity marked
            failed cannot be read at all; a pending one reads, but is missing columns.
          </p>
          <DataTable
            columns={mappingColumns}
            rows={introspection.entities}
            empty={{
              title: 'No mapping resolved',
              description: 'The mapping profile declared no entities.',
            }}
          />
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consumed from IMS</CardTitle>
            <CardDescription>
              The IMS remains the system of record for all of these. Only the highlighted ones are
              copied into GRID-X; the rest are read live and never stored.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {entities.inbound.map((entity) => (
              <Badge
                key={entity}
                variant={entities.persisted.includes(entity) ? 'default' : 'secondary'}
                className="font-normal"
              >
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

      {cursors.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Incremental watermarks</h2>
          <p className="text-sm text-muted-foreground">
            How current each copied master is. A full pull clears the watermark and re-reads
            everything.
          </p>
          <DataTable columns={cursorColumns} rows={cursors} empty={{ title: 'No watermarks yet' }} />
        </section>
      ) : null}

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

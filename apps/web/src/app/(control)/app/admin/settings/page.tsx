import { updateSettingAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { formatDateTime, humanise } from '@/lib/format';
import { apiGet } from '@/lib/session';
import type { SettingRow } from '@/lib/types';

export const metadata = { title: 'Settings · GRID-X' };

function serialise(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const settings = await apiGet<SettingRow[]>('/settings', []);

  const columns: Column<SettingRow>[] = [
    {
      key: 'key',
      header: 'Setting',
      render: (row) => (
        <span className="block">
          <span className="block font-medium">{humanise(row.key)}</span>
          <span className="block font-mono text-xs text-muted-foreground">{row.key}</span>
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      render: (row) => <span className="font-mono text-xs">{serialise(row.value)}</span>,
    },
    { key: 'updated', header: 'Last updated', render: (row) => formatDateTime(row.updatedAt) },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <ActionDialog
          title={`Edit ${humanise(row.key)}`}
          description="Values are stored as JSON. Plain text is accepted and stored as a JSON string."
          triggerLabel="Edit"
          triggerVariant="outline"
          triggerSize="sm"
          action={updateSettingAction}
          hidden={{ key: row.key }}
          fields={[
            {
              name: 'value',
              label: 'Value',
              type: 'textarea',
              required: true,
              defaultValue: serialise(row.value),
              span: 2,
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System settings"
        description="Workflow thresholds, scorecard weights and notification switches. Every change is written to the audit log."
        actions={
          <ActionDialog
            title="Add or override a setting"
            triggerLabel="New setting"
            action={updateSettingAction}
            fields={[
              { name: 'key', label: 'Key', required: true, span: 2 },
              { name: 'value', label: 'Value (JSON or text)', type: 'textarea', required: true, span: 2 },
            ]}
          />
        }
      />

      <DataTable
        columns={columns}
        rows={settings}
        empty={{ title: 'No settings stored', description: 'Defaults from the code are in force.' }}
      />
    </div>
  );
}

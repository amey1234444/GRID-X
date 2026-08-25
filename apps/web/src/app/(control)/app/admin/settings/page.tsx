import { ROLE_CODES, ROLE_LABELS } from '@gridx/shared';

import { updateSettingAction } from '@/app/actions/control';
import { ActionDialog, type FieldDefinition } from '@/components/app/action-dialog';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiGet } from '@/lib/session';
import type { SettingRow } from '@/lib/types';

export const metadata = { title: 'Settings · GRID-X' };

/**
 * Section 7 — System settings.
 *
 * This screen used to list whatever rows happened to be in the settings table and let anyone add a
 * key with a JSON blob for a value. Nothing read any of it, so editing a setting changed nothing —
 * which is worse than not offering it, because it looks like governance.
 *
 * It now renders the catalogue the API serves: only settings the platform actually reads, each
 * with the rule it governs and a control of the right shape for its type.
 */

const GROUP_ORDER = ['security', 'governance', 'drawings', 'materials', 'commercial'] as const;

const GROUP_LABELS: Record<string, { title: string; description: string }> = {
  security: {
    title: 'Security',
    description: 'Who must hold a second factor, and how long a password reset link stays usable.',
  },
  governance: {
    title: 'Governance',
    description:
      'What needs senior authorisation before it leaves the factory, and what happens when a partner fails badly.',
  },
  drawings: {
    title: 'Drawings',
    description: 'How long a partner keeps access to a drawing, and whether they must acknowledge it.',
  },
  materials: {
    title: 'Materials',
    description: 'Scrap tolerance and the rounding allowance on material reconciliation.',
  },
  commercial: { title: 'Commercial', description: 'Defaults applied to new partner agreements.' },
};

function displayValue(setting: SettingRow): string {
  if (setting.type === 'boolean') return setting.value ? 'On' : 'Off';
  if (setting.type === 'roleList') {
    const roles = Array.isArray(setting.value) ? (setting.value as string[]) : [];
    if (roles.length === 0) return 'No roles';
    return roles.map((role) => ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role).join(', ');
  }
  return String(setting.value);
}

function fieldFor(setting: SettingRow): FieldDefinition {
  if (setting.type === 'boolean') {
    return {
      name: 'value',
      label: setting.label,
      type: 'checkbox',
      defaultValue: setting.value ? 'on' : '',
      help: setting.description,
      span: 2,
    };
  }
  if (setting.type === 'roleList') {
    return {
      name: 'value',
      label: 'Roles',
      type: 'multiselect',
      options: ROLE_CODES.filter((code) => !code.startsWith('PARTNER_')).map((code) => ({
        value: code,
        label: ROLE_LABELS[code] ?? code,
      })),
      defaultValue: Array.isArray(setting.value) ? (setting.value as string[]).join(',') : '',
      help: setting.description,
      span: 2,
    };
  }
  return {
    name: 'value',
    label: setting.label,
    type: 'number',
    step: 'any',
    required: true,
    defaultValue: String(setting.value),
    help: setting.description,
    span: 2,
  };
}

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const settings = await apiGet<SettingRow[]>('/settings', []);

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    ...GROUP_LABELS[group],
    settings: settings.filter((setting) => setting.group === group),
  })).filter((section) => section.settings.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Settings"
        title="System settings"
        description="The rules GRID-X applies when it enforces the blueprint. Every change is written to the audit log and takes effect within a minute."
      />

      {grouped.length === 0 ? (
        <EmptyState
          title="No settings available"
          description="The settings catalogue could not be loaded. Platform defaults are in force."
        />
      ) : null}

      {grouped.map((section) => (
        <Card key={section.group}>
          <CardHeader>
            <CardTitle className="text-base">{section.title}</CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {section.settings.map((setting) => (
              <div
                key={setting.key}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-1 sm:max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{setting.label}</span>
                    {setting.isDefault ? (
                      <Badge variant="secondary" className="font-normal">
                        Default
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-normal">
                        Changed
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{setting.description}</p>
                  <p className="font-mono text-xs text-muted-foreground">{setting.key}</p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-medium">{displayValue(setting)}</span>
                  <ActionDialog
                    title={setting.label}
                    description={setting.description}
                    triggerLabel="Change"
                    triggerVariant="outline"
                    triggerSize="sm"
                    action={updateSettingAction}
                    hidden={{ key: setting.key, type: setting.type }}
                    fields={[fieldFor(setting)]}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

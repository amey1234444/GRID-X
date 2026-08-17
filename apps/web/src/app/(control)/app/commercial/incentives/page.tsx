import { ADJUSTMENT_TYPES, DEDUCTION_TYPES, INCENTIVE_TYPES } from '@gridx/shared';

import { createDeductionAction, createIncentiveRuleAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate, formatNumber, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { partnerOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';

export const metadata = { title: 'Incentives & deductions · GRID-X' };

interface IncentiveRule {
  id: string;
  partnerId: string | null;
  type: string;
  name: string;
  percentage: number | null;
  fixedAmount: number | null;
  condition: string | null;
  isActive: boolean;
  createdAt: string;
}

export default async function IncentivesPage(): Promise<React.JSX.Element> {
  const [rules, partners] = await Promise.all([
    apiGet<IncentiveRule[]>('/commercials/incentive-rules', []),
    partnerOptions(),
  ]);

  const incentives = rules.filter((rule) => INCENTIVE_TYPES.includes(rule.type as never));
  const deductions = rules.filter((rule) => DEDUCTION_TYPES.includes(rule.type as never));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incentives & deductions"
        description="Standing rules applied when partner invoices are built, plus one-off adjustments raised against a partner."
        actions={
          <>
            <ActionDialog
              title="Add rule"
              description="A rule with no partner applies to every partner."
              triggerLabel="Add rule"
              action={createIncentiveRuleAction}
              fields={[
                { name: 'name', label: 'Rule name', required: true, span: 2 },
                {
                  name: 'type',
                  label: 'Type',
                  type: 'select',
                  required: true,
                  options: optionsFrom(ADJUSTMENT_TYPES),
                  span: 2,
                },
                {
                  name: 'partnerId',
                  label: 'Partner (optional)',
                  type: 'select',
                  options: partners,
                  help: 'Leave blank to apply the rule network-wide.',
                  span: 2,
                },
                { name: 'percentage', label: 'Percentage', type: 'number', step: '0.01' },
                { name: 'fixedAmount', label: 'Fixed amount', type: 'number', step: '0.01' },
                {
                  name: 'condition',
                  label: 'Condition',
                  type: 'textarea',
                  help: 'When the rule applies — for example, on-time delivery above 95%.',
                  span: 2,
                },
              ]}
            />
            <ActionDialog
              title="Raise adjustment"
              description="A one-off incentive or deduction settled against the partner's next invoice."
              triggerLabel="Raise adjustment"
              triggerVariant="outline"
              action={createDeductionAction}
              fields={[
                { name: 'partnerId', label: 'Partner', type: 'select', required: true, options: partners, span: 2 },
                {
                  name: 'type',
                  label: 'Type',
                  type: 'select',
                  required: true,
                  options: optionsFrom(ADJUSTMENT_TYPES),
                  span: 2,
                },
                { name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true },
                { name: 'reason', label: 'Reason', type: 'textarea', required: true, span: 2 },
              ]}
            />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active rules" value={formatNumber(rules.length)} />
        <StatCard label="Incentive rules" value={formatNumber(incentives.length)} tone="success" />
        <StatCard label="Deduction rules" value={formatNumber(deductions.length)} tone="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Standing rules</CardTitle>
          <CardDescription>
            Applied automatically when an invoice is assembled. Percentages are taken on the basic
            amount; fixed amounts are added or deducted as-is.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'name', header: 'Rule', render: (row: IncentiveRule) => row.name },
              {
                key: 'type',
                header: 'Type',
                render: (row: IncentiveRule) => (
                  <Badge variant={INCENTIVE_TYPES.includes(row.type as never) ? 'outline' : 'destructive'}>
                    {humanise(row.type)}
                  </Badge>
                ),
              },
              {
                key: 'scope',
                header: 'Scope',
                render: (row: IncentiveRule) =>
                  row.partnerId
                    ? (partners.find((partner) => partner.value === row.partnerId)?.label ?? 'One partner')
                    : 'All partners',
              },
              {
                key: 'value',
                header: 'Value',
                align: 'right',
                render: (row: IncentiveRule) =>
                  row.percentage !== null
                    ? `${formatNumber(row.percentage, 2)}%`
                    : row.fixedAmount !== null
                      ? formatCurrency(row.fixedAmount)
                      : '—',
              },
              {
                key: 'condition',
                header: 'Condition',
                render: (row: IncentiveRule) => row.condition ?? '—',
              },
              {
                key: 'created',
                header: 'Created',
                render: (row: IncentiveRule) => formatDate(row.createdAt),
              },
            ]}
            rows={rules}
            empty={{
              title: 'No incentive or deduction rules',
              description: 'Add a rule so quality and delivery performance feed straight into payment.',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

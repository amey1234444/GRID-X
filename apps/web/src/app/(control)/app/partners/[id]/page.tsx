import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  MACHINE_CONDITIONS,
  OWNERSHIP_STATUSES,
  PARTNER_APPROVAL_STATUSES,
  PROCESS_TYPES,
} from '@gridx/shared';

import {
  addPartnerCapabilityAction,
  addPartnerEmployeeAction,
  addPartnerMachineAction,
  changePartnerStatusAction,
  recordPartnerAuditAction,
  suspendPartnerAction,
} from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable } from '@/components/app/data-table';
import { DetailList } from '@/components/app/detail-list';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatNumber, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { apiFetch } from '@/lib/session';
import type { PartnerDetail } from '@/lib/types';

export default async function PartnerDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<React.JSX.Element> {
  const result = await apiFetch<PartnerDetail>(`/partners/${params.id}`);
  const partner = result.data;
  if (!partner) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={partner.businessName}
        description={`${partner.partnerCode} · ${partner.city}, ${partner.state} · ${partner.company.name}`}
        actions={
          <>
            <ActionDialog
              title="Change approval status"
              description="Approval follows the blueprint workflow: draft → submitted → under review → audit → trial → approved → certified → strategic."
              triggerLabel="Change status"
              triggerVariant="outline"
              action={changePartnerStatusAction}
              hidden={{ partnerId: partner.id }}
              fields={[
                {
                  name: 'toStatus',
                  label: 'New status',
                  type: 'select',
                  required: true,
                  options: optionsFrom(PARTNER_APPROVAL_STATUSES),
                  span: 2,
                },
                { name: 'reason', label: 'Reason / remarks', type: 'textarea', span: 2 },
              ]}
            />
            <ActionDialog
              title="Record capability audit"
              triggerLabel="Record audit"
              triggerVariant="outline"
              action={recordPartnerAuditAction}
              hidden={{ partnerId: partner.id }}
              fields={[
                { name: 'auditDate', label: 'Audit date', type: 'date', required: true },
                { name: 'auditType', label: 'Audit type', defaultValue: 'CAPABILITY' },
                { name: 'score', label: 'Score (0-100)', type: 'number' },
                {
                  name: 'status',
                  label: 'Outcome',
                  type: 'select',
                  options: optionsFrom(['SCHEDULED', 'IN_PROGRESS', 'PASSED', 'FAILED']),
                  defaultValue: 'IN_PROGRESS',
                },
                { name: 'findings', label: 'Findings', type: 'textarea', span: 2 },
                { name: 'nextAuditDate', label: 'Next audit due', type: 'date' },
              ]}
            />
            <ActionDialog
              title="Suspend partner"
              description="Suspension blocks new allocations immediately. Existing jobs stay visible."
              triggerLabel="Suspend"
              triggerVariant="destructive"
              action={suspendPartnerAction}
              hidden={{ partnerId: partner.id }}
              fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true, span: 2 }]}
            />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Approval" value={humanise(partner.approvalStatus)} />
        <StatCard
          label="Score"
          value={partner.currentScore === null ? '—' : formatNumber(partner.currentScore, 1)}
          hint={`Category ${partner.category}`}
        />
        <StatCard label="Open jobs" value={formatNumber(partner.openJobs)} hint={`limit ${partner.maxOpenJobs}`} />
        <StatCard
          label="Allocation"
          value={partner.canAllocate ? 'Allowed' : 'Blocked'}
          tone={partner.canAllocate ? 'success' : 'destructive'}
        />
      </div>

      {partner.suspendedReason ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            Suspended: {partner.suspendedReason}
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
          <TabsTrigger value="machines">Machines &amp; people</TabsTrigger>
          <TabsTrigger value="quality">Audits &amp; components</TabsTrigger>
          <TabsTrigger value="commercial">Commercial</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business profile</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList
                columns={3}
                items={[
                  { label: 'Owner', value: partner.ownerName },
                  { label: 'Phone', value: partner.phone },
                  { label: 'Alternate phone', value: partner.altPhone ?? '—' },
                  { label: 'Email', value: partner.email ?? '—' },
                  {
                    label: 'Address',
                    value: `${partner.addressLine1}${partner.addressLine2 ? `, ${partner.addressLine2}` : ''}, ${partner.city}, ${partner.state} ${partner.pincode}`,
                  },
                  { label: 'Distance', value: partner.distanceKm ? `${formatNumber(partner.distanceKm)} km` : '—' },
                  { label: 'Level', value: humanise(partner.level) },
                  { label: 'GST', value: partner.gstNumber ?? '—' },
                  { label: 'Udyam', value: partner.udyamNumber ?? '—' },
                  { label: 'PAN', value: partner.panNumber ?? '—' },
                  { label: 'Payment terms', value: `${partner.paymentTermsDays} days` },
                  { label: 'Monthly capacity', value: `${formatNumber(partner.maxCapacityHours)} hours` },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Banking &amp; documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <DetailList
                columns={3}
                items={[
                  { label: 'Bank', value: partner.bankName ?? '—' },
                  { label: 'Account name', value: partner.bankAccountName ?? '—' },
                  { label: 'Account number', value: partner.bankAccountNo ?? '—' },
                  { label: 'IFSC', value: partner.bankIfsc ?? '—' },
                ]}
              />
              <DataTable
                columns={[
                  { key: 'type', header: 'Document', render: (row: PartnerDetail['documents'][number]) => humanise(row.type) },
                  { key: 'number', header: 'Number', render: (row: PartnerDetail['documents'][number]) => row.documentNo ?? '—' },
                  { key: 'expiry', header: 'Expiry', render: (row: PartnerDetail['documents'][number]) => formatDate(row.expiryDate) },
                  {
                    key: 'verified',
                    header: 'Verified',
                    render: (row: PartnerDetail['documents'][number]) => (
                      <StatusBadge status={row.verified ? 'VERIFIED' : 'PENDING'} />
                    ),
                  },
                ]}
                rows={partner.documents}
                empty={{ title: 'No documents uploaded', description: 'GST, Udyam, PAN and bank proofs appear here.' }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capabilities" className="space-y-4">
          <div className="flex justify-end">
            <ActionDialog
              title="Add capability"
              triggerLabel="Add capability"
              triggerSize="sm"
              action={addPartnerCapabilityAction}
              hidden={{ partnerId: partner.id }}
              fields={[
                { name: 'process', label: 'Process', type: 'select', required: true, options: optionsFrom(PROCESS_TYPES) },
                { name: 'monthlyCapacityHours', label: 'Monthly hours', type: 'number', defaultValue: '0' },
                { name: 'maxSizeMm', label: 'Max size (mm)', type: 'number' },
                { name: 'maxWeightKg', label: 'Max weight (kg)', type: 'number' },
                { name: 'toleranceMm', label: 'Best tolerance (mm)', type: 'number', step: '0.01' },
                { name: 'isApproved', label: 'Approved for allocation', type: 'checkbox' },
                { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
              ]}
            />
          </div>
          <DataTable
            columns={[
              { key: 'process', header: 'Process', render: (row: PartnerDetail['capabilities'][number]) => humanise(row.process) },
              {
                key: 'approved',
                header: 'Approved',
                render: (row: PartnerDetail['capabilities'][number]) => (
                  <StatusBadge status={row.isApproved ? 'APPROVED' : 'PENDING'} />
                ),
              },
              {
                key: 'hours',
                header: 'Monthly hours',
                align: 'right',
                render: (row: PartnerDetail['capabilities'][number]) => formatNumber(row.monthlyCapacityHours),
              },
              {
                key: 'size',
                header: 'Max size / weight',
                render: (row: PartnerDetail['capabilities'][number]) =>
                  `${row.maxSizeMm ? `${formatNumber(row.maxSizeMm)} mm` : '—'} / ${row.maxWeightKg ? `${formatNumber(row.maxWeightKg)} kg` : '—'}`,
              },
              {
                key: 'tolerance',
                header: 'Tolerance',
                render: (row: PartnerDetail['capabilities'][number]) =>
                  row.toleranceMm ? `±${row.toleranceMm} mm` : '—',
              },
            ]}
            rows={partner.capabilities}
            empty={{ title: 'No capabilities recorded', description: 'Capabilities gate which jobs can be allocated.' }}
          />
        </TabsContent>

        <TabsContent value="machines" className="space-y-4">
          <div className="flex flex-wrap justify-end gap-2">
            <ActionDialog
              title="Add machine"
              triggerLabel="Add machine"
              triggerSize="sm"
              action={addPartnerMachineAction}
              hidden={{ partnerId: partner.id }}
              fields={[
                { name: 'machineType', label: 'Machine type', required: true },
                { name: 'make', label: 'Make' },
                { name: 'model', label: 'Model' },
                { name: 'size', label: 'Size' },
                { name: 'capacity', label: 'Capacity' },
                { name: 'accuracy', label: 'Accuracy' },
                { name: 'condition', label: 'Condition', type: 'select', options: optionsFrom(MACHINE_CONDITIONS), defaultValue: 'GOOD' },
                { name: 'ownership', label: 'Ownership', type: 'select', options: optionsFrom(OWNERSHIP_STATUSES), defaultValue: 'OWNED' },
                { name: 'quantity', label: 'Quantity', type: 'number', defaultValue: '1' },
              ]}
            />
            <ActionDialog
              title="Add team member"
              triggerLabel="Add person"
              triggerSize="sm"
              triggerVariant="outline"
              action={addPartnerEmployeeAction}
              hidden={{ partnerId: partner.id }}
              fields={[
                { name: 'name', label: 'Name', required: true },
                { name: 'skill', label: 'Skill' },
                { name: 'phone', label: 'Phone' },
                { name: 'isSupervisor', label: 'Supervisor', type: 'checkbox' },
              ]}
            />
          </div>
          <DataTable
            columns={[
              { key: 'type', header: 'Machine', render: (row: PartnerDetail['machines'][number]) => row.machineType },
              {
                key: 'make',
                header: 'Make / model',
                render: (row: PartnerDetail['machines'][number]) => `${row.make ?? '—'} ${row.model ?? ''}`.trim(),
              },
              { key: 'capacity', header: 'Capacity', render: (row: PartnerDetail['machines'][number]) => row.capacity ?? '—' },
              { key: 'condition', header: 'Condition', render: (row: PartnerDetail['machines'][number]) => <StatusBadge status={row.condition} /> },
              { key: 'ownership', header: 'Ownership', render: (row: PartnerDetail['machines'][number]) => humanise(row.ownership) },
              { key: 'qty', header: 'Qty', align: 'right', render: (row: PartnerDetail['machines'][number]) => formatNumber(row.quantity) },
            ]}
            rows={partner.machines}
            empty={{ title: 'No machines recorded' }}
          />
          <DataTable
            columns={[
              { key: 'name', header: 'Name', render: (row: PartnerDetail['employees'][number]) => row.name },
              { key: 'skill', header: 'Skill', render: (row: PartnerDetail['employees'][number]) => row.skill ?? '—' },
              { key: 'phone', header: 'Phone', render: (row: PartnerDetail['employees'][number]) => row.phone ?? '—' },
              {
                key: 'supervisor',
                header: 'Role',
                render: (row: PartnerDetail['employees'][number]) =>
                  row.isSupervisor ? <Badge variant="outline">Supervisor</Badge> : 'Operator',
              },
            ]}
            rows={partner.employees}
            empty={{ title: 'No team members recorded' }}
          />
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <DataTable
            columns={[
              { key: 'date', header: 'Audit date', render: (row: PartnerDetail['audits'][number]) => formatDate(row.auditDate) },
              { key: 'type', header: 'Type', render: (row: PartnerDetail['audits'][number]) => humanise(row.auditType) },
              {
                key: 'score',
                header: 'Score',
                align: 'right',
                render: (row: PartnerDetail['audits'][number]) => (row.score === null ? '—' : formatNumber(row.score, 1)),
              },
              { key: 'status', header: 'Result', render: (row: PartnerDetail['audits'][number]) => <StatusBadge status={row.status} /> },
              { key: 'next', header: 'Next audit', render: (row: PartnerDetail['audits'][number]) => formatDate(row.nextAuditDate) },
              { key: 'findings', header: 'Findings', render: (row: PartnerDetail['audits'][number]) => row.findings ?? '—' },
            ]}
            rows={partner.audits}
            empty={{ title: 'No audits recorded', description: 'A capability audit is required before approval.' }}
          />
          <Card>
            <CardHeader>
              <CardTitle>Approved components</CardTitle>
            </CardHeader>
            <CardContent>
              {partner.approvedComponents.length === 0 ? (
                <EmptyState
                  title="No approved components"
                  description="A partner can only be allocated components they are approved for."
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {partner.approvedComponents.map((entry) => (
                    <Link
                      key={entry.id}
                      href={`/app/engineering/components/${entry.component.id}`}
                      className="rounded-full border px-3 py-1 text-xs hover:bg-secondary"
                    >
                      {entry.component.componentCode} · {entry.component.name}
                      {entry.firstArticleDone ? ' · FA done' : ''}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commercial" className="space-y-4">
          <DataTable
            columns={[
              {
                key: 'component',
                header: 'Component',
                render: (row: PartnerDetail['rates'][number]) => `${row.component.componentCode} · ${row.component.name}`,
              },
              {
                key: 'rate',
                header: 'Conversion rate',
                align: 'right',
                render: (row: PartnerDetail['rates'][number]) => formatNumber(row.conversionRate, 2),
              },
            ]}
            rows={partner.rates}
            empty={{ title: 'No active rates', description: 'Approved rates are required before invoicing.' }}
          />
          <DataTable
            columns={[
              { key: 'name', header: 'Portal user', render: (row: PartnerDetail['users'][number]) => row.name },
              { key: 'phone', header: 'Phone', render: (row: PartnerDetail['users'][number]) => row.phone ?? '—' },
              { key: 'email', header: 'Email', render: (row: PartnerDetail['users'][number]) => row.email ?? '—' },
              { key: 'status', header: 'Status', render: (row: PartnerDetail['users'][number]) => <StatusBadge status={row.status} /> },
            ]}
            rows={partner.users}
            empty={{ title: 'No portal users', description: 'Create a partner user so they can log into GRID-X Partner.' }}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <DataTable
            columns={[
              { key: 'when', header: 'When', render: (row: PartnerDetail['statusHistory'][number]) => formatDate(row.createdAt) },
              {
                key: 'change',
                header: 'Change',
                render: (row: PartnerDetail['statusHistory'][number]) =>
                  `${humanise(row.fromStatus)} → ${humanise(row.toStatus)}`,
              },
              { key: 'by', header: 'By', render: (row: PartnerDetail['statusHistory'][number]) => row.changedBy?.name ?? 'System' },
              { key: 'reason', header: 'Reason', render: (row: PartnerDetail['statusHistory'][number]) => row.reason ?? '—' },
            ]}
            rows={partner.statusHistory}
            empty={{ title: 'No status changes yet' }}
          />
          <DataTable
            columns={[
              {
                key: 'period',
                header: 'Period',
                render: (row: PartnerDetail['scores'][number]) => `${row.periodMonth}/${row.periodYear}`,
              },
              {
                key: 'score',
                header: 'Score',
                align: 'right',
                render: (row: PartnerDetail['scores'][number]) => formatNumber(row.totalScore, 1),
              },
              { key: 'category', header: 'Category', render: (row: PartnerDetail['scores'][number]) => row.category },
            ]}
            rows={partner.scores}
            empty={{ title: 'No scorecards computed yet' }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

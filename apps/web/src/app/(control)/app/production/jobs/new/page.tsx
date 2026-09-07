import Link from 'next/link';
import { JOB_PRIORITIES, JOB_SOURCES, MATERIAL_RESPONSIBILITIES, PERMISSIONS } from '@gridx/shared';

import { createJobAction } from '@/app/actions/control';
import { ActionForm } from '@/components/app/action-form';
import { PageHeader } from '@/components/app/page-header';
import { Button } from '@/components/ui/button';
import { optionsFrom } from '@/lib/options';
import { companyOptions, componentOptions, partnerOptions } from '@/lib/reference';
import { currentUser } from '@/lib/session';

export const metadata = { title: 'New job · GRID-X' };

export default async function NewJobPage(): Promise<React.JSX.Element> {
  const [components, partners, companies, user] = await Promise.all([
    componentOptions(),
    partnerOptions(),
    companyOptions(),
    currentUser(),
  ]);

  // Module 2: Class A components stay in-house unless senior management authorises otherwise.
  const mayAuthoriseClassA = user?.permissions.includes(PERMISSIONS.JOB_CLASS_A_OVERRIDE) ?? false;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        icon="Cog"
        title="Create job"
        description="Jobs start in draft. Allocation checks partner approval, capability, capacity and Class A authorisation."
      />

      <ActionForm
        action={createJobAction}
        submitLabel="Create job"
        hidden={{ openAfterCreate: 'true' }}
        cancel={
          <Button asChild variant="ghost">
            <Link href="/app/production/jobs">Cancel</Link>
          </Button>
        }
        sections={[
          {
            title: 'What is being made',
            fields: [
              {
                name: 'companyId',
                label: 'Company',
                type: 'select',
                required: true,
                options: companies,
                defaultValue: companies[0]?.value,
              },
              {
                name: 'componentId',
                label: 'Component',
                type: 'select',
                required: true,
                options: components,
              },
              { name: 'quantity', label: 'Quantity', type: 'number', required: true },
              {
                name: 'rate',
                label: 'Conversion rate',
                type: 'number',
                step: '0.01',
                required: true,
              },
              {
                name: 'materialResponsibility',
                label: 'Material responsibility',
                type: 'select',
                options: optionsFrom(MATERIAL_RESPONSIBILITIES),
                defaultValue: 'OSWAR_SUPPLIED',
              },
              {
                name: 'priority',
                label: 'Priority',
                type: 'select',
                options: optionsFrom(JOB_PRIORITIES),
                defaultValue: 'NORMAL',
              },
            ],
          },
          {
            title: 'Schedule and allocation',
            description:
              'Leaving the partner blank keeps the job unallocated so it can be matched from the planning board.',
            fields: [
              { name: 'dueDate', label: 'Due date', type: 'date', required: true },
              { name: 'plannedStartDate', label: 'Planned start', type: 'date' },
              {
                name: 'partnerId',
                label: 'Partner (optional)',
                type: 'select',
                options: partners,
                span: 2,
              },
              { name: 'deliveryLocation', label: 'Delivery location', span: 2 },
            ],
          },
          {
            title: 'Traceability',
            fields: [
              {
                name: 'source',
                label: 'Source',
                type: 'select',
                options: optionsFrom(JOB_SOURCES),
                defaultValue: 'MANUAL',
              },
              {
                name: 'sourceRef',
                label: 'Source reference',
                help: 'IMS work order or sales order number',
              },
              { name: 'customerProject', label: 'Customer / project', span: 2 },
              { name: 'notes', label: 'Notes', type: 'textarea', span: 2 },
            ],
          },
          ...(mayAuthoriseClassA
            ? [
                {
                  title: 'Class A authorisation',
                  description:
                    'Only needed for Class A components, which are otherwise retained in-house. The reason is stored against the job and shown in the audit log.',
                  fields: [
                    {
                      name: 'classAOverrideReason',
                      label: 'Authorisation reason',
                      type: 'textarea' as const,
                      span: 2 as const,
                    },
                  ],
                },
              ]
            : []),
        ]}
      />

      {mayAuthoriseClassA ? null : (
        <p className="text-sm text-muted-foreground">
          Class A components can only be outsourced by the GRID-X Head or a Group Admin. Ask them to
          raise the job if the component you need is Class A.
        </p>
      )}
    </div>
  );
}

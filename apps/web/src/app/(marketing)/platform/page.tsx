import type { Metadata } from 'next';
import { CheckCircle2 } from 'lucide-react';

import { SectionHeading } from '@/components/marketing/section';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Platform' };

const modules = [
  {
    id: 'allocation',
    title: 'Demand, jobs and allocation',
    points: [
      'Jobs created manually or pulled from IMS work orders and sales orders.',
      'Partner recommendation scores capability, free capacity, quality history, distance and rate.',
      'Class A components require explicit outsourcing authorisation before allocation.',
      'Partner acceptance, decline reasons and re-allocation are all recorded.',
    ],
  },
  {
    id: 'drawings',
    title: 'Drawing and revision control',
    points: [
      'Draft, under review, approved, released and superseded revision lifecycle.',
      'Only released revisions can be attached to a job or opened by a partner.',
      'Time-bound, job-scoped access grants with watermarked view-only mode.',
      'Every view, download and acknowledgement stored in the drawing access log.',
    ],
  },
  {
    id: 'material',
    title: 'Material issue and reconciliation',
    points: [
      'Challan-based issue with heat and batch numbers, weight and expected return date.',
      'Partner acknowledges received weight and records shortage or damage.',
      'Consumption, scrap return and unused return tracked per job and item.',
      'Reconciliation compares issued against consumed before an invoice can be approved.',
    ],
  },
  {
    id: 'quality',
    title: 'Quality, rejection and rework',
    points: [
      'Inspection plans with measured characteristics, tolerances and instruments.',
      'First article, in-process, final and pre-dispatch inspection types.',
      'Rejections raise non-conformances, rework orders and corrective actions.',
      'Deviation approvals are explicit and permanently auditable.',
    ],
  },
  {
    id: 'payments',
    title: 'Commercials and payments',
    points: [
      'Rate master per partner and component with revision history and approvals.',
      'Invoices built from accepted quantity only, with deductions and incentives.',
      'Quantity, quality and material verification gates before finance approval.',
      'Payment scheduling with invoice and payment ageing reports.',
    ],
  },
  {
    id: 'insight',
    title: 'Dashboards, scorecards and reports',
    points: [
      'Management, operations, quality, finance and partner dashboards.',
      'Seven-KPI partner scorecards driving category and level changes.',
      'Seventeen standard reports including avoided capex and partner concentration.',
      'CSV export on every report for finance and audit use.',
    ],
  },
];

export default function PlatformPage(): React.JSX.Element {
  return (
    <div className="container space-y-16 py-20">
      <SectionHeading
        label="Platform"
        title="Every module in the blueprint, implemented end to end"
        description="GRID-X is not a dashboard on top of spreadsheets. Each module enforces its own workflow rules and writes to a shared audit trail."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {modules.map((module) => (
          <Card key={module.id} id={module.id} className="scroll-mt-24">
            <CardContent className="space-y-4 p-6">
              <h3 className="text-lg font-semibold">{module.title}</h3>
              <ul className="space-y-2.5">
                {module.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {point}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

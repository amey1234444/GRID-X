'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileCheck2,
  LockKeyhole,
  Minus,
  Signal,
  WifiOff,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DrawingReceipt, EvidenceReceipt, TextLink } from './editorial';

const workflows = [
  {
    id: 'issue',
    label: 'Issue the job',
    title: 'The right job. The right partner.',
    description:
      'Compare eligibility before release. Keep capability and drawing authority on the same record.',
    columns: ['Partner', 'Allocation score', 'Eligibility'],
    rows: [
      ['Precision Auto', '94 / 100', 'Ready'],
      ['Shakti Works', '81 / 100', 'Ready'],
      ['Metro Fabricators', '—', 'Class blocked'],
    ],
    checks: ['Capability checked', 'Capacity considered', 'Released drawing attached'],
    rule: 'A missing authorisation holds the allocation.',
  },
  {
    id: 'material',
    label: 'Trace material',
    title: 'Every kilogram has a place.',
    description: 'Follow issued material through consumption, returns and variance on the job.',
    columns: ['Material movement', 'Quantity', 'Record'],
    rows: [
      ['Issued to partner', '1,240 kg', 'CH-8842'],
      ['Consumed + scrap', '1,226 kg', 'Recorded'],
      ['Remaining variance', '14 kg', 'Needs resolution'],
    ],
    checks: ['Receipt acknowledged', 'Consumption recorded', 'Shortage explained'],
    rule: 'An unresolved variance remains visible before invoice approval.',
  },
  {
    id: 'quality',
    label: 'Verify quality',
    title: 'Acceptance starts with a measurement.',
    description: 'Record actual results against the inspection plan and keep rework traceable.',
    columns: ['Characteristic', 'Actual result', 'Decision'],
    rows: [
      ['Ø 24.00 ± 0.05 mm', '24.02 mm', 'Pass'],
      ['Surface finish', 'Within spec', 'Pass'],
      ['Concentricity', 'Outside tolerance', 'Rework'],
    ],
    checks: ['Inspection plan attached', 'Actual values recorded', 'Rework linked to the lot'],
    rule: 'A rejected result stays on the record until its disposition is resolved.',
  },
  {
    id: 'payment',
    label: 'Approve payment',
    title: 'Finance can see what it is approving.',
    description:
      'Accepted quantity, agreed rate and reconciled material come together before approval.',
    columns: ['Approval check', 'Evidence', 'Status'],
    rows: [
      ['Accepted quantity', '480 pcs', 'Verified'],
      ['Material reconciliation', 'Closed', 'Verified'],
      ['Finance approval', 'INV-1187', 'Pending'],
    ],
    checks: ['Quantity verified', 'Applicable rate checked', 'Deductions documented'],
    rule: 'The next decision belongs to finance. Its status is shared with the partner.',
  },
];

export function WorkflowExplorer(): React.JSX.Element {
  return (
    <div>
      <Tabs defaultValue="issue" className="m-window">
        <div className="m-window-title">
          <span>
            <ClipboardCheck size={16} aria-hidden="true" /> GRID-X / Job workspace
          </span>
          <span className="m-caption">Illustrative workflow</span>
        </div>
        <TabsList className="m-workflow-tabs" aria-label="Explore the job lifecycle">
          {workflows.map((stage, i) => (
            <TabsTrigger className="m-workflow-tab" value={stage.id} key={stage.id}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              {stage.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {workflows.map((stage) => (
          <TabsContent key={stage.id} value={stage.id} className="m-workflow-content">
            <div className="m-workflow-grid">
              <div className="m-workflow-copy">
                <div className="m-workflow-lead">
                  <h3>{stage.title}</h3>
                  <p>{stage.description}</p>
                </div>
                <div className="m-table-scroll">
                  <table className="m-table">
                    <caption className="sr-only">{stage.label}: illustrative job records</caption>
                    <thead>
                      <tr>
                        {stage.columns.map((c) => (
                          <th scope="col" key={c}>
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stage.rows.map((row) => (
                        <tr key={row[0]}>
                          {row.map((cell, i) => (
                            <td key={i} data-numeric={i === 1 || undefined}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <details className="m-disclosure m-workflow-aside">
                <summary>
                  Checks behind this decision <ChevronDown size={16} aria-hidden="true" />
                </summary>
                <ul className="m-check-list">
                  {stage.checks.map((check) => (
                    <li key={check}>
                      <Check size={15} aria-hidden="true" />
                      {check}
                    </li>
                  ))}
                </ul>
                <p>{stage.rule}</p>
              </details>
            </div>
          </TabsContent>
        ))}
      </Tabs>
      <div className="m-demo-label">
        <span>One job. A shared evidence trail.</span>
        <span>Example data for product illustration.</span>
      </div>
    </div>
  );
}

export function PartnerWorkspace(): React.JSX.Element {
  return (
    <div className="m-window m-partner-window">
      <div className="m-window-title">
        <span>Partner workspace</span>
        <span className="m-caption">Illustrative preview</span>
      </div>
      <div className="m-partner-header">
        <div>
          <h3>Today’s work</h3>
          <p className="m-caption">The information you need on the floor.</p>
        </div>
        <Signal size={17} aria-hidden="true" />
      </div>
      <Tabs defaultValue="jobs">
        <TabsList className="m-partner-tabs" aria-label="Preview partner workspace">
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="material">Material</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="jobs" className="m-partner-panel">
          <div className="m-partner-job">
            <span className="m-caption">JOB-2291</span>
            <strong>Precision shaft · Rev C</strong>
            <div>
              <span>480 pcs</span>
              <span>In production</span>
            </div>
          </div>
          <div className="m-partner-job">
            <span className="m-caption">Next action</span>
            <strong>Acknowledge the released drawing</strong>
            <div>
              <span>DRG-4471</span>
              <FileCheck2 size={15} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="material" className="m-partner-panel">
          <div className="m-partner-job">
            <span className="m-caption">CH-8842 / Received quantity</span>
            <strong>Record what actually arrived.</strong>
            <div>
              <span>Issued</span>
              <span>1,240 kg</span>
            </div>
            <div>
              <span>Acknowledged</span>
              <span>1,232 kg</span>
            </div>
            <div>
              <span>Receipt variance</span>
              <span>8 kg · recorded</span>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="payments" className="m-partner-panel">
          <div className="m-partner-job">
            <span className="m-caption">INV-1187</span>
            <strong>480 accepted pieces</strong>
            <div>
              <span>Shortage deduction</span>
              <span>₹1,120</span>
            </div>
            <div>
              <span>Status</span>
              <span>Scheduled</span>
            </div>
            <div>
              <span>Payment date</span>
              <span>12 Sep</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      <div className="m-sync-strip">
        <WifiOff size={14} aria-hidden="true" />
        Milestones can queue when the connection drops.
      </div>
    </div>
  );
}

export function PartnerRecordExplorer(): React.JSX.Element {
  return (
    <Tabs defaultValue="drawings">
      <TabsList className="m-role-tabs" aria-label="Explore the partner record">
        <TabsTrigger value="drawings">Released drawings</TabsTrigger>
        <TabsTrigger value="material">Material receipts</TabsTrigger>
        <TabsTrigger value="payments">Payment clarity</TabsTrigger>
      </TabsList>
      <TabsContent value="drawings">
        <div className="m-split-story">
          <div>
            <p className="m-eyebrow">Clear instructions</p>
            <h2>The right revision. Within reach.</h2>
            <p>
              Open the drawing released for your job. Superseded revisions lock, and every view and
              acknowledgement stays on the record.
            </p>
            <TextLink href="/resources/drawing-control">Explore drawing control</TextLink>
          </div>
          <DrawingReceipt />
        </div>
      </TabsContent>
      <TabsContent value="material">
        <div className="m-split-story">
          <div>
            <p className="m-eyebrow">A shared material trail</p>
            <h2>Record what actually arrived.</h2>
            <p>
              Acknowledge the received weight and any shortage at receipt. Consumption, scrap and
              returns stay connected to the same job.
            </p>
            <TextLink href="/resources/material-reconciliation">Understand reconciliation</TextLink>
          </div>
          <figure className="m-module-record">
            <figcaption className="m-caption">ILLUSTRATIVE RECEIPT / CH-8842</figcaption>
            <h4>Acknowledged at the partner unit</h4>
            {[
              ['Issued weight', '1,240 kg'],
              ['Received weight', '1,232 kg'],
              ['Receipt difference', '8 kg'],
              ['Variance status', 'Recorded at receipt'],
            ].map(([label, value]) => (
              <div className="m-data-row" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
            <blockquote>The issued and received quantities remain visible together.</blockquote>
          </figure>
        </div>
      </TabsContent>
      <TabsContent value="payments">
        <div className="m-split-story">
          <div>
            <p className="m-eyebrow">Visible payment progress</p>
            <h2>Know what is ready. See what comes next.</h2>
            <p>
              Follow accepted quantity, deductions and invoice status. See a scheduled payment date
              when finance sets one.
            </p>
            <TextLink href="/partner/login">Open your payment records</TextLink>
          </div>
          <EvidenceReceipt />
        </div>
      </TabsContent>
    </Tabs>
  );
}

const onboarding = [
  {
    id: 'registration',
    title: 'Registration',
    short: 'Your business, on record',
    detail: 'Create one business record that can be reused across jobs, invoices and reviews.',
    checks: ['Business and contact details', 'Udyam and GST details', 'Bank details for payment'],
    output: 'A registered partner profile',
  },
  {
    id: 'capability',
    title: 'Capability declaration',
    short: 'Show what your unit can make',
    detail:
      'Describe the processes and limits your operation can support, so allocation starts with the right fit.',
    checks: [
      'Processes, sizes and tolerances',
      'Machines and available capacity',
      'Manpower and relevant experience',
    ],
    output: 'A capability profile ready for review',
  },
  {
    id: 'audit',
    title: 'On-site audit',
    short: 'Verify the declared capability',
    detail:
      'The review connects your declaration to the equipment, working practices and quality systems on the floor.',
    checks: [
      'Capability and machine assessment',
      'Quality system review',
      'Safety and housekeeping assessment',
    ],
    output: 'A documented assessment and follow-up actions',
  },
  {
    id: 'trial',
    title: 'Trial order',
    short: 'Prove the flow on a first job',
    detail:
      'Complete a first job with a released drawing and first-article approval before increasing the scope.',
    checks: [
      'Trial job issued',
      'First article inspected',
      'Quality and delivery results recorded',
    ],
    output: 'Evidence to support the approval decision',
  },
  {
    id: 'approval',
    title: 'Approval',
    short: 'Know your standing in the network',
    detail:
      'Your approval category reflects the evidence from the trial and review. It can change as performance improves.',
    checks: [
      'Trial approved or approved',
      'Certified or strategic, where applicable',
      'Ongoing performance review',
    ],
    output: 'An approval category tied to the partner record',
  },
];

export function OnboardingJourney(): React.JSX.Element {
  return (
    <Tabs defaultValue="registration" orientation="vertical" className="m-onboarding">
      <TabsList className="m-onboarding-tabs" aria-label="Explore the five onboarding steps">
        {onboarding.map((step, i) => (
          <TabsTrigger key={step.id} value={step.id} className="m-onboarding-step">
            <span>{String(i + 1).padStart(2, '0')}</span>
            <span>{step.title}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </TabsTrigger>
        ))}
      </TabsList>
      <div>
        {onboarding.map((step, i) => (
          <TabsContent value={step.id} key={step.id} className="m-onboarding-panel">
            <p className="m-caption">STEP {i + 1} / 5</p>
            <h3>{step.short}</h3>
            <p>{step.detail}</p>
            <ul className="m-check-list">
              {step.checks.map((check) => (
                <li key={check}>
                  <Check size={16} aria-hidden="true" />
                  {check}
                </li>
              ))}
            </ul>
            <div className="m-onboarding-result">
              What this step creates<strong>{step.output}</strong>
            </div>
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}

const roles = [
  {
    id: 'control',
    label: 'Control team',
    title: 'See the network. Act on the exception.',
    detail:
      'Production, engineering, quality and finance share the operational record while keeping their decisions clear.',
    points: [
      'Allocation, capacity and delayed jobs',
      'Drawing releases and quality decisions',
      'Material variance and invoice approvals',
    ],
    rows: [
      ['JOB-2291', 'Drawing released', 'Production'],
      ['CH-8842', 'Variance recorded', 'Materials'],
      ['INV-1187', 'Approval pending', 'Finance'],
    ],
    columns: ['Record', 'Current state', 'Owner'],
    href: '/login',
    cta: 'Open control workspace',
  },
  {
    id: 'partner',
    label: 'Partner unit',
    title: 'Keep the next job within reach.',
    detail:
      'A focused partner surface brings drawings, milestones, material and payments to the people making the parts.',
    points: [
      'Released drawings for assigned jobs',
      'Received quantity and production milestones',
      'Invoice status and performance scorecard',
    ],
    rows: [
      ['JOB-2291', 'In production', '480 pcs'],
      ['CH-8842', 'Acknowledged', '1,232 kg'],
      ['INV-1187', 'Scheduled', '12 Sep'],
    ],
    columns: ['Record', 'Current state', 'Detail'],
    href: '/partners',
    cta: 'Explore the partner experience',
  },
  {
    id: 'inspector',
    label: 'Inspector',
    title: 'Carry the inspection plan to the work.',
    detail:
      'Inspectors see their queue, record measured values and attach evidence to the job that needs it.',
    points: [
      'First article, in-process and final inspections',
      'Measurements against specified tolerances',
      'Non-conformances and rework follow-up',
    ],
    rows: [
      ['Lot 88', 'Final inspection', 'Ready'],
      ['Lot 91', 'First article', 'Pending'],
      ['Lot 76', 'Rework check', 'Assigned'],
    ],
    columns: ['Lot', 'Inspection', 'Status'],
    href: '/login',
    cta: 'Sign in to GRID-X',
  },
];
export function RoleExplorer(): React.JSX.Element {
  return (
    <Tabs defaultValue="control">
      <TabsList className="m-role-tabs" aria-label="Explore role workspaces">
        {roles.map((role) => (
          <TabsTrigger key={role.id} value={role.id}>
            {role.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {roles.map((role) => (
        <TabsContent key={role.id} value={role.id}>
          <div className="m-role-panel">
            <div>
              <h3>{role.title}</h3>
              <p>{role.detail}</p>
              <details className="m-disclosure">
                <summary>
                  What’s in this workspace <ChevronDown size={16} aria-hidden="true" />
                </summary>
                <ul className="m-check-list">
                  {role.points.map((point) => (
                    <li key={point}>
                      <Check size={15} aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
              </details>
              <Link className="m-text-link" href={role.href}>
                {role.cta}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <div className="m-window">
              <div className="m-window-title">
                <span>{role.label} workspace</span>
                <span className="m-caption">Illustrative preview</span>
              </div>
              <div className="m-record-body">
                <div className="m-record-heading">
                  <div>
                    <p className="m-caption">Workspace overview</p>
                    <h3>Work requiring attention</h3>
                  </div>
                </div>
                <div className="m-table-scroll">
                  <table className="m-table">
                    <caption className="sr-only">{role.label} example work queue</caption>
                    <thead>
                      <tr>
                        {role.columns.map((c) => (
                          <th scope="col" key={c}>
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {role.rows.map((row) => (
                        <tr key={row[0]}>
                          {row.map((v, i) => (
                            <td key={i}>{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="m-proof-line">
                  <LockKeyhole size={14} aria-hidden="true" />
                  Access follows the person’s assigned role.
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

const comparison = [
  {
    group: 'Foundation',
    rows: [
      ['Users, roles and partner onboarding', true, true, true],
      ['Components and drawing revisions', true, true, true],
      ['Jobs, material issue and milestones', true, true, true],
      ['Inspection, rework and job closure', true, true, true],
      ['Basic invoices, scorecard and dashboard', true, true, true],
    ],
  },
  {
    group: 'Network operations',
    rows: [
      ['Capacity planning and allocation scoring', false, true, true],
      ['Material reconciliation and deductions', false, true, true],
      ['Logistics and proof of delivery', false, true, true],
      ['Tooling, fixtures, gauges and calibration', false, true, true],
      ['17 standard reports and CSV export', false, true, true],
      ['IMS integration scope', false, true, true],
    ],
  },
  {
    group: 'Group visibility',
    rows: [
      ['Multi-company and multi-plant separation', false, false, true],
      ['Group dashboards and concentration analysis', false, false, true],
      ['Audit and retention configuration', false, false, true],
    ],
  },
] as const;
export function RolloutComparison(): React.JSX.Element {
  return (
    <details className="m-disclosure m-comparison-disclosure">
      <summary>
        Compare all rollout capabilities <ChevronDown size={18} aria-hidden="true" />
      </summary>
      <div
        className="m-table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Rollout scope comparison; scroll horizontally on small screens"
      >
        <table className="m-table m-compare-table">
          <caption>Compare the scope at each stage</caption>
          <thead>
            <tr>
              <th scope="col">Capability</th>
              <th scope="col">Pilot</th>
              <th scope="col">Network</th>
              <th scope="col">Group</th>
            </tr>
          </thead>
          {comparison.map((group) => (
            <tbody key={group.group}>
              <tr className="m-table-group">
                <th colSpan={4} scope="rowgroup">
                  {group.group}
                </th>
              </tr>
              {group.rows.map((row) => (
                <tr key={row[0]}>
                  <th scope="row">{row[0]}</th>
                  {row.slice(1).map((included, i) => (
                    <td key={i}>
                      {included ? (
                        <>
                          <Check size={15} aria-hidden="true" />
                          <span className="sr-only">Included</span>
                        </>
                      ) : (
                        <>
                          <Minus size={14} aria-hidden="true" />
                          <span className="sr-only">Later stage</span>
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <p className="m-table-footnote">
        Each stage builds on the previous one. Rollout scope is agreed for the operation; the stages
        shown here are not published subscription prices.
      </p>
    </details>
  );
}

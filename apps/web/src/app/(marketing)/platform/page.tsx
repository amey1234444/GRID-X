import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ClipboardCheck,
  FileLock2,
  Gauge,
  Layers,
  PackageSearch,
  Wallet,
} from 'lucide-react';

import { AmbientLines } from '@/components/marketing/ambient-lines';
import { ModuleExplorer, type ProductModule } from '@/components/marketing/module-explorer';
import {
  Eyebrow,
  FeatureBand,
  MetricBand,
  MiniRow,
  MiniSurface,
  Statement,
} from '@/components/marketing/primitives';
import { DisclosureList, type DisclosureItem } from '@/components/marketing/disclosure-list';
import { QuoteBand, type Quote } from '@/components/marketing/quote-band';
import { ProductFilm } from '@/components/marketing/product-film';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion';

export const metadata: Metadata = {
  title: 'Product',
  description:
    'Every GRID-X module, end to end: allocation, controlled drawings, material custody, quality evidence, commercials and the reporting layer over all of it.',
};

/**
 * The product page.
 *
 * The landing page argues that distributed manufacturing needs one control layer. This page has to
 * survive the next question — "what is actually in it?" — without turning into a feature checklist.
 * Each module therefore leads with the rule it enforces, and the supporting points are the
 * mechanics that make that rule true.
 *
 * The section ids are load-bearing: the primary nav links straight to #allocation, #drawings,
 * #quality and #payments.
 */

const modules = [
  {
    id: 'allocation',
    iconName: 'Layers',
    label: 'Module 01 — 02',
    title: 'Demand, jobs and allocation',
    rule: 'A job cannot be released to a partner who is not eligible to make it.',
    detail:
      'Jobs are raised by hand or pulled from IMS work orders. GRID-X ranks eligible partners on capability, live capacity, quality history, distance and rate, and refuses an allocation that would put a Class A component outside without documented authorisation.',
    points: [
      'Jobs created manually or pulled from IMS work orders and sales orders.',
      'Recommendation scores capability, live capacity, quality history, distance and rate.',
      'Class A components need explicit outsourcing authorisation before allocation.',
      'Acceptance, decline reasons and re-allocation are all recorded against the job.',
    ],
    visual: (
      <MiniSurface title="Allocation signal">
        <MiniRow label="Precision Auto" meta="94 · ready" tone="success" />
        <MiniRow label="Shakti Works" meta="81 · ready" tone="success" />
        <MiniRow label="Metro Fabricators" meta="class blocked" tone="warning" />
      </MiniSurface>
    ),
  },
  {
    id: 'drawings',
    iconName: 'FileLock2',
    label: 'Module 03',
    title: 'Drawing and revision control',
    rule: 'Only a released revision can reach a shop floor.',
    detail:
      'Drawings move through draft, review, approved, released and superseded. Access is granted per job, time-bound and watermarked, and every open is written to the access log — so "they were working to an old print" stops being an argument nobody can settle.',
    points: [
      'Draft, under review, approved, released and superseded revision lifecycle.',
      'Only released revisions attach to a job or open for a partner.',
      'Time-bound, job-scoped access grants with watermarked view-only mode.',
      'Every view, download and acknowledgement stored in the drawing access log.',
    ],
    visual: (
      <MiniSurface title="DRG-4471 / Rev C">
        <MiniRow label="Released to partner" meta="09:12" tone="success" />
        <MiniRow label="Viewed on shop floor" meta="09:41" />
        <MiniRow label="Rev B superseded" meta="locked" tone="warning" />
      </MiniSurface>
    ),
  },
  {
    id: 'material',
    iconName: 'PackageSearch',
    label: 'Module 06',
    title: 'Material issue and reconciliation',
    rule: 'Every kilogram issued has to be explained before an invoice clears.',
    detail:
      'Issue challans carry heat and batch numbers, weight and an expected return date. The partner acknowledges what actually arrived. Consumption, scrap and unused return are tracked per job, and reconciliation gates the invoice rather than becoming a month-end argument.',
    points: [
      'Challan-based issue with heat and batch numbers, weight and expected return date.',
      'Partner acknowledges received weight and records shortage or damage.',
      'Consumption, scrap return and unused return tracked per job and item.',
      'Reconciliation compares issued against consumed before an invoice can be approved.',
    ],
    visual: (
      <MiniSurface title="JOB-2291 / reconciliation">
        <MiniRow label="Issued" meta="1,240 kg" />
        <MiniRow label="Consumed + scrap" meta="1,226 kg" />
        <MiniRow label="Shortage" meta="14 kg" tone="warning" />
      </MiniSurface>
    ),
  },
  {
    id: 'quality',
    iconName: 'ClipboardCheck',
    label: 'Module 08 — 09',
    title: 'Quality, rejection and rework',
    rule: 'Acceptance requires measured evidence, not a phone call.',
    detail:
      'Inspection plans carry characteristics, tolerances and instruments. Inspectors record actual values against them from the floor, with photographs. A rejection raises a non-conformance, feeds the scorecard and opens a corrective action when the same defect repeats.',
    points: [
      'Inspection plans with measured characteristics, tolerances and instruments.',
      'First article, in-process, final and pre-dispatch inspection types.',
      'Rejections raise non-conformances, rework orders and corrective actions.',
      'Deviation approvals are explicit and permanently auditable.',
    ],
    visual: (
      <MiniSurface title="Inspection / Lot 88">
        <MiniRow label="Ø 24.00 ±0.05" meta="24.02" tone="success" />
        <MiniRow label="Surface finish" meta="pass" tone="success" />
        <MiniRow label="Concentricity" meta="reject" tone="warning" />
      </MiniSurface>
    ),
  },
  {
    id: 'payments',
    iconName: 'Wallet',
    label: 'Module 11',
    title: 'Commercials and payments',
    rule: 'You pay for accepted quantity at the rate that was actually in force.',
    detail:
      'Rate cards are held per partner and component with full revision history. Invoices are built from accepted quantity only, then pass quantity, quality and material verification before finance approval — so the number that leaves matches the number that was made.',
    points: [
      'Rate master per partner and component with revision history and approvals.',
      'Invoices built from accepted quantity only, with deductions and incentives.',
      'Quantity, quality and material verification gates before finance approval.',
      'Payment scheduling with invoice and payment ageing reports.',
    ],
    visual: (
      <MiniSurface title="INV-1187 / approval chain">
        <MiniRow label="Quantity verified" meta="passed" tone="success" />
        <MiniRow label="Quality verified" meta="passed" tone="success" />
        <MiniRow label="Finance approval" meta="pending" />
      </MiniSurface>
    ),
  },
  {
    id: 'insight',
    iconName: 'Gauge',
    label: 'Module 12 — 14',
    title: 'Dashboards, scorecards and reports',
    rule: 'The same numbers everywhere, or they are not numbers.',
    detail:
      'Every dashboard reads the same operational record the screens write to. Seven KPIs score each partner continuously and drive category changes, and seventeen standard reports export to CSV for finance and audit without anyone rekeying a figure.',
    points: [
      'Management, operations, quality, finance and partner dashboards.',
      'Seven-KPI partner scorecards driving category and level changes.',
      'Seventeen standard reports including avoided capex and partner concentration.',
      'CSV export on every report for finance and audit use.',
    ],
    visual: (
      <MiniSurface title="Scorecard / Precision Auto">
        <MiniRow label="Quality" meta="96" tone="success" />
        <MiniRow label="Delivery" meta="91" tone="success" />
        <MiniRow label="Responsiveness" meta="74" tone="warning" />
      </MiniSurface>
    ),
  },
];

const moduleRows: Record<string, ProductModule['rows']> = {
  allocation: [
    { label: 'Precision Auto', value: '94 / ready', tone: 'live' },
    { label: 'Shakti Works', value: '81 / ready', tone: 'live' },
    { label: 'Metro Fabricators', value: 'class blocked', tone: 'warning' },
  ],
  drawings: [
    { label: 'DRG-4471 / Rev C', value: 'released', tone: 'live' },
    { label: 'Partner acknowledgement', value: '09:41', tone: 'live' },
    { label: 'Rev B', value: 'superseded', tone: 'neutral' },
  ],
  material: [
    { label: 'Issued', value: '1,240 kg', tone: 'neutral' },
    { label: 'Consumed + scrap', value: '1,226 kg', tone: 'live' },
    { label: 'Variance', value: '14 kg', tone: 'warning' },
  ],
  quality: [
    { label: 'Ø 24.00 ±0.05', value: '24.02', tone: 'live' },
    { label: 'Surface finish', value: 'pass', tone: 'live' },
    { label: 'Concentricity', value: 'reject', tone: 'warning' },
  ],
  payments: [
    { label: 'Quantity gate', value: 'passed', tone: 'live' },
    { label: 'Material gate', value: 'passed', tone: 'live' },
    { label: 'Finance approval', value: 'pending 2d', tone: 'warning' },
  ],
  insight: [
    { label: 'On-time delivery', value: '94.2%', tone: 'live' },
    { label: 'Acceptance rate', value: '98.6%', tone: 'live' },
    { label: 'Items needing action', value: '3', tone: 'warning' },
  ],
};

const explorerModules: ProductModule[] = modules.map(
  ({ id, label, title, rule, detail, points, iconName }) => ({
    id,
    eyebrow: label,
    title,
    summary: detail,
    outcome: rule,
    points,
    icon: iconName,
    rows: moduleRows[id] ?? [],
  }),
);

const surface = [
  {
    icon: <Layers />,
    title: 'One record',
    detail:
      'Every module writes to the same job, so no screen holds a private version of the truth.',
  },
  {
    icon: <FileLock2 />,
    title: 'Controlled by default',
    detail: 'Access is scoped, time-bound and logged rather than granted and forgotten.',
  },
  {
    icon: <ClipboardCheck />,
    title: 'Evidence at each gate',
    detail: 'Work advances on a recorded result, never on an assurance.',
  },
  {
    icon: <Gauge />,
    title: 'Continuously scored',
    detail: 'Partner performance updates as the work happens, not at review time.',
  },
  {
    icon: <Wallet />,
    title: 'Audited to payment',
    detail: 'The trail runs unbroken from released drawing to approved payment.',
  },
];

const scale = [
  { value: '14', label: 'Modules covering the full outsourcing lifecycle' },
  { value: '7', label: 'KPIs scoring every partner continuously' },
  { value: '17', label: 'Standard reports, each exportable to CSV' },
  { value: '3', label: 'Focused experiences — control, partner and inspector' },
];

/** The supporting capabilities — indexed rather than argued, so the page stays scannable. */
const capabilities: DisclosureItem[] = [
  {
    title: 'Capacity planning',
    detail:
      'Declared machine and manpower capacity per partner, drawn down by live allocations so the next job is ranked against what is actually free.',
  },
  {
    title: 'Planning board',
    detail:
      'A single board across every partner and job, showing what is late, what is at risk and what has no drawing released yet.',
  },
  {
    title: 'Clarifications',
    detail:
      'A partner question is raised against the job and the drawing revision, so the answer lands on the record instead of in one person’s inbox.',
  },
  {
    title: 'Delay register',
    detail:
      'Delays are recorded with a reason and an owner, and feed the responsiveness KPI on the partner scorecard.',
  },
  {
    title: 'Logistics',
    detail:
      'Pickups, deliveries, shipments and vehicles tracked against the jobs they carry, with dispatch and receipt both acknowledged.',
  },
  {
    title: 'Tooling',
    detail:
      'Company-owned tooling issued to partners, with custody, condition and return tracked like any other issued asset.',
  },
  {
    title: 'Scrap and returns',
    detail:
      'Scrap return and unused material return are recorded per job and priced into reconciliation rather than written off.',
  },
  {
    title: 'Incentives and deductions',
    detail:
      'Rule-based incentives and evidence-backed deductions are applied to the invoice, each traceable to the record that caused it.',
  },
  {
    title: 'Notifications',
    detail:
      'Allocation, rejection, clarification and payment events reach the people responsible, in app and on the partner handset.',
  },
  {
    title: 'Bulk import',
    detail:
      'Components, items, partners and rates load from CSV with per-row validation, so onboarding does not start with retyping.',
  },
  {
    title: 'Audit log',
    detail:
      'Every state change is written with actor, time, device and IP, and nothing in the product can rewrite it afterwards.',
  },
  {
    title: 'IMS integration',
    detail:
      'Work orders and sales orders pull through from IMS, which stays the owner of internal inventory and manufacturing.',
  },
];

const quotes: [Quote, Quote] = [
  {
    quote:
      'The drawing revision argument just stopped happening. Everyone is looking at the same released print.',
    name: 'Plant head',
    role: 'OSWAR Rotocorp',
    initials: 'OR',
  },
  {
    quote:
      'We stopped reconciling material at month end, because it is reconciled by the time the invoice is raised.',
    name: 'Finance lead',
    role: 'OSWAR Rotocorp',
    initials: 'FL',
  },
];

const personas = [
  {
    title: 'Control',
    detail:
      'The full operation — allocation, drawings, material, quality, commercials and reporting.',
    href: '/login',
  },
  {
    title: 'Partner',
    detail: 'Jobs, drawings, material acknowledgement, milestones, inspections and payment status.',
    href: '/partner/login',
  },
  {
    title: 'Inspector',
    detail: 'A focused queue with the plan attached, built for recording results on the floor.',
    href: '/login',
  },
];

export default function PlatformPage(): React.JSX.Element {
  return (
    <>
      <ProductFilm
        as="h1"
        eyebrow="Distributed manufacturing OS"
        title="One network. Every control connected."
        description="GRID-X connects partner allocation, released engineering, material custody, measured quality and approved payment without breaking the evidence chain."
        href="#modules"
        linkLabel="Explore the control modules"
      />

      <FeatureBand items={surface} />

      <section
        id="modules"
        className="section-blueprint scroll-mt-16 border-b border-border-subtle py-24 sm:py-32"
      >
        <div className="container">
          <Reveal className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
            <h2 className="type-hero">The modules</h2>
            <div className="max-w-2xl">
              <p className="text-[clamp(1.125rem,1.8vw,1.5rem)] leading-[1.45] tracking-[-0.025em] text-muted-foreground">
                Listed in the order the work actually moves — from the decision to outsource through
                to the payment that closes it.
              </p>
              <p className="mt-5 font-mono text-[0.625rem] uppercase tracking-[0.11em] text-subtle">
                Select a module to inspect its controls and live record
              </p>
            </div>
          </Reveal>

          <Reveal className="mt-16" y={18}>
            <ModuleExplorer modules={explorerModules} />
          </Reveal>
        </div>
      </section>

      <section className="border-b border-border-subtle bg-[#080808] py-24 sm:py-32">
        <div className="container">
          <Reveal>
            <DisclosureList label="Also included" items={capabilities} />
          </Reveal>
        </div>
      </section>

      <section className="border-b border-border-subtle bg-[#080808] py-24 sm:py-32">
        <div className="container">
          <Reveal className="max-w-3xl">
            <Eyebrow>Coverage</Eyebrow>
            <Statement
              className="mt-7"
              lead="Wide enough to replace the spreadsheets."
              trail="Not a pilot that only handles the easy jobs."
            />
          </Reveal>
          <Reveal className="mt-16">
            <MetricBand items={scale} />
          </Reveal>
        </div>
      </section>

      <section className="section-grid border-b border-border-subtle py-24 sm:py-32">
        <div className="container">
          <Reveal className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
            <h2 className="type-hero">Three experiences</h2>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              One system, but nobody carries anyone else&apos;s complexity. Each surface shows only
              the depth that role actually needs.
            </p>
          </Reveal>
          <StaggerGroup className="mt-16 grid gap-px overflow-hidden rounded-[18px] border border-border-strong bg-border-subtle lg:grid-cols-3">
            {personas.map((persona) => (
              <StaggerItem key={persona.title} className="h-full">
                <article className="plate plate-lit group flex h-full min-h-[260px] flex-col p-7 transition-[background-color,transform] duration-300 ease-out-expo hover:bg-[#121212] lg:hover:-translate-y-0.5">
                  <p className="type-label">{persona.title}</p>
                  <h3 className="mt-3 font-display text-2xl font-medium tracking-[-0.04em]">
                    GRID-X {persona.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{persona.detail}</p>
                  <Link
                    href={persona.href}
                    className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-medium text-brand transition-colors group-hover:text-foreground"
                  >
                    Open {persona.title} <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <section className="border-b border-border-subtle bg-[#080808] py-24 sm:py-32">
        <div className="container">
          <Reveal>
            <QuoteBand
              quotes={quotes}
              footnote="One controlled record across production, engineering, quality, materials, logistics and finance."
              action={{ label: 'For partner units', href: '/partners' }}
            />
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#080808] py-28 sm:py-36">
        <AmbientLines variant="routes" className="opacity-30" />
        <div className="container relative text-center">
          <Reveal className="mx-auto max-w-4xl">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-signal">
              Every module, one record
            </p>
            <h2 className="mt-8 text-balance font-display text-[clamp(2.5rem,4.8vw,4rem)] font-medium leading-[1] tracking-[-0.045em]">
              See the whole network at once.
            </h2>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Open GRID-X <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/partners"
                className="inline-flex h-12 items-center justify-center rounded-full border border-border-strong bg-surface px-7 text-sm font-semibold transition-colors hover:bg-surface-hover"
              >
                For partner units
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

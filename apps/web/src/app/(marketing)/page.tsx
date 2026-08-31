import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  FileLock2,
  Gauge,
  Languages,
  Layers,
  ScrollText,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from 'lucide-react';

import { AppPreview } from '@/components/marketing/app-preview';
import {
  Eyebrow,
  FeatureBand,
  MetricBand,
  MiniRow,
  MiniSurface,
  Statement,
  StatementBand,
} from '@/components/marketing/primitives';
import { StageRail, type Stage } from '@/components/marketing/stage-rail';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion';
import { Button } from '@/components/ui/button';

/* -------------------------------------------------------------------- */
/* Content                                                               */
/* -------------------------------------------------------------------- */

const outcomes = [
  {
    value: '1 system',
    label: 'Replaces the calls, WhatsApp threads and spreadsheets between plants',
  },
  { value: '100%', label: 'Drawing access logged, revision-controlled and acknowledged' },
  { value: 'Zero', label: 'Payments released without an accepted quantity behind them' },
  { value: '7 KPIs', label: 'Scored on every partner, every period, automatically' },
];

/**
 * The stages mirror the actual GRID-X transaction, not a marketing funnel.
 * Each panel names a control the system enforces rather than a benefit it
 * claims.
 */
const stages: Stage[] = [
  {
    id: 'issue',
    label: 'Issue the job',
    lead: 'Every job leaves with the right revision.',
    trail: 'Capability, capacity and authorisation are checked before a partner ever sees it.',
    panels: [
      {
        title: 'Allocation that argues back',
        detail:
          'Partners are scored on capability, declared capacity, quality history and distance. Class A work will not allocate to an unauthorised unit — the system refuses rather than warns.',
        visual: (
          <MiniSurface title="Allocation">
            <MiniRow label="Precision Auto Components" meta="Score 94" tone="success" />
            <MiniRow label="Shakti Engineering Works" meta="Score 81" tone="success" />
            <MiniRow label="Metro Fabricators" meta="No Class A" tone="destructive" />
          </MiniSurface>
        ),
      },
      {
        title: 'Drawings under revision control',
        detail:
          'Only released revisions reach the shop floor. Every view, download and acknowledgement is written to the job record, so a superseded print is never an open question.',
        visual: (
          <MiniSurface title="DRG-4471 · Rev C">
            <MiniRow label="Released to partner" meta="09:12" tone="success" />
            <MiniRow label="Viewed by operator" meta="09:41" />
            <MiniRow label="Rev B superseded" meta="Locked" tone="warning" />
          </MiniSurface>
        ),
      },
    ],
  },
  {
    id: 'material',
    label: 'Track the material',
    lead: 'Material is tracked to the kilogram.',
    trail: 'Issued against challan, acknowledged on a phone, and reconciled before anyone is paid.',
    panels: [
      {
        title: 'Custody, not trust',
        detail:
          'Weight is recorded at issue and acknowledged by the partner on their own device. Stock under partner custody is visible at all times, valued and ageing.',
      },
      {
        title: 'Reconciliation as a gate',
        detail:
          'Issued versus consumed versus scrap returned. Shortages become deductions on the invoice automatically — not a conversation at month end.',
        visual: (
          <MiniSurface title="Reconciliation · JOB-2291">
            <MiniRow label="Issued" meta="1,240 kg" />
            <MiniRow label="Consumed + scrap" meta="1,226 kg" />
            <MiniRow label="Shortage deducted" meta="14 kg" tone="warning" />
          </MiniSurface>
        ),
      },
    ],
  },
  {
    id: 'quality',
    label: 'Verify the quality',
    lead: 'Nothing is accepted on a phone call.',
    trail: 'First article, sampling plan and measured characteristics, recorded against the job.',
    panels: [
      {
        title: 'Inspection with evidence',
        detail:
          'Inspectors work a focused queue with the plan attached, record measured values against nominal and tolerance, and attach photographs from the field.',
      },
      {
        title: 'Rejection has consequences',
        detail:
          'A rejection raises a rework order, feeds the partner scorecard and opens a corrective action when the same defect repeats across the network.',
        visual: (
          <MiniSurface title="Inspection · Lot 88">
            <MiniRow label="Ø 24.00 ±0.05" meta="24.02 ✓" tone="success" />
            <MiniRow label="Surface finish" meta="Pass" tone="success" />
            <MiniRow label="Concentricity" meta="Reject" tone="destructive" />
          </MiniSurface>
        ),
      },
    ],
  },
  {
    id: 'payment',
    label: 'Release the payment',
    lead: 'Payment follows accepted quantity.',
    trail: 'Not dispatched quantity, not promised quantity — accepted, reconciled and approved.',
    panels: [
      {
        title: 'Three gates before finance',
        detail:
          'Quantity accepted by inspection, material reconciled without shortage, and rate matched to the agreed schedule. An invoice that fails any one of them cannot be approved.',
      },
      {
        title: 'Ageing nobody has to chase',
        detail:
          'Approval and payment ageing is visible to both sides. Partners see exactly where their money is, which is the difference between a vendor and a network.',
        visual: (
          <MiniSurface title="Invoice INV-1043">
            <MiniRow label="Quantity check" meta="Passed" tone="success" />
            <MiniRow label="Material reconciled" meta="Passed" tone="success" />
            <MiniRow label="Finance approval" meta="Pending 2d" tone="warning" />
          </MiniSurface>
        ),
      },
    ],
  },
];

const fieldReadiness = [
  {
    icon: <WifiOff />,
    title: 'Offline-tolerant',
    detail:
      'Jobs stay readable, milestones save locally and photos queue until the signal returns.',
  },
  {
    icon: <Gauge />,
    title: 'Low bandwidth',
    detail: 'Compressed drawing previews and lean payloads keep the app usable on 2G.',
  },
  {
    icon: <Languages />,
    title: 'Hindi and English',
    detail: 'Partner screens speak the language of the operator, not the head office.',
  },
  {
    icon: <ScrollText />,
    title: 'Audited by default',
    detail: 'Every drawing view, quality decision and approval is permanently recorded.',
  },
  {
    icon: <FileLock2 />,
    title: 'Access controlled',
    detail: 'Partners see their own work and nothing else. Roles are enforced server-side.',
  },
];

const personas = [
  {
    title: 'GRID-X Control',
    audience: 'Operations, engineering, quality and finance',
    points: [
      'Allocation and capacity boards',
      'Drawing and revision control',
      'Inspection and payment approvals',
    ],
    href: '/login',
    cta: 'Sign in to Control',
    icon: Layers,
  },
  {
    title: 'GRID-X Partner',
    audience: 'Mobile-first, for MSME partner units',
    points: [
      'Accept jobs and read instructions',
      'Update milestones offline',
      'Raise invoices, track payment',
    ],
    href: '/partner/login',
    cta: 'Open partner app',
    icon: Gauge,
  },
  {
    title: 'GRID-X Inspector',
    audience: 'For quality inspectors on the move',
    points: [
      'Queue with plans attached',
      'Record measured characteristics',
      'Raise rejections and rework',
    ],
    href: '/login',
    cta: 'Inspector sign in',
    icon: BadgeCheck,
  },
];

/* -------------------------------------------------------------------- */

export default function MarketingHomePage(): React.JSX.Element {
  return (
    <>
      {/* Hero — the product is visible in the first viewport, not buried below a pitch. */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div
          className="pointer-events-none absolute inset-0 dot-pattern radial-fade opacity-35"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -top-52 right-[8%] h-[34rem] w-[40rem] rounded-full bg-brand/[0.10] blur-3xl"
          aria-hidden
        />

        <div className="container relative grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-[0.84fr_1.16fr] lg:gap-10 lg:py-24 xl:gap-16">
          <div className="max-w-2xl">
            <Reveal>
              <div className="flex flex-wrap items-center gap-2">
                <Eyebrow>
                  <span
                    className="mr-1.5 h-1.5 w-1.5 animate-pulse-dot rounded-full bg-success"
                    aria-hidden
                  />
                  GRID-X Control Network
                </Eyebrow>
                <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-subtle">
                  <Sparkles className="h-3 w-3 text-brand" /> Built for OSWAR
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <h1 className="mt-6 text-balance text-[clamp(3rem,6vw,5.35rem)] font-semibold leading-[0.96] tracking-[-0.055em]">
                <span className="text-foreground">Run every partner</span>{' '}
                <span className="bg-gradient-to-r from-white/60 via-brand to-white/45 bg-clip-text text-transparent">
                  like one factory.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="mt-6 max-w-xl text-pretty text-[1rem] leading-relaxed text-muted-foreground sm:text-[1.0625rem]">
                Plan jobs, lock drawing revisions, trace material, verify quality and release
                payment from one auditable command center built for distributed manufacturing.
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <Button size="lg" asChild>
                  <Link href="/login">
                    Enter command center <ArrowRight />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/platform">See how it works</Link>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.23}>
              <div className="mt-9 grid max-w-xl gap-3 border-t border-border-subtle pt-5 sm:grid-cols-3">
                {[
                  { icon: Activity, label: 'Live execution', detail: 'One network view' },
                  { icon: FileLock2, label: 'Revision locked', detail: 'No wrong drawing' },
                  { icon: ShieldCheck, label: 'Evidence first', detail: 'Audit by default' },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-control bg-surface-elevated text-brand shadow-hairline">
                      <item.icon className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-[0.75rem] font-medium">{item.label}</p>
                      <p className="mt-0.5 text-[0.6875rem] text-subtle">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.16} y={22} className="lg:-mr-24 xl:-mr-28">
            <AppPreview />
          </Reveal>
        </div>
      </section>

      {/* Outcomes — dense, unboxed. */}
      <section className="border-b border-border-subtle">
        <div className="container py-4 sm:py-6">
          <MetricBand items={outcomes} />
        </div>
      </section>

      {/* The transaction, told as a scrolling flow. */}
      <section className="border-b border-border-subtle py-20 sm:py-28">
        <div className="container mb-14 max-w-3xl">
          <Reveal>
            <Eyebrow>The central transaction</Eyebrow>
            <Statement
              className="mt-5"
              lead="One controlled flow, from job issue to payment."
              trail="GRID-X will not let a step be skipped — each gate has to be satisfied and recorded before the next one opens."
            />
          </Reveal>
        </div>
        <StageRail stages={stages} />
      </section>

      {/* Full-bleed assertion. */}
      <StatementBand eyebrow="The difference">
        <Statement
          className="max-w-4xl text-[clamp(2.25rem,5vw,4rem)]"
          lead="A network you can audit"
          trail="is a network you can scale."
        />
        <p className="max-w-xl text-pretty text-[1.0625rem] leading-relaxed text-muted-foreground">
          Every drawing view, quality decision, material movement and payment approval is written
          down, attributed and permanent. Not because compliance asked — because that is the only
          way distributed manufacturing holds together.
        </p>
      </StatementBand>

      {/* Field reality. */}
      <section className="py-24 sm:py-28">
        <div className="container mb-14 max-w-2xl">
          <Reveal>
            <Eyebrow>Designed for Indian shop floors</Eyebrow>
            <Statement
              className="mt-5"
              lead="Works where the work happens."
              trail="Entry-level Android phones, patchy signal, a noisy floor and an operator who does not read English."
            />
          </Reveal>
        </div>
        <Reveal>
          <FeatureBand items={fieldReadiness} />
        </Reveal>
      </section>

      {/* Three experiences. */}
      <section className="border-b border-border-subtle py-24 sm:py-28">
        <div className="container space-y-14">
          <Reveal className="max-w-2xl">
            <Eyebrow>Three experiences</Eyebrow>
            <Statement
              className="mt-5"
              lead="Purpose-built for every person in the chain."
              trail="Office teams get depth. Partner units get a phone that works on a weak signal. Inspectors get a queue."
            />
          </Reveal>

          <StaggerGroup className="grid gap-px overflow-hidden rounded-card bg-border-subtle lg:grid-cols-3">
            {personas.map((persona) => (
              <StaggerItem key={persona.title} className="h-full">
                <article className="group flex h-full flex-col gap-4 bg-background p-6 transition-colors duration-200 hover:bg-card">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-input bg-surface-elevated text-muted-foreground shadow-hairline transition-colors duration-200 group-hover:text-foreground">
                    <persona.icon className="h-[18px] w-[18px]" />
                  </span>

                  <div>
                    <h3 className="text-[1.0625rem] font-medium tracking-[-0.01em]">
                      {persona.title}
                    </h3>
                    <p className="mt-0.5 text-[0.8125rem] text-subtle">{persona.audience}</p>
                  </div>

                  <ul className="flex-1 space-y-2">
                    {persona.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2 text-[0.875rem] text-muted-foreground"
                      >
                        <span
                          className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground"
                          aria-hidden
                        />
                        {point}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={persona.href}
                    className="inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-foreground underline-offset-4 transition-colors hover:underline"
                  >
                    {persona.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </article>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Close. */}
      <section className="py-24 sm:py-28">
        <div className="container">
          <Reveal y={20}>
            <div className="relative overflow-hidden rounded-card bg-card px-6 py-16 text-center shadow-hairline sm:px-12">
              <div
                className="pointer-events-none absolute inset-0 grid-pattern opacity-25"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute left-1/2 top-0 h-56 w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/[0.07] blur-3xl"
                aria-hidden
              />
              <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5">
                <Statement
                  lead="Bring the whole network into one system."
                  trail="From a first trial order to a certified strategic partner."
                />
                <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
                  <Button size="lg" asChild>
                    <Link href="/login">
                      Sign in to GRID-X <ArrowRight />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/partner/login">Partner sign in</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

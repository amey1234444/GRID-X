import Link from 'next/link';
import { ArrowRight, BadgeCheck, Boxes, Layers, RadioTower, ShieldCheck } from 'lucide-react';

import { AmbientLines } from '@/components/marketing/ambient-lines';
import { AppPreview } from '@/components/marketing/app-preview';
import { FieldReadinessShowcase } from '@/components/marketing/field-readiness-showcase';
import { BlueprintFigures, EvidenceVisual } from '@/components/marketing/linear-visuals';
import { ProductFilm } from '@/components/marketing/product-film';
import {
  Eyebrow,
  MetricBand,
  MiniRow,
  MiniSurface,
  Statement,
} from '@/components/marketing/primitives';
import { StageRail, type Stage } from '@/components/marketing/stage-rail';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion';

const outcomes = [
  { value: '1 system', label: 'Across operations, engineering, quality and finance' },
  { value: '100%', label: 'Released drawing access logged and acknowledged' },
  { value: '0 gaps', label: 'Between accepted quantity and approved payment' },
  { value: '7 signals', label: 'Continuously scoring every manufacturing partner' },
];

const stages: Stage[] = [
  {
    id: 'issue',
    label: 'Issue the job',
    lead: 'Every job starts controlled.',
    trail: 'Capability, capacity and drawing authority are checked before release.',
    panels: [
      {
        title: 'Allocation with constraints',
        detail:
          'GRID-X ranks eligible partners by capability, live capacity, quality history and distance. It blocks an allocation when the required authorisation is missing.',
        visual: (
          <MiniSurface title="Allocation signal">
            <MiniRow label="Precision Auto" meta="94 · ready" tone="success" />
            <MiniRow label="Shakti Works" meta="81 · ready" tone="success" />
            <MiniRow label="Metro Fabricators" meta="class blocked" tone="warning" />
          </MiniSurface>
        ),
      },
      {
        title: 'The right revision travels',
        detail:
          'Only released drawings reach the partner. Every view and acknowledgement is written to the job while superseded revisions remain locked.',
        visual: (
          <MiniSurface title="DRG-4471 / Rev C">
            <MiniRow label="Released to partner" meta="09:12" tone="success" />
            <MiniRow label="Viewed on shop floor" meta="09:41" />
            <MiniRow label="Rev B superseded" meta="locked" tone="warning" />
          </MiniSurface>
        ),
      },
    ],
  },
  {
    id: 'material',
    label: 'Track material',
    lead: 'Custody stays visible.',
    trail: 'Issued, acknowledged, consumed and returned quantities remain tied to one job.',
    panels: [
      {
        title: 'Material under partner custody',
        detail:
          'Issue challans and mobile acknowledgement make stock visible by partner, job, age and value—without waiting for a month-end spreadsheet.',
      },
      {
        title: 'Reconciliation is a gate',
        detail:
          'Consumed quantity and returned scrap must explain every kilogram. Shortage becomes a recorded deduction, not a later negotiation.',
        visual: (
          <MiniSurface title="JOB-2291 / reconciliation">
            <MiniRow label="Issued" meta="1,240 kg" />
            <MiniRow label="Consumed + scrap" meta="1,226 kg" />
            <MiniRow label="Shortage" meta="14 kg" tone="warning" />
          </MiniSurface>
        ),
      },
    ],
  },
  {
    id: 'quality',
    label: 'Verify quality',
    lead: 'Acceptance requires evidence.',
    trail: 'Measured characteristics, photographs and decisions stay on the production record.',
    panels: [
      {
        title: 'Inspection where work happens',
        detail:
          'Inspectors receive a focused queue with the plan attached, record actual values against tolerance and capture evidence from the field.',
      },
      {
        title: 'A rejection changes the system',
        detail:
          'Rejected characteristics raise rework, affect the scorecard and trigger corrective action when the same defect repeats.',
        visual: (
          <MiniSurface title="Inspection / Lot 88">
            <MiniRow label="Ø 24.00 ±0.05" meta="24.02" tone="success" />
            <MiniRow label="Surface finish" meta="pass" tone="success" />
            <MiniRow label="Concentricity" meta="reject" tone="warning" />
          </MiniSurface>
        ),
      },
    ],
  },
  {
    id: 'payment',
    label: 'Release payment',
    lead: 'Payment follows accepted output.',
    trail: 'Quantity, material and rate gates must agree before finance can approve.',
    panels: [
      {
        title: 'Three checks before finance',
        detail:
          'Accepted quantity, reconciled material and the agreed rate are evaluated together. A failed check stops the invoice with a precise reason.',
      },
      {
        title: 'Transparent ageing',
        detail:
          'Both teams can see who owns the next decision and how long it has waited, reducing calls without hiding accountability.',
        visual: (
          <MiniSurface title="INV-1043 / approval">
            <MiniRow label="Quantity" meta="passed" tone="success" />
            <MiniRow label="Material" meta="passed" tone="success" />
            <MiniRow label="Finance" meta="pending 2d" tone="warning" />
          </MiniSurface>
        ),
      },
    ],
  },
];

const personas = [
  {
    title: 'Control',
    label: 'For operations, engineering, quality and finance',
    detail: 'The full command layer for allocation, release, inspection and payment.',
    href: '/login',
    icon: Layers,
  },
  {
    title: 'Partner',
    label: 'For MSME manufacturing units',
    detail: 'A mobile-first work queue for jobs, drawings, milestones and invoices.',
    href: '/partner/login',
    icon: Boxes,
  },
  {
    title: 'Inspector',
    label: 'For quality teams in the field',
    detail: 'Plans, measurements, evidence and rework decisions in one focused flow.',
    href: '/login',
    icon: BadgeCheck,
  },
];

export default function MarketingHomePage(): React.JSX.Element {
  return (
    <>
      <section className="linear-hero relative overflow-hidden border-b border-border-subtle">
        <AmbientLines variant="network" className="opacity-25" />
        <div className="container relative pb-16 pt-20 sm:pt-28 lg:pb-24 lg:pt-36">
          <Reveal>
            <div className="flex items-center gap-3">
              <Eyebrow className="rounded-full border border-brand/20 bg-brand/[0.07] px-3 py-1.5 text-brand shadow-none">
                <span className="mr-2 h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal" />
                GRID-X manufacturing network
              </Eyebrow>
              <span className="hidden font-mono text-[0.625rem] uppercase tracking-[0.12em] text-subtle sm:inline">
                System / 02
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="mt-8 max-w-[930px] text-balance text-[clamp(3.25rem,5.3vw,4.5rem)] font-medium leading-[1] tracking-[-0.045em]">
              The operating system for{' '}
              <span className="bg-gradient-to-r from-white via-white to-white/45 bg-clip-text text-transparent">
                distributed manufacturing.
              </span>
            </h1>
          </Reveal>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.65fr] lg:items-end">
            <Reveal delay={0.1}>
              <p className="max-w-2xl text-pretty text-[0.9375rem] leading-7 text-muted-foreground sm:text-base">
                Plan jobs, release drawings, trace material, verify quality and approve payment
                across every partner as one live, auditable operation.
              </p>
            </Reveal>
            <Reveal delay={0.14}>
              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
                >
                  Open GRID-X <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/platform"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-border-strong bg-surface/70 px-6 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover"
                >
                  Explore the platform
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.18} y={24} className="mt-16 lg:mt-24">
            <AppPreview />
          </Reveal>
        </div>
      </section>

      <section className="border-b border-border-subtle bg-[#080808]">
        <div className="container py-9">
          <p className="mb-6 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-subtle">
            One shared system across the operation
          </p>
          <div className="edge-fade grid grid-cols-2 gap-y-7 text-center text-sm font-semibold text-muted-foreground sm:grid-cols-4 lg:grid-cols-7">
            {[
              'Production',
              'Engineering',
              'Quality',
              'Materials',
              'Logistics',
              'Finance',
              'Partners',
            ].map((item) => (
              <span key={item} className="tracking-[-0.02em]">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="section-graphite border-b border-border-subtle py-24 sm:py-32">
        <div className="container">
          <Reveal className="max-w-6xl">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-brand">
              Built for real manufacturing flow
            </p>
            <h2 className="mt-10 text-balance text-[clamp(2.35rem,3.6vw,3rem)] font-medium leading-[1.04] tracking-[-0.04em]">
              <span className="text-foreground">
                A new control layer for partner manufacturing.
              </span>{' '}
              <span className="text-subtle">
                GRID-X turns distributed work into one connected, inspectable system.
              </span>
            </h2>
          </Reveal>
          <Reveal className="mt-20" y={20}>
            <BlueprintFigures />
          </Reveal>
        </div>
      </section>

      <ProductFilm
        id="network-film"
        eyebrow="Network operations"
        title="From issued job to verified payment."
        description="Watch allocation, engineering control, material custody, measured quality and commercial approval move through one connected manufacturing network."
      />

      <section className="border-b border-border-subtle bg-[#080808] py-24 sm:py-32">
        <div className="container mb-16 grid gap-10 lg:grid-cols-[0.68fr_1.32fr] lg:gap-24">
          <Reveal>
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-signal">
              The controlled transaction
            </p>
            <h2 className="mt-5 text-[clamp(2.35rem,3.6vw,3rem)] font-medium leading-[1.02] tracking-[-0.04em]">
              One flow. Four gates.
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <p className="max-w-2xl text-[1rem] leading-7 text-muted-foreground">
              Work advances when the required operational evidence exists—not when a call says it is
              done.
            </p>
          </Reveal>
        </div>
        <StageRail stages={stages} />
      </section>

      <section className="section-graphite border-b border-border-subtle py-24 sm:py-32">
        <div className="container">
          <Reveal className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
            <h2 className="text-[clamp(2.35rem,3.6vw,3rem)] font-medium leading-[1.02] tracking-[-0.04em]">
              Verify and release
            </h2>
            <div>
              <p className="max-w-2xl text-[clamp(1.2rem,2vw,1.5rem)] leading-[1.4] tracking-[-0.025em]">
                The drawing, material trail, measured quality and accepted quantity stay together
                all the way to payment.
              </p>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                Every gate explains what passed, what failed and who owns the next action.
              </p>
            </div>
          </Reveal>
          <Reveal className="mt-16" y={24}>
            <EvidenceVisual />
          </Reveal>
        </div>
      </section>

      <section className="border-b border-border-subtle bg-[#080808] py-24 sm:py-32">
        <div className="container">
          <Reveal className="max-w-3xl">
            <Eyebrow>Designed for Indian shop floors</Eyebrow>
            <Statement
              className="mt-7"
              lead="Works where the work happens."
              trail="Entry-level Android phones, weak signals, noisy floors and multilingual teams are first-class constraints."
            />
          </Reveal>
          <Reveal className="mt-14" y={22}>
            <FieldReadinessShowcase />
          </Reveal>
        </div>
      </section>

      <section className="bg-[#080808] py-24 sm:py-32">
        <div className="container">
          <Reveal className="grid gap-3 lg:grid-cols-[1.65fr_0.85fr]">
            <article className="editorial-card relative min-h-[480px] overflow-hidden rounded-[18px] p-8 sm:p-12">
              <div className="absolute -bottom-24 -right-20 h-[420px] w-[420px] rounded-full border-[48px] border-black/[0.05]" />
              <RadioTower className="h-8 w-8" />
              <h2 className="relative mt-10 max-w-3xl text-[clamp(2.2rem,3.6vw,3rem)] font-medium leading-[1.04] tracking-[-0.045em]">
                See one network—not a collection of disconnected vendors.
              </h2>
              <p className="absolute bottom-10 left-8 max-w-md text-base leading-7 text-muted-foreground sm:left-12">
                Shared state gives every team the same operational truth without flattening their
                responsibilities.
              </p>
            </article>
            <article className="evidence-momentum-card relative flex min-h-[480px] flex-col overflow-hidden rounded-[18px] p-8 sm:p-10">
              <div className="relative z-10 flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-full border border-signal/25 bg-signal/[0.06]">
                  <ShieldCheck className="h-4 w-4 text-signal" />
                </span>
                <span className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-white/28">
                  Evidence loop / live
                </span>
              </div>
              <div className="relative z-10 mt-10 grid grid-cols-3 gap-2" aria-hidden>
                {['Captured', 'Verified', 'Released'].map((step, index) => (
                  <div
                    key={step}
                    className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-3"
                  >
                    <span
                      className={
                        index === 2
                          ? 'block h-1 w-8 rounded-full bg-signal'
                          : 'block h-1 w-8 rounded-full bg-white/28'
                      }
                    />
                    <span className="mt-3 block font-mono text-[0.5rem] uppercase tracking-[0.08em] text-white/38">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
              <h2 className="relative z-10 mt-auto pt-12 text-[clamp(2rem,3.4vw,2.75rem)] font-medium leading-[1.04] tracking-[-0.04em]">
                Evidence creates momentum.
              </h2>
              <p className="relative z-10 mt-5 text-sm leading-6 text-white/48">
                Teams act faster because the system makes the next safe decision obvious.
              </p>
            </article>
          </Reveal>

          <Reveal className="mt-24">
            <MetricBand items={outcomes} />
          </Reveal>
        </div>
      </section>

      <section className="section-grid border-y border-border-subtle py-24 sm:py-32">
        <div className="container">
          <Reveal className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
            <h2 className="text-[clamp(2.35rem,3.6vw,3rem)] font-medium leading-[1.02] tracking-[-0.04em]">
              One system. Three focused experiences.
            </h2>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              Each person gets the depth they need without carrying the complexity of everyone
              else&apos;s workflow.
            </p>
          </Reveal>
          <StaggerGroup className="mt-16 grid gap-px overflow-hidden rounded-[18px] border border-border-strong bg-border-subtle lg:grid-cols-3">
            {personas.map((persona) => (
              <StaggerItem key={persona.title} className="h-full">
                <article className="plate plate-lit group flex h-full min-h-[320px] flex-col p-7 transition-[background-color,transform] duration-300 ease-out-expo hover:bg-[#121212] lg:hover:-translate-y-0.5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-brand/25 bg-brand/10 text-brand">
                    <persona.icon className="h-4 w-4" />
                  </span>
                  <p className="mt-12 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-subtle">
                    {persona.label}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
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

      <section className="relative overflow-hidden bg-[#080808] py-28 sm:py-40">
        <AmbientLines variant="routes" className="opacity-30" />
        <div className="container relative text-center">
          <Reveal className="mx-auto max-w-4xl">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-signal">
              Built for the next production run
            </p>
            <h2 className="mt-8 text-balance text-[clamp(3rem,5.3vw,4rem)] font-medium leading-[1] tracking-[-0.045em]">
              Bring the whole network into focus.
            </h2>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-semibold text-primary-foreground"
              >
                Open GRID-X <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/partner/login"
                className="inline-flex h-12 items-center justify-center rounded-full border border-border-strong bg-surface px-7 text-sm font-semibold"
              >
                Partner log in
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Gauge,
  Languages,
  Smartphone,
  Wallet,
  WifiOff,
} from 'lucide-react';

import { AmbientLines } from '@/components/marketing/ambient-lines';
import {
  Eyebrow,
  FeatureBand,
  MetricBand,
  MiniRow,
  MiniSurface,
  Statement,
} from '@/components/marketing/primitives';
import { QuoteBand, type Quote } from '@/components/marketing/quote-band';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion';

export const metadata: Metadata = {
  title: 'Partner network',
  description:
    'How MSME manufacturing partners join the OSWAR network, what the partner app gives them, and how their scorecard and payments work.',
};

/**
 * The partner page.
 *
 * The audience here is a partner unit owner, not a head-office buyer — so the argument is about
 * what they get, in their terms: clearer instructions, a phone that works on their network, and a
 * payment they can predict. The scorecard is presented honestly as a two-way instrument rather
 * than as surveillance, because that is what makes it credible.
 */

const benefits = [
  {
    icon: <Smartphone />,
    title: 'Runs on your phone',
    detail: 'Install from the browser — no app store, no laptop, no IT project.',
  },
  {
    icon: <WifiOff />,
    title: 'Works on weak signal',
    detail: 'Milestones save on the handset and sync when the network comes back.',
  },
  {
    icon: <Wallet />,
    title: 'Clear payments',
    detail: 'Accepted quantity, deductions, invoice status and payment date, all visible.',
  },
  {
    icon: <Gauge />,
    title: 'Know your score',
    detail: 'Quality, delivery, material and responsiveness, updated as the work happens.',
  },
  {
    icon: <Languages />,
    title: 'In your language',
    detail: 'The whole partner surface runs in English or Hindi.',
  },
];

const steps = [
  {
    step: '01',
    title: 'Registration',
    detail: 'Business, Udyam, GST and bank details captured once, then reused everywhere.',
  },
  {
    step: '02',
    title: 'Capability declaration',
    detail: 'The processes, sizes, tolerances, machines and manpower you actually hold.',
  },
  {
    step: '03',
    title: 'Audit',
    detail: 'A capability, quality system, safety and housekeeping assessment on site.',
  },
  {
    step: '04',
    title: 'Trial order',
    detail: 'A first job with first-article approval before anything scales up.',
  },
  {
    step: '05',
    title: 'Approval',
    detail: 'Trial approved, approved, certified or strategic — and it can move up.',
  },
];

const scorecard = [
  { value: '7', label: 'KPIs on every scorecard, each one visible to you' },
  { value: 'Monthly', label: 'Category review, with the underlying jobs listed' },
  { value: '0', label: 'Deductions without a recorded reason behind them' },
  { value: '2 apps', label: 'Partner and inspector, both built for the floor' },
];

const promises = [
  {
    title: 'The right drawing, every time',
    detail:
      'You only ever receive a released revision. When it is superseded the old one locks, so nobody on your floor is quietly working to last month’s print.',
    visual: (
      <MiniSurface title="DRG-4471 / Rev C">
        <MiniRow label="Released to you" meta="09:12" tone="success" />
        <MiniRow label="Acknowledged" meta="09:41" tone="success" />
        <MiniRow label="Rev B" meta="locked" tone="warning" />
      </MiniSurface>
    ),
  },
  {
    title: 'Material you are not blamed for',
    detail:
      'You acknowledge the weight that actually arrived, not the weight on the challan. Shortage and damage are recorded at receipt, where they belong, instead of surfacing at reconciliation.',
    visual: (
      <MiniSurface title="Challan CH-8842">
        <MiniRow label="Issued weight" meta="1,240 kg" />
        <MiniRow label="You received" meta="1,232 kg" tone="warning" />
        <MiniRow label="Recorded at receipt" meta="logged" tone="success" />
      </MiniSurface>
    ),
  },
  {
    title: 'Payment you can predict',
    detail:
      'Invoices are built from accepted quantity at the rate in force on the day. Every deduction carries the inspection or reconciliation record that caused it, so there is something to point at.',
    visual: (
      <MiniSurface title="INV-1187">
        <MiniRow label="Accepted quantity" meta="480 pcs" tone="success" />
        <MiniRow label="Deduction — shortage" meta="₹1,120" tone="warning" />
        <MiniRow label="Scheduled" meta="12 Sep" tone="success" />
      </MiniSurface>
    ),
  },
];

const quotes: [Quote, Quote] = [
  {
    quote:
      'We know what we are being paid for before we raise the invoice. That was never true before.',
    name: 'Unit owner',
    role: 'Precision Auto Components',
    initials: 'PA',
  },
  {
    quote:
      'The weight we actually received is what gets recorded. We are not arguing about eight kilograms a month later.',
    name: 'Works manager',
    role: 'Shakti Engineering Works',
    initials: 'SE',
  },
];

export default function PartnersPage(): React.JSX.Element {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border-subtle bg-[#080808] py-24 sm:py-32">
        <AmbientLines variant="routes" className="opacity-30" />
        <div className="container relative">
          <Reveal className="max-w-4xl">
            <Eyebrow>For partner units</Eyebrow>
            <Statement
              as="h1"
              className="mt-7"
              lead="More work, clearer instructions, faster payment."
              trail="The same information the head office has — on the phone already in your pocket."
            />
            <p className="mt-8 max-w-2xl text-[1.0625rem] leading-relaxed text-muted-foreground">
              Partner units carry the risk of an unclear drawing, a disputed weight and a late
              payment. GRID-X removes all three by making the record shared rather than
              head-office-only.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/partner/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Open the partner app <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#onboarding"
                className="inline-flex h-12 items-center justify-center rounded-full border border-border-strong bg-surface px-7 text-sm font-semibold transition-colors hover:bg-surface-hover"
              >
                How onboarding works
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <FeatureBand items={benefits} />

      <section className="section-graphite border-b border-border-subtle py-24 sm:py-32">
        <div className="container">
          <Reveal className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
            <h2 className="type-hero">What you get</h2>
            <p className="max-w-2xl text-[clamp(1.125rem,1.8vw,1.5rem)] leading-[1.45] tracking-[-0.025em] text-muted-foreground">
              Three things that decide whether a job is worth taking — and what GRID-X does about
              each of them.
            </p>
          </Reveal>

          <div className="mt-20 space-y-px overflow-hidden rounded-[18px] border border-border-strong bg-border-subtle">
            {promises.map((promise) => (
              <article key={promise.title} className="bg-[#0d0d0d] p-7 sm:p-10">
                <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
                  <div>
                    <h3 className="font-display text-[clamp(1.5rem,2.6vw,2.125rem)] font-medium leading-[1.08] tracking-[-0.04em]">
                      {promise.title}
                    </h3>
                    <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-muted-foreground">
                      {promise.detail}
                    </p>
                  </div>
                  <div>{promise.visual}</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="onboarding"
        className="scroll-mt-24 border-b border-border-subtle bg-[#080808] py-24 sm:py-32"
      >
        <div className="container">
          <Reveal className="max-w-3xl">
            <Eyebrow>Onboarding</Eyebrow>
            <Statement
              className="mt-7"
              lead="Five steps, and you know where you are in all of them."
              trail="Nothing about the process is decided in a room you are not in."
            />
          </Reveal>

          <StaggerGroup className="mt-16 grid gap-px overflow-hidden rounded-[18px] border border-border-strong bg-border-subtle md:grid-cols-3 lg:grid-cols-5">
            {steps.map((step) => (
              <StaggerItem key={step.title} className="h-full">
                <div className="flex h-full min-h-[220px] flex-col bg-[#0d0d0d] p-6">
                  <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-brand">
                    {step.step}
                  </span>
                  <p className="mt-8 font-display text-lg font-medium leading-snug tracking-[-0.03em]">
                    {step.title}
                  </p>
                  <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <section
        id="scorecards"
        className="section-grid scroll-mt-24 border-b border-border-subtle py-24 sm:py-32"
      >
        <div className="container">
          <Reveal className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-20">
            <div>
              <Eyebrow>Scorecards</Eyebrow>
              <Statement
                className="mt-7"
                lead="Scored on what you can see."
                trail="Every KPI traces back to jobs you can open."
              />
              <p className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-muted-foreground">
                A scorecard that only the buyer can see is a threat. One you can open, argue with
                and improve is a tool. Yours shows the same seven numbers the allocation engine
                reads when it decides who gets the next job — so improving them is worth something
                concrete.
              </p>
            </div>
            <MiniSurface title="Your scorecard" className="self-start">
              <MiniRow label="Quality" meta="96" tone="success" />
              <MiniRow label="Delivery" meta="91" tone="success" />
              <MiniRow label="Material efficiency" meta="88" tone="success" />
              <MiniRow label="Responsiveness" meta="74" tone="warning" />
              <MiniRow label="Category" meta="Certified" tone="success" />
            </MiniSurface>
          </Reveal>

          <Reveal className="mt-20">
            <MetricBand items={scorecard} />
          </Reveal>
        </div>
      </section>

      <section className="border-b border-border-subtle bg-[#080808] py-24 sm:py-32">
        <div className="container">
          <Reveal>
            <QuoteBand
              quotes={quotes}
              footnote="Partner units across the OSWAR network, on the phones they already carry."
              action={{ label: 'See the product', href: '/platform' }}
            />
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#080808] py-28 sm:py-36">
        <AmbientLines variant="routes" className="opacity-30" />
        <div className="container relative text-center">
          <Reveal className="mx-auto max-w-4xl">
            <p className="inline-flex items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-signal">
              <BadgeCheck className="h-3.5 w-3.5" /> Already an OSWAR partner?
            </p>
            <h2 className="mt-8 text-balance font-display text-[clamp(2.5rem,4.8vw,4rem)] font-medium leading-[1] tracking-[-0.045em]">
              Sign in and see today’s work.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-muted-foreground">
              Use the mobile number registered with OSWAR. New jobs, drawings, material and payment
              status are all on the first screen.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/partner/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Open the partner app <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/platform"
                className="inline-flex h-12 items-center justify-center rounded-full border border-border-strong bg-surface px-7 text-sm font-semibold transition-colors hover:bg-surface-hover"
              >
                See the product
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

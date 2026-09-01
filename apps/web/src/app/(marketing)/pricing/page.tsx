import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

import { AmbientLines } from '@/components/marketing/ambient-lines';
import { DisclosureList, type DisclosureItem } from '@/components/marketing/disclosure-list';
import { Eyebrow, MetricBand, Statement } from '@/components/marketing/primitives';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'How GRID-X rolls out: prove the controlled flow on one plant first, then extend into capacity, logistics, tooling and the wider group.',
};

/**
 * The rollout page.
 *
 * This is not a self-serve product with a card form, so pricing is presented as what it actually
 * is — a sequenced rollout. Each stage names what has to be working before the next one is worth
 * starting, which is the honest version of a pricing table for a platform of this shape.
 */

const tiers = [
  {
    name: 'Pilot',
    price: 'MVP rollout',
    description: 'One company, one plant and the first cohort of partner units.',
    gate: 'Ends when a job can go out and come back without leaving the system.',
    features: [
      'Users, roles and partner onboarding',
      'Components, drawings and revision control',
      'Jobs, material issue and milestones',
      'Inspection, rework and job closure',
      'Basic invoice and payment status',
      'Partner scorecard and management dashboard',
    ],
  },
  {
    name: 'Network',
    price: 'Full platform',
    highlight: true,
    description: 'The complete blueprint across every module and every partner.',
    gate: 'Ends when allocation, reconciliation and payment all run unattended.',
    features: [
      'Everything in Pilot',
      'Capacity planning and allocation scoring',
      'Material reconciliation and deductions',
      'Logistics, shipments and proof of delivery',
      'Tooling, fixtures, gauges and calibration',
      'All seventeen standard reports with CSV export',
      'IMS integration boundary',
    ],
  },
  {
    name: 'Group',
    price: 'Multi-company',
    description: 'Oswal Engineers, OSWAR Rotocorp and future group companies together.',
    gate: 'Ends when every plant reads the same numbers without a consolidation step.',
    features: [
      'Everything in Network',
      'Multi-company and multi-plant separation',
      'Group-level management dashboards',
      'Consolidated partner concentration analysis',
      'Dedicated audit and retention configuration',
    ],
  },
];

const sequencing = [
  { value: '3', label: 'Stages, each with a working system at the end of it' },
  { value: '14', label: 'Modules, delivered in the order the work moves' },
  { value: '1 plant', label: 'Proves the flow before the network scales onto it' },
  { value: '17', label: 'Standard reports, live by the end of stage two' },
];

const questions: DisclosureItem[] = [
  {
    title: 'Why is this sequenced rather than priced per seat?',
    detail:
      'The value of GRID-X is a controlled flow, and a half-built flow controls nothing. Each stage is scoped so that the system is genuinely usable at the end of it, rather than becoming useful only once everything ships.',
  },
  {
    title: 'What has to be true before stage two starts?',
    detail:
      'A job issued in GRID-X reaches a partner with a released drawing, comes back inspected, and gets invoiced from accepted quantity — without anyone maintaining a parallel spreadsheet.',
  },
  {
    title: 'Do partner units pay anything?',
    detail:
      'No. The partner app is part of the platform. Partner units need a browser and a phone; there is no licence, no store install and no hardware to buy.',
  },
  {
    title: 'What happens to the data already in spreadsheets?',
    detail:
      'Components, items, partners and rate cards load through the bulk import, which validates per row and reports what it rejected rather than failing the whole file.',
  },
  {
    title: 'How does this sit alongside IMS?',
    detail:
      'IMS stays the system of record for internal inventory and in-house manufacturing. GRID-X owns the external distributed manufacturing record and pulls work orders across the boundary.',
  },
  {
    title: 'Can a stage be reordered?',
    detail:
      'Within limits. Logistics and tooling can move earlier if the operation needs them, but drawing control and material custody have to land first — everything downstream depends on the record they create.',
  },
];

export default function PricingPage(): React.JSX.Element {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border-subtle bg-[#080808] py-24 sm:py-32">
        <AmbientLines variant="routes" className="opacity-30" />
        <div className="container relative">
          <Reveal className="max-w-4xl">
            <Eyebrow>Rollout</Eyebrow>
            <Statement
              as="h1"
              className="mt-7"
              lead="Start with one plant. Scale to the whole group."
              trail="Delivery is sequenced deliberately — prove the controlled flow first, then extend it."
            />
            <p className="mt-8 max-w-2xl text-[1.0625rem] leading-relaxed text-muted-foreground">
              A platform that governs drawings, material and payments is not something to switch on
              everywhere at once. Each stage ends with a system that works on its own terms.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Open GRID-X <ArrowRight className="h-4 w-4" />
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

      <section className="section-graphite border-b border-border-subtle py-24 sm:py-32">
        <div className="container">
          <Reveal className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
            <h2 className="type-hero">The stages</h2>
            <p className="max-w-2xl text-[clamp(1.25rem,2.2vw,1.75rem)] leading-[1.4] tracking-[-0.03em] text-muted-foreground">
              Each one names what has to be working before the next is worth starting.
            </p>
          </Reveal>

          <StaggerGroup className="mt-20 grid gap-px overflow-hidden rounded-[18px] border border-border-strong bg-border-subtle lg:grid-cols-3">
            {tiers.map((tier) => (
              <StaggerItem key={tier.name} className="h-full">
                <article
                  className={cn(
                    'flex h-full flex-col p-7 sm:p-8',
                    tier.highlight ? 'bg-[#121212]' : 'bg-[#0d0d0d]',
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="type-label">{tier.name}</span>
                    {tier.highlight ? (
                      <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-brand">
                        Recommended
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-6 font-display text-[1.75rem] font-medium leading-none tracking-[-0.04em]">
                    {tier.price}
                  </p>
                  <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
                    {tier.description}
                  </p>

                  <ul className="mt-7 space-y-2.5 border-t border-border-subtle pt-6">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex gap-2.5 text-[0.8125rem] leading-relaxed text-muted-foreground"
                      >
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-auto border-t border-border-subtle pt-6 text-[0.8125rem] leading-relaxed text-subtle">
                    {tier.gate}
                  </p>
                </article>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <section className="border-b border-border-subtle bg-[#080808] py-24 sm:py-32">
        <div className="container">
          <Reveal className="max-w-3xl">
            <Eyebrow>Sequencing</Eyebrow>
            <Statement
              className="mt-7"
              lead="No stage ends in a half-built system."
              trail="Each one is usable on the day it lands."
            />
          </Reveal>
          <Reveal className="mt-16">
            <MetricBand items={sequencing} />
          </Reveal>
        </div>
      </section>

      <section className="section-grid border-b border-border-subtle py-24 sm:py-32">
        <div className="container">
          <Reveal>
            <DisclosureList label="Common questions" items={questions} />
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#080808] py-28 sm:py-36">
        <AmbientLines variant="routes" className="opacity-30" />
        <div className="container relative text-center">
          <Reveal className="mx-auto max-w-4xl">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-signal">
              One plant, then the network
            </p>
            <h2 className="mt-8 text-balance font-display text-[clamp(2.5rem,6vw,5rem)] font-medium leading-[0.96] tracking-[-0.06em]">
              Start where the flow is provable.
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

import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  ClipboardList,
  FileLock2,
  Gauge,
  Layers,
  ShieldCheck,
  Truck,
  Wallet,
  WifiOff,
} from 'lucide-react';

import { AppPreview } from '@/components/marketing/app-preview';
import { SectionHeading, SectionLabel } from '@/components/marketing/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const capabilities = [
  {
    icon: ClipboardList,
    title: 'Job planning & allocation',
    description:
      'Convert demand into jobs, score partners on capability, capacity, quality and distance, then allocate with a full audit trail.',
  },
  {
    icon: FileLock2,
    title: 'Drawing revision control',
    description:
      'Only released revisions reach partners. Every view, download and acknowledgement is logged against the job.',
  },
  {
    icon: Boxes,
    title: 'Material traceability',
    description:
      'Issue against challan, capture partner acknowledgement, track consumption and scrap, and reconcile weight before payment.',
  },
  {
    icon: ShieldCheck,
    title: 'Quality & rejection control',
    description:
      'First article approval, sampling plans, measured characteristics, rejection, rework orders and corrective actions.',
  },
  {
    icon: Wallet,
    title: 'Payment on accepted quantity',
    description:
      'Invoices are payable only after quantity, quality and material reconciliation checks pass — deductions included.',
  },
  {
    icon: Truck,
    title: 'Logistics & shipments',
    description:
      'Plan pickups and deliveries, track vehicles and capture proof of delivery from either side of the network.',
  },
];

const workflow = [
  { step: '01', title: 'Job issued', detail: 'Component, quantity, revision, due date and rate locked to a partner.' },
  { step: '02', title: 'Material issued', detail: 'Challan raised, weight recorded, partner acknowledges on mobile.' },
  { step: '03', title: 'Production tracked', detail: 'Milestones and delays reported from the shop floor, even offline.' },
  { step: '04', title: 'Quality verified', detail: 'First article, in-process and final inspection with measured results.' },
  { step: '05', title: 'Material reconciled', detail: 'Issued versus consumed, scrap returned and shortages deducted.' },
  { step: '06', title: 'Payment approved', detail: 'Accepted quantity only, with finance approval and payment ageing.' },
];

const outcomes = [
  { value: '1 system', label: 'Replaces calls, WhatsApp and spreadsheets' },
  { value: '100%', label: 'Drawing access logged and revision controlled' },
  { value: '0', label: 'Payments without accepted quantity' },
  { value: '360°', label: 'Partner scorecards across 7 KPIs' },
];

const personas = [
  {
    title: 'GRID-X Control',
    audience: 'For OSWAR operations, engineering, quality and finance',
    points: ['Allocation & capacity boards', 'Drawing and revision control', 'Inspection and payment approvals'],
    href: '/login',
    cta: 'Sign in to Control',
    icon: Layers,
  },
  {
    title: 'GRID-X Partner',
    audience: 'Mobile-first PWA for MSME partner units',
    points: ['Accept jobs and view instructions', 'Update milestones offline', 'Raise invoices and track payments'],
    href: '/partner/login',
    cta: 'Open partner app',
    icon: Gauge,
  },
  {
    title: 'GRID-X Inspector',
    audience: 'For quality inspectors on the move',
    points: ['Inspection queue with plans', 'Record measured characteristics', 'Raise rejections and rework'],
    href: '/login',
    cta: 'Inspector sign in',
    icon: BadgeCheck,
  },
];

export default function MarketingHomePage(): React.JSX.Element {
  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-0 grid-pattern radial-fade opacity-60" aria-hidden />
        <div
          className="pointer-events-none absolute left-1/2 top-[-18rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <div className="container relative py-24 sm:py-32">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            <Badge variant="outline" className="gap-2 border-border bg-background/70 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Built for OSWAR&apos;s distributed manufacturing network
            </Badge>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
              The operating system for
              <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
                {' '}
                distributed manufacturing
              </span>
            </h1>
            <p className="text-balance text-lg text-muted-foreground sm:text-xl">
              GRID-X turns a network of MSME partners into one controlled factory: jobs issued with the
              right revision, material tracked to the kilogram, quality verified before acceptance and
              payment released only on accepted quantity.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/login">
                  Sign in to GRID-X <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/platform">Explore the platform</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Partner units sign in with their mobile number — no laptop required.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-5xl animate-fade-up">
            <AppPreview />
          </div>
        </div>
      </section>

      <section className="border-b bg-secondary/30">
        <div className="container grid gap-8 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {outcomes.map((outcome) => (
            <div key={outcome.label} className="space-y-1">
              <p className="text-3xl font-semibold tracking-tight">{outcome.value}</p>
              <p className="text-sm text-muted-foreground">{outcome.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="capabilities" className="border-b py-24">
        <div className="container space-y-14">
          <SectionHeading
            label="One system, every module"
            title="Everything the network needs, nothing it can bypass"
            description="Each module enforces the rules that phone calls and spreadsheets cannot: approved capability, released revisions, reconciled material and verified quality."
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((capability) => (
              <Card key={capability.title} className="group transition-shadow hover:shadow-elevated">
                <CardContent className="space-y-3 p-6">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <capability.icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-base font-semibold">{capability.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{capability.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b bg-secondary/30 py-24">
        <div className="container grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <SectionHeading
            align="left"
            label="The central transaction"
            title="One controlled flow from job issue to payment"
            description="GRID-X refuses to let a step be skipped. Nothing moves forward until the previous gate is satisfied and recorded."
          />
          <ol className="grid gap-4 sm:grid-cols-2">
            {workflow.map((item) => (
              <li key={item.step} className="rounded-xl border bg-card p-5 shadow-subtle">
                <p className="text-xs font-semibold text-primary">{item.step}</p>
                <p className="mt-2 font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b py-24">
        <div className="container space-y-14">
          <SectionHeading
            label="Three experiences"
            title="Purpose-built for every person in the chain"
            description="Office teams get depth. Partner units get a mobile app that works on a weak signal. Inspectors get a focused queue."
          />
          <div className="grid gap-6 lg:grid-cols-3">
            {personas.map((persona) => (
              <Card key={persona.title} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-4 p-6">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <persona.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold">{persona.title}</h3>
                    <p className="text-sm text-muted-foreground">{persona.audience}</p>
                  </div>
                  <ul className="flex-1 space-y-2 text-sm text-muted-foreground">
                    {persona.points.map((point) => (
                      <li key={point} className="flex items-start gap-2">
                        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" asChild>
                    <Link href={persona.href}>
                      {persona.cta} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b bg-secondary/30 py-24">
        <div className="container grid gap-10 lg:grid-cols-3">
          <div className="space-y-4">
            <SectionLabel>Designed for Indian shop floors</SectionLabel>
            <h2 className="text-3xl font-semibold tracking-tight">Works where the work happens</h2>
            <p className="text-muted-foreground">
              Partner units run on entry-level Android phones with patchy connectivity. GRID-X is built
              for exactly that reality.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:col-span-2">
            {[
              {
                icon: WifiOff,
                title: 'Offline-tolerant',
                detail:
                  'Open jobs stay visible, milestones save locally and photos queue for automatic upload once the signal returns.',
              },
              {
                icon: Gauge,
                title: 'Low bandwidth',
                detail: 'Compressed drawing previews and lean payloads keep the app usable on 2G.',
              },
              {
                icon: BarChart3,
                title: 'Hindi & English',
                detail: 'Partner screens speak the language of the operator, not the head office.',
              },
              {
                icon: ShieldCheck,
                title: 'Audited by default',
                detail: 'Every drawing view, quality decision and payment approval is permanently recorded.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border bg-card p-6 shadow-subtle">
                <item.icon className="h-5 w-5 text-primary" />
                <p className="mt-3 font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container">
          <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary to-indigo-500 px-8 py-16 text-center text-primary-foreground shadow-glow">
            <div className="pointer-events-none absolute inset-0 grid-pattern opacity-20" aria-hidden />
            <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5">
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Bring your whole partner network into one system
              </h2>
              <p className="text-balance text-lg text-primary-foreground/85">
                Controlled drawings, allocated jobs, reconciled material, verified quality and audited
                payments — from the first trial order to a certified strategic partner.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/login">Sign in to GRID-X</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                  asChild
                >
                  <Link href="/partner/login">Partner sign in</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

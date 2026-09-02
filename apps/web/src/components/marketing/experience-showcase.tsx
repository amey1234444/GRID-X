'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Check,
  CircleDot,
  ClipboardCheck,
  Layers,
  Signal,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const experiences = [
  {
    id: 'control',
    index: '01',
    title: 'GRID-X Control',
    label: 'Operations, engineering, quality and finance',
    detail: 'The command layer for allocation, release, inspection and payment.',
    href: '/login',
    action: 'Open Control',
    icon: Layers,
  },
  {
    id: 'partner',
    index: '02',
    title: 'GRID-X Partner',
    label: 'MSME manufacturing units',
    detail: 'A mobile-first work queue for jobs, drawings, milestones and invoices.',
    href: '/partner/login',
    action: 'Open Partner',
    icon: Boxes,
  },
  {
    id: 'inspector',
    index: '03',
    title: 'GRID-X Inspector',
    label: 'Quality teams in the field',
    detail: 'Plans, measurements, evidence and rework decisions in one focused flow.',
    href: '/login',
    action: 'Open Inspector',
    icon: BadgeCheck,
  },
] as const;

function ControlSurface(): React.JSX.Element {
  return (
    <div className="experience-screen min-h-[430px] overflow-hidden rounded-[16px] border border-white/[0.09] bg-[#090909]">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
        <span className="text-xs font-medium">Network command</span>
        <span className="flex items-center gap-2 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> 24 / 26 online
        </span>
      </div>
      <div className="p-5 sm:p-7">
        <p className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-white/28">
          Monday / live operation
        </p>
        <h3 className="mt-3 text-xl font-medium tracking-[-0.035em]">
          Operations are running within plan.
        </h3>
        <div className="mt-6 grid grid-cols-3 gap-2">
          {[
            ['38', 'Live jobs'],
            ['94.2%', 'On-time'],
            ['98.6%', 'Acceptance'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
              <p className="text-lg font-semibold tracking-[-0.04em] sm:text-2xl">{value}</p>
              <p className="mt-1 text-[0.5625rem] text-white/32">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[0.6875rem] font-medium">Production velocity</span>
            <span className="font-mono text-[0.5rem] text-success">+12.8%</span>
          </div>
          <svg viewBox="0 0 480 100" className="mt-4 h-24 w-full" aria-hidden>
            <defs>
              <linearGradient id="control-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="white" stopOpacity="0.2" />
                <stop offset="1" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 82 C55 76 70 60 120 68 S190 38 240 48 S320 64 355 28 S430 30 480 12 L480 100 L0 100Z"
              fill="url(#control-area)"
            />
            <path
              d="M0 82 C55 76 70 60 120 68 S190 38 240 48 S320 64 355 28 S430 30 480 12"
              fill="none"
              stroke="white"
              strokeOpacity="0.78"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function PartnerSurface(): React.JSX.Element {
  return (
    <div className="experience-screen grid min-h-[430px] place-items-center overflow-hidden rounded-[16px] border border-white/[0.09] bg-[#090909] p-6">
      <div className="relative w-full max-w-[480px]">
        <div className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
        <div className="relative mx-auto w-[245px] rounded-[28px] border border-white/15 bg-[#111] p-2 shadow-[0_32px_80px_-30px_black]">
          <div className="overflow-hidden rounded-[21px] border border-white/[0.06] bg-[#090909]">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <div>
                <p className="text-[0.625rem] font-medium">JOB-0412</p>
                <p className="text-[0.5rem] text-white/28">Pump housing / Rev C</p>
              </div>
              <Signal className="h-3.5 w-3.5 text-signal" />
            </div>
            <div className="space-y-2 p-3">
              {[
                ['Drawing acknowledged', '09:41'],
                ['Material received', '1,240 kg'],
                ['First article', 'Ready now'],
                ['Progress photos', '3 queued'],
              ].map(([label, meta], index) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3"
                >
                  <span
                    className={
                      index < 2
                        ? 'grid h-5 w-5 place-items-center rounded-full bg-success/10 text-success'
                        : 'grid h-5 w-5 place-items-center rounded-full bg-white/[0.06] text-white/30'
                    }
                  >
                    {index < 2 ? <Check className="h-3 w-3" /> : <CircleDot className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0 flex-1 text-[0.5625rem] text-white/58">{label}</span>
                  <span className="font-mono text-[0.475rem] text-white/25">{meta}</span>
                </div>
              ))}
            </div>
            <div className="mx-3 mb-3 rounded-xl bg-white px-3 py-2.5 text-center text-[0.625rem] font-semibold text-black">
              Record first article
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InspectorSurface(): React.JSX.Element {
  return (
    <div className="experience-screen min-h-[430px] overflow-hidden rounded-[16px] border border-white/[0.09] bg-[#090909]">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-3.5 w-3.5 text-white/45" />
          <span className="text-xs font-medium">First article inspection</span>
        </div>
        <span className="rounded-full border border-warning/15 bg-warning/[0.04] px-2 py-1 font-mono text-[0.5rem] text-warning">
          3 / 4 checked
        </span>
      </div>
      <div className="p-5 sm:p-7">
        <div className="grid grid-cols-[1fr_auto_auto] border-b border-white/[0.07] pb-3 font-mono text-[0.5rem] uppercase tracking-[0.08em] text-white/25">
          <span>Characteristic</span>
          <span>Result</span>
          <span className="ml-6">State</span>
        </div>
        {[
          ['Bore diameter', '42.01 mm', 'Pass'],
          ['Face runout', '0.03 mm', 'Pass'],
          ['Surface finish', 'Ra 1.8', 'Pass'],
          ['Mounting pitch', 'Awaiting', 'Hold'],
        ].map(([label, result, state]) => (
          <div
            key={label}
            className="grid grid-cols-[1fr_auto_auto] items-center border-b border-white/[0.055] py-4 text-[0.6875rem]"
          >
            <span className="text-white/58">{label}</span>
            <span className="font-mono text-[0.5625rem] text-white/42">{result}</span>
            <span
              className={
                state === 'Pass'
                  ? 'ml-6 w-12 text-right text-success'
                  : 'ml-6 w-12 text-right text-warning'
              }
            >
              {state}
            </span>
          </div>
        ))}
        <div className="mt-6 flex gap-2">
          <span className="grid h-10 flex-1 place-items-center rounded-full border border-white/10 text-[0.6875rem] text-white/50">
            Place on hold
          </span>
          <span className="grid h-10 flex-1 place-items-center rounded-full bg-white text-[0.6875rem] font-semibold text-black">
            Accept inspection
          </span>
        </div>
      </div>
    </div>
  );
}

const surfaces = {
  control: <ControlSurface />,
  partner: <PartnerSurface />,
  inspector: <InspectorSurface />,
};

export function ExperienceShowcase(): React.JSX.Element {
  return (
    <Tabs
      defaultValue="control"
      orientation="vertical"
      className="grid gap-3 lg:grid-cols-[0.76fr_1.24fr]"
    >
      <TabsList className="flex h-auto flex-col gap-2 bg-transparent p-0">
        {experiences.map((experience) => {
          const Icon = experience.icon;
          return (
            <TabsTrigger
              key={experience.id}
              value={experience.id}
              className="experience-tab group h-auto w-full justify-start rounded-[16px] border border-white/[0.07] bg-white/[0.018] p-5 text-left text-white data-[state=active]:border-white/[0.14] data-[state=active]:bg-white/[0.045] sm:p-6"
            >
              <span className="flex w-full items-start gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/20 text-white/40 transition-colors group-data-[state=active]:border-signal/20 group-data-[state=active]:text-signal">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-base font-medium tracking-[-0.025em]">
                      {experience.title}
                    </span>
                    <span className="font-mono text-[0.5rem] tracking-[0.12em] text-white/22">
                      {experience.index}
                    </span>
                  </span>
                  <span className="mt-2 block font-mono text-[0.5rem] uppercase leading-4 tracking-[0.08em] text-white/28">
                    {experience.label}
                  </span>
                  <span className="mt-3 block text-[0.75rem] leading-5 text-white/42">
                    {experience.detail}
                  </span>
                </span>
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      <div className="min-w-0">
        {experiences.map((experience) => (
          <TabsContent key={experience.id} value={experience.id} className="m-0">
            {surfaces[experience.id]}
            <div className="mt-4 flex items-center justify-between px-1">
              <span className="font-mono text-[0.5rem] uppercase tracking-[0.1em] text-white/24">
                Role-specific surface
              </span>
              <Link
                href={experience.href}
                className="inline-flex items-center gap-2 text-xs font-medium text-white/65 hover:text-white"
              >
                {experience.action} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}

import type { LucideIcon } from 'lucide-react';
import {
  Check,
  CircleDot,
  DatabaseBackup,
  FileKey2,
  KeyRound,
  LockKeyhole,
  Network,
  ShieldCheck,
} from 'lucide-react';

import { cn } from '@/lib/utils';

import { StaggerGroup, StaggerItem } from '../motion';

export interface SecurityPostureItem {
  icon: React.ReactNode;
  title: string;
  detail: string;
}

export interface SecurityControlItem {
  icon: LucideIcon;
  title: string;
  lead: string;
  points: string[];
}

export function SecurityPostureFlow({
  items,
}: {
  items: SecurityPostureItem[];
}): React.JSX.Element {
  return (
    <div className="security-flow relative border-y border-border-subtle bg-[#080808] px-4 py-6 sm:px-7 lg:px-10">
      <div
        className="absolute left-[10%] right-[10%] top-[4.25rem] hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent lg:block"
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-[1500px] gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((item, index) => (
          <article
            key={item.title}
            className="group relative min-h-[230px] overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.018] p-5 transition-colors duration-300 hover:bg-white/[0.04]"
          >
            <div className="flex items-center justify-between">
              <span className="relative z-10 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-[#0b0b0b] text-white/52 transition-colors group-hover:border-signal/25 group-hover:text-signal [&_svg]:h-4 [&_svg]:w-4">
                {item.icon}
              </span>
              <span className="font-mono text-[0.5rem] tracking-[0.12em] text-white/22">
                0{index + 1}
              </span>
            </div>
            <div className="mt-12">
              <h2 className="text-[0.9375rem] font-medium tracking-[-0.025em]">{item.title}</h2>
              <p className="mt-3 text-[0.75rem] leading-6 text-white/38">{item.detail}</p>
            </div>
            <span
              className="absolute bottom-0 left-5 right-5 h-px origin-left scale-x-0 bg-signal transition-transform duration-500 ease-out-expo group-hover:scale-x-100"
              aria-hidden
            />
          </article>
        ))}
      </div>
    </div>
  );
}

function RoleMap(): React.JSX.Element {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-4">
      <div className="space-y-2">
        {['Partner worker', 'Inspector', 'Quality head'].map((role, index) => (
          <div
            key={role}
            className="flex items-center justify-between rounded-lg bg-white/[0.025] px-3 py-2"
          >
            <span className="text-[0.625rem] text-white/48">{role}</span>
            <span className="flex gap-1">
              {[0, 1, 2].map((permission) => (
                <span
                  key={permission}
                  className={cn(
                    'h-1.5 w-4 rounded-full',
                    permission <= index ? 'bg-success/70' : 'bg-white/10',
                  )}
                />
              ))}
            </span>
          </div>
        ))}
      </div>
      <div className="grid w-10 place-items-center rounded-lg border border-signal/15 bg-signal/[0.035]">
        <ShieldCheck className="h-4 w-4 text-signal" />
      </div>
    </div>
  );
}

function SessionMap(): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/20 p-4">
      {[
        ['Password', KeyRound],
        ['Argon2id', LockKeyhole],
        ['Short token', FileKey2],
      ].map(([label, Icon], index) => {
        const Component = Icon as LucideIcon;
        return (
          <div key={String(label)} className="contents">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 rounded-lg bg-white/[0.025] px-2 py-3 text-center">
              <Component className="h-3.5 w-3.5 text-white/45" />
              <span className="text-[0.5625rem] text-white/45">{String(label)}</span>
            </div>
            {index < 2 ? <span className="h-px w-4 bg-white/12" /> : null}
          </div>
        );
      })}
    </div>
  );
}

function DrawingMap(): React.JSX.Element {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.1em] text-white/30">
          DRG-4471
        </span>
        <span className="rounded-full border border-success/15 bg-success/[0.04] px-2 py-1 font-mono text-[0.5rem] text-success">
          REV C / LIVE
        </span>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="h-1.5 w-20 rounded-full bg-white/18" />
          <div className="mt-3 h-10 rounded border border-dashed border-white/10" />
        </div>
        <div className="grid w-20 place-items-center rounded-lg border border-warning/15 bg-warning/[0.035] text-center">
          <span className="font-mono text-[0.5rem] uppercase leading-4 text-warning">
            Grant
            <br />
            14 days
          </span>
        </div>
      </div>
    </div>
  );
}

function AuditMap(): React.JSX.Element {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
      {['Drawing opened', 'Material acknowledged', 'Inspection accepted'].map((event, index) => (
        <div
          key={event}
          className="grid grid-cols-[18px_1fr_auto] items-center gap-2 border-b border-white/[0.055] py-2.5 last:border-b-0"
        >
          <CircleDot className={cn('h-3 w-3', index === 2 ? 'text-signal' : 'text-success')} />
          <span className="text-[0.625rem] text-white/48">{event}</span>
          <span className="font-mono text-[0.5rem] text-white/24">09:{12 + index * 17}</span>
        </div>
      ))}
    </div>
  );
}

function InfrastructureMap(): React.JSX.Element {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/[0.07] bg-black/20 p-4">
      {[
        ['Primary', Network],
        ['Replica', DatabaseBackup],
        ['Restore', Check],
      ].map(([label, Icon], index) => {
        const Component = Icon as LucideIcon;
        return (
          <div
            key={String(label)}
            className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-3 text-center"
          >
            <Component
              className={cn('mx-auto h-3.5 w-3.5', index === 2 ? 'text-success' : 'text-white/42')}
            />
            <p className="mt-2 text-[0.5625rem] text-white/40">{String(label)}</p>
          </div>
        );
      })}
    </div>
  );
}

function BoundaryMap(): React.JSX.Element {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-4">
      <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-3 text-center">
        <p className="font-mono text-[0.5rem] uppercase tracking-[0.08em] text-white/26">Plant</p>
        <p className="mt-2 text-[0.625rem] font-medium">OSWAR</p>
      </div>
      <LockKeyhole className="h-4 w-4 text-signal" />
      <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-3 text-center">
        <p className="font-mono text-[0.5rem] uppercase tracking-[0.08em] text-white/26">Partner</p>
        <p className="mt-2 text-[0.625rem] font-medium">Own unit only</p>
      </div>
    </div>
  );
}

const visualMaps = [
  <RoleMap key="roles" />,
  <SessionMap key="sessions" />,
  <DrawingMap key="drawings" />,
  <AuditMap key="audit" />,
  <InfrastructureMap key="infra" />,
  <BoundaryMap key="boundary" />,
];

export function SecurityControlGrid({
  controls,
}: {
  controls: SecurityControlItem[];
}): React.JSX.Element {
  return (
    <StaggerGroup className="grid gap-3 lg:grid-cols-2">
      {controls.map((control, index) => (
        <StaggerItem key={control.title} className="h-full">
          <article className="plate plate-lit group flex h-full min-h-[450px] flex-col overflow-hidden rounded-[18px] border border-border-strong p-6 sm:p-8">
            <div className="flex items-start justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.09] bg-black/20 text-white/55 transition-colors group-hover:border-signal/20 group-hover:text-signal">
                <control.icon className="h-4 w-4" />
              </span>
              <span className="font-mono text-[0.5rem] tracking-[0.12em] text-white/22">
                CTRL / 0{index + 1}
              </span>
            </div>
            <h3 className="mt-8 font-display text-xl font-medium tracking-[-0.035em]">
              {control.title}
            </h3>
            <p className="mt-2.5 max-w-lg text-[0.875rem] leading-6 text-white/72">
              {control.lead}
            </p>
            <div className="mt-7">{visualMaps[index]}</div>
            <ul className="mt-auto grid gap-x-6 gap-y-2 border-t border-white/[0.07] pt-6 sm:grid-cols-2">
              {control.points.map((point) => (
                <li key={point} className="flex gap-2.5 text-[0.6875rem] leading-5 text-white/38">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/28" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </article>
        </StaggerItem>
      ))}
    </StaggerGroup>
  );
}

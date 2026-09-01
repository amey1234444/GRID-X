'use client';

import {
  CheckCircle2,
  CircleDot,
  FileLock2,
  Gauge,
  Languages,
  ScrollText,
  ShieldCheck,
  Signal,
  Smartphone,
  UploadCloud,
  WifiOff,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const capabilities = [
  {
    id: 'offline',
    index: '01',
    icon: WifiOff,
    title: 'Offline-tolerant',
    detail: 'Milestones and photos queue safely until the connection returns.',
  },
  {
    id: 'bandwidth',
    index: '02',
    icon: Gauge,
    title: 'Low bandwidth',
    detail: 'Lean data and compressed previews remain usable on weak mobile networks.',
  },
  {
    id: 'language',
    index: '03',
    icon: Languages,
    title: 'Hindi and English',
    detail: 'Partner workflows speak the language used on the shop floor.',
  },
  {
    id: 'audit',
    index: '04',
    icon: ScrollText,
    title: 'Audited by default',
    detail: 'Views, decisions, movements and approvals become permanent evidence.',
  },
  {
    id: 'roles',
    index: '05',
    icon: FileLock2,
    title: 'Role controlled',
    detail: 'Every user sees the right work, and authorisation is enforced server-side.',
  },
] as const;

function SurfaceHeader({ code, status }: { code: string; status: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
      <span className="font-mono text-[0.5625rem] uppercase tracking-[0.13em] text-white/38">
        {code}
      </span>
      <span className="flex items-center gap-2 font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-white/55">
        <span className="field-status-dot h-1.5 w-1.5 rounded-full bg-signal" />
        {status}
      </span>
    </div>
  );
}

function OfflineVisual(): React.JSX.Element {
  return (
    <div
      className="field-visual-grid relative min-h-[430px] overflow-hidden rounded-[16px] border border-white/[0.09] bg-[#0a0a0a]"
      role="img"
      aria-label="Milestones and photographs safely queued offline and synchronized when a signal returns"
    >
      <SurfaceHeader code="PARTNER APP / JOB-0412" status="Queue protected" />
      <div className="grid min-h-[370px] place-items-center p-6 sm:p-8">
        <div className="relative w-full max-w-[480px]">
          <div className="absolute left-[10%] right-[10%] top-1/2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <div className="relative mx-auto w-[230px] rounded-[28px] border border-white/15 bg-[#111] p-2 shadow-[0_32px_80px_-28px_rgba(0,0,0,1)]">
            <div className="overflow-hidden rounded-[21px] border border-white/[0.06] bg-[#090909]">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <span className="text-[0.6875rem] font-medium">Today&apos;s work</span>
                <WifiOff className="h-3.5 w-3.5 text-warning" />
              </div>
              <div className="space-y-2 p-3">
                {[
                  ['Milestone complete', 'Saved on device'],
                  ['Progress photograph', 'Compressed · 820 KB'],
                  ['Inspection note', 'Waiting to upload'],
                ].map(([label, meta], index) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'grid h-5 w-5 place-items-center rounded-full',
                          index < 2 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning',
                        )}
                      >
                        {index < 2 ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <CircleDot className="h-3 w-3" />
                        )}
                      </span>
                      <span className="text-[0.625rem] font-medium">{label}</span>
                    </div>
                    <p className="mt-2 pl-7 font-mono text-[0.5rem] uppercase tracking-[0.06em] text-white/30">
                      {meta}
                    </p>
                  </div>
                ))}
              </div>
              <div className="m-3 flex items-center gap-2 rounded-xl border border-signal/20 bg-signal/[0.055] px-3 py-2.5">
                <UploadCloud className="h-3.5 w-3.5 text-signal" />
                <span className="text-[0.5625rem] text-white/62">Sync resumes automatically</span>
              </div>
            </div>
          </div>
          <div className="absolute -left-1 top-16 hidden rounded-xl border border-white/10 bg-[#111]/95 px-3 py-2.5 shadow-2xl sm:block">
            <p className="font-mono text-[0.5rem] uppercase tracking-[0.1em] text-white/30">
              Local queue
            </p>
            <p className="mt-1 text-xs font-medium">3 actions protected</p>
          </div>
          <div className="absolute -right-1 bottom-16 hidden rounded-xl border border-success/20 bg-[#111]/95 px-3 py-2.5 shadow-2xl sm:block">
            <p className="font-mono text-[0.5rem] uppercase tracking-[0.1em] text-success">
              Signal returned
            </p>
            <p className="mt-1 text-xs font-medium">No duplicate writes</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BandwidthVisual(): React.JSX.Element {
  return (
    <div
      className="field-visual-grid min-h-[430px] overflow-hidden rounded-[16px] border border-white/[0.09] bg-[#0a0a0a]"
      role="img"
      aria-label="Compressed media and lean data packets remaining usable on a weak network"
    >
      <SurfaceHeader code="NETWORK / ADAPTIVE PAYLOAD" status="2G usable" />
      <div className="flex min-h-[370px] flex-col justify-between p-6 sm:p-8">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Preview', '84 KB', '−91%'],
            ['Form data', '3.2 KB', 'lean'],
            ['Retry cost', '0 writes', 'safe'],
          ].map(([label, value, delta]) => (
            <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
              <p className="font-mono text-[0.5rem] uppercase tracking-[0.1em] text-white/30">
                {label}
              </p>
              <p className="mt-5 text-2xl font-medium tracking-[-0.04em]">{value}</p>
              <p className="mt-1 text-[0.625rem] text-success">{delta}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-2xl border border-white/[0.08] bg-black/25 p-5">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[0.5rem] uppercase tracking-[0.1em] text-white/30">
                Live signal
              </p>
              <p className="mt-2 text-sm font-medium">Useful before perfect</p>
            </div>
            <span className="flex items-center gap-2 text-[0.625rem] text-warning">
              <Signal className="h-3.5 w-3.5" /> 146 kbps
            </span>
          </div>
          <svg className="mt-6 h-28 w-full" viewBox="0 0 620 112" aria-hidden>
            <path d="M0 88H620M0 56H620M0 24H620" stroke="rgba(255,255,255,.055)" />
            <path
              className="field-signal-path"
              d="M0 82C36 82 45 31 82 31s48 53 86 53 50-29 90-29 41 19 77 19 50-52 93-52 52 61 92 61 46-30 100-30"
              fill="none"
              stroke="rgba(255,255,255,.8)"
              strokeLinecap="round"
              strokeWidth="2"
            />
            <circle cx="618" cy="53" r="4" fill="hsl(var(--signal))" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function LanguageVisual(): React.JSX.Element {
  return (
    <div
      className="field-visual-grid min-h-[430px] overflow-hidden rounded-[16px] border border-white/[0.09] bg-[#0a0a0a]"
      role="img"
      aria-label="The same partner workflow displayed in Hindi and English"
    >
      <SurfaceHeader code="LANGUAGE / SHOP-FLOOR COPY" status="हिंदी + English" />
      <div className="grid min-h-[370px] gap-px bg-white/[0.07] sm:grid-cols-2">
        {[
          {
            lang: 'English',
            title: 'Record milestone',
            action: 'Take progress photo',
            status: 'Saved offline',
          },
          {
            lang: 'हिंदी',
            title: 'माइलस्टोन दर्ज करें',
            action: 'प्रगति की फोटो लें',
            status: 'ऑफ़लाइन सुरक्षित',
          },
        ].map((copy, index) => (
          <div key={copy.lang} className="flex flex-col bg-[#0b0b0b] p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.08em] text-white/50">
                {copy.lang}
              </span>
              {index === 1 ? <span className="h-1.5 w-1.5 rounded-full bg-signal" /> : null}
            </div>
            <div className="mt-12">
              <Smartphone className="h-5 w-5 text-white/55" />
              <p className="mt-5 text-xl font-medium tracking-[-0.035em]">{copy.title}</p>
              <p className="mt-2 text-sm text-white/42">JOB-00412 · Operation 30</p>
            </div>
            <div className="mt-auto space-y-2 pt-10">
              <div className="rounded-xl bg-white px-4 py-3 text-center text-xs font-semibold text-black">
                {copy.action}
              </div>
              <div className="flex items-center justify-center gap-2 text-[0.625rem] text-success">
                <CheckCircle2 className="h-3 w-3" /> {copy.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditVisual(): React.JSX.Element {
  const events = [
    ['09:12', 'Drawing Rev C released', 'Engineering'],
    ['09:41', 'Opened and acknowledged', 'Partner worker'],
    ['14:08', 'Material receipt confirmed', 'Stores'],
    ['16:22', 'Milestone submitted', 'Partner supervisor'],
  ];
  return (
    <div
      className="field-visual-grid min-h-[430px] overflow-hidden rounded-[16px] border border-white/[0.09] bg-[#0a0a0a]"
      role="img"
      aria-label="An immutable chronological audit trail connecting each event to a user and time"
    >
      <SurfaceHeader code="EVIDENCE / IMMUTABLE TRAIL" status="Recording" />
      <div className="p-6 sm:p-8">
        <div className="rounded-2xl border border-white/[0.08] bg-black/25">
          {events.map(([time, event, actor], index) => (
            <div
              key={event}
              className="grid grid-cols-[48px_18px_1fr] gap-3 border-b border-white/[0.06] px-4 py-5 last:border-b-0 sm:grid-cols-[64px_24px_1fr_auto] sm:px-6"
            >
              <span className="font-mono text-[0.625rem] tabular-nums text-white/34">{time}</span>
              <span className="relative flex justify-center">
                {index < events.length - 1 ? (
                  <span className="absolute left-1/2 top-3 h-[42px] w-px -translate-x-1/2 bg-white/10" />
                ) : null}
                <span
                  className={cn(
                    'relative mt-0.5 h-2 w-2 rounded-full',
                    index === events.length - 1 ? 'bg-signal' : 'bg-success',
                  )}
                />
              </span>
              <span className="text-[0.75rem] font-medium">{event}</span>
              <span className="col-start-3 text-[0.625rem] text-white/32 sm:col-auto">{actor}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-success/15 bg-success/[0.045] px-4 py-3">
          <ShieldCheck className="h-4 w-4 text-success" />
          <p className="text-[0.6875rem] text-white/55">
            Actor, device, time and state change stay attached to every write.
          </p>
        </div>
      </div>
    </div>
  );
}

function RolesVisual(): React.JSX.Element {
  const rows = [
    ['Partner worker', true, false, false],
    ['Inspector', true, true, false],
    ['Quality head', true, true, true],
  ];
  return (
    <div
      className="field-visual-grid min-h-[430px] overflow-hidden rounded-[16px] border border-white/[0.09] bg-[#0a0a0a]"
      role="img"
      aria-label="A server-enforced permission matrix for partner workers, inspectors, and quality heads"
    >
      <SurfaceHeader code="AUTHORIZATION / API POLICY" status="Server enforced" />
      <div className="p-6 sm:p-8">
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/25">
          <div className="grid grid-cols-[1.4fr_repeat(3,.65fr)] border-b border-white/[0.07] bg-white/[0.025] px-4 py-3 font-mono text-[0.5rem] uppercase tracking-[0.09em] text-white/32 sm:px-6">
            <span>Role</span>
            <span>View</span>
            <span>Record</span>
            <span>Approve</span>
          </div>
          {rows.map(([role, ...permissions]) => (
            <div
              key={String(role)}
              className="grid grid-cols-[1.4fr_repeat(3,.65fr)] items-center border-b border-white/[0.06] px-4 py-5 last:border-b-0 sm:px-6"
            >
              <span className="text-[0.75rem] font-medium">{role}</span>
              {permissions.map((allowed, index) => (
                <span key={index}>
                  {allowed ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <span className="block h-px w-3 bg-white/15" />
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
            <p className="font-mono text-[0.5rem] uppercase tracking-[0.1em] text-white/30">
              Request
            </p>
            <p className="mt-2 text-xs font-medium">POST /quality/deviation</p>
          </div>
          <div className="rounded-xl border border-signal/20 bg-signal/[0.045] p-4">
            <p className="font-mono text-[0.5rem] uppercase tracking-[0.1em] text-signal">
              Decision
            </p>
            <p className="mt-2 text-xs font-medium">Permission evaluated at API</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const visuals: Record<(typeof capabilities)[number]['id'], React.JSX.Element> = {
  offline: <OfflineVisual />,
  bandwidth: <BandwidthVisual />,
  language: <LanguageVisual />,
  audit: <AuditVisual />,
  roles: <RolesVisual />,
};

export function FieldReadinessShowcase(): React.JSX.Element {
  return (
    <Tabs
      defaultValue="offline"
      orientation="vertical"
      className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]"
    >
      <TabsList
        variant="segmented"
        aria-label="Shop-floor capabilities"
        className="grid !h-auto w-full gap-1 rounded-[18px] border border-white/[0.08] bg-[#0b0b0b] p-2 shadow-none"
      >
        <div className="flex items-center justify-between px-3 py-3">
          <span className="font-mono text-[0.5625rem] uppercase tracking-[0.13em] text-white/30">
            Field runtime
          </span>
          <span className="flex items-center gap-2 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Ready
          </span>
        </div>
        {capabilities.map((capability) => (
          <TabsTrigger
            key={capability.id}
            value={capability.id}
            className="group !h-auto w-full items-start justify-start gap-4 rounded-xl border border-transparent px-3 py-4 text-left data-[state=active]:border-white/[0.09] data-[state=active]:bg-white/[0.055]"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.09] bg-black/20 text-white/42 transition-colors group-data-[state=active]:border-signal/25 group-data-[state=active]:text-signal">
              <capability.icon className="!h-4 !w-4 !opacity-100" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-4">
                <span className="text-[0.8125rem] font-medium text-white/72 group-data-[state=active]:text-white">
                  {capability.title}
                </span>
                <span className="font-mono text-[0.5rem] tracking-[0.1em] text-white/22">
                  {capability.index}
                </span>
              </span>
              <span className="mt-1.5 block whitespace-normal text-[0.6875rem] leading-5 text-white/34 group-data-[state=active]:text-white/48">
                {capability.detail}
              </span>
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="min-w-0">
        {capabilities.map((capability) => (
          <TabsContent key={capability.id} value={capability.id} className="m-0">
            {visuals[capability.id]}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}

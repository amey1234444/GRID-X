import { CheckCircle2, FileStack, Scale, ShieldCheck } from 'lucide-react';

import { cn } from '@/lib/utils';

const figureCopy = [
  {
    label: 'Fig 0.1',
    title: 'One control layer',
    detail: 'A shared operational model replaces fragmented calls, sheets and private updates.',
  },
  {
    label: 'Fig 0.2',
    title: 'Every partner connected',
    detail: 'Plants and partner units work from the same released job, drawing and material state.',
  },
  {
    label: 'Fig 0.3',
    title: 'Evidence moves the work',
    detail:
      'Approvals advance only when the required quantity, quality and custody evidence exists.',
  },
];

function FigureGraphic({ index }: { index: number }): React.JSX.Element {
  if (index === 0) {
    return (
      <svg viewBox="0 0 280 230" className="h-full w-full" aria-hidden>
        {[0, 1, 2, 3].map((layer) => (
          <path
            key={layer}
            d={`M42 ${82 + layer * 20} 140 ${28 + layer * 20} 238 ${82 + layer * 20} 140 ${136 + layer * 20}Z`}
            fill={layer === 0 ? 'hsl(var(--brand) / .055)' : 'none'}
            stroke={layer === 0 ? 'hsl(var(--brand) / .62)' : 'hsl(var(--border-strong) / .78)'}
          />
        ))}
        <circle cx="140" cy="70" r="22" fill="none" stroke="hsl(var(--border-strong))" />
        <path d="M122 70h36M126 76h28" stroke="hsl(var(--signal) / .76)" />
      </svg>
    );
  }

  if (index === 1) {
    return (
      <svg viewBox="0 0 280 230" className="h-full w-full" aria-hidden>
        <path
          d="M140 38v52M140 90 79 128M140 90l61 38M79 128v55M201 128v55"
          stroke="hsl(var(--border-strong))"
        />
        {[
          [140, 38],
          [79, 128],
          [201, 128],
          [140, 176],
        ].map(([x, y], nodeIndex) => (
          <g key={`${x}-${y}`}>
            <rect
              x={x - 31}
              y={y - 23}
              width="62"
              height="46"
              rx="7"
              fill={nodeIndex === 0 ? 'hsl(var(--brand) / .1)' : '#0d0e11'}
              stroke={nodeIndex === 0 ? 'hsl(var(--brand) / .72)' : 'hsl(var(--border-strong))'}
            />
            <circle
              cx={x}
              cy={y}
              r="3"
              fill={nodeIndex === 3 ? 'hsl(var(--signal))' : 'hsl(var(--brand))'}
            />
          </g>
        ))}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 280 230" className="h-full w-full" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((layer) => (
        <path
          key={layer}
          d={`M42 ${174 - layer * 16}h88l28-31h80`}
          fill="none"
          stroke={layer === 3 ? 'hsl(var(--signal) / .82)' : 'hsl(var(--border-strong) / .78)'}
        />
      ))}
      <path d="m159 48 13 13 25-29" fill="none" stroke="hsl(var(--brand))" strokeWidth="2" />
      <circle cx="159" cy="48" r="31" fill="none" stroke="hsl(var(--brand) / .34)" />
    </svg>
  );
}

export function BlueprintFigures(): React.JSX.Element {
  return (
    <div className="grid border-y border-border-subtle lg:grid-cols-3">
      {figureCopy.map((figure, index) => (
        <article
          key={figure.label}
          className="group border-b border-border-subtle px-6 py-8 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0 xl:px-9"
        >
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-subtle">
            {figure.label}
          </p>
          <div className="mx-auto h-[250px] max-w-[320px] transition-transform duration-500 ease-out-expo group-hover:-translate-y-1">
            <FigureGraphic index={index} />
          </div>
          <h3 className="text-[0.9375rem] font-semibold tracking-[-0.02em]">{figure.title}</h3>
          <p className="mt-2 max-w-sm text-[0.875rem] leading-6 text-muted-foreground">
            {figure.detail}
          </p>
        </article>
      ))}
    </div>
  );
}

const timelineRows = [
  { label: 'Pump housing · JOB-412', start: 12, width: 48, tone: 'brand' },
  { label: 'Oven arm · JOB-408', start: 27, width: 61, tone: 'signal' },
  { label: 'Base frame · JOB-405', start: 6, width: 67, tone: 'brand' },
  { label: 'Bracket set · JOB-399', start: 42, width: 40, tone: 'success' },
] as const;

export function PlanningVisual(): React.JSX.Element {
  return (
    <div className="linear-frame relative overflow-hidden rounded-[18px] border border-border-strong">
      <div className="flex h-12 items-center border-b border-border-subtle px-5">
        <p className="text-[0.75rem] font-semibold">Network production plan</p>
        <div className="ml-auto flex items-center gap-2 font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-subtle">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal" /> Live capacity
        </div>
      </div>
      <div className="grid min-h-[420px] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="border-b border-border-subtle p-5 lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-6 border-b border-border-subtle pb-2 font-mono text-[0.5625rem] text-subtle">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="relative mt-3 space-y-5 py-2">
            <div className="pointer-events-none absolute inset-0 grid grid-cols-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <span key={index} className="border-r border-border-subtle/70 last:border-r-0" />
              ))}
            </div>
            {timelineRows.map((row) => (
              <div key={row.label} className="relative h-16">
                <p className="text-[0.6875rem] text-muted-foreground">{row.label}</p>
                <div className="relative mt-2 h-7 rounded-md border border-border bg-black/20">
                  <span
                    className={cn(
                      'absolute inset-y-1 rounded-[3px]',
                      row.tone === 'signal'
                        ? 'bg-signal/80'
                        : row.tone === 'success'
                          ? 'bg-success/70'
                          : 'bg-brand/75',
                    )}
                    style={{ left: `${row.start}%`, width: `${row.width}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative overflow-hidden p-5">
          <p className="text-[0.75rem] font-semibold">Partner capacity signal</p>
          <p className="mt-1 text-[0.625rem] text-subtle">Committed load vs. accepted output</p>
          <svg viewBox="0 0 360 250" className="mt-5 w-full" aria-hidden>
            {[40, 90, 140, 190, 240].map((y) => (
              <path key={y} d={`M0 ${y}H360`} stroke="hsl(var(--border-subtle))" />
            ))}
            <path
              d="M0 192H78l32-78h83l37 48h74l24-96h32"
              fill="none"
              stroke="hsl(var(--brand) / .72)"
              strokeWidth="1.5"
            />
            <path
              d="M0 216h102l28-54h98l35 29h97"
              fill="none"
              stroke="hsl(var(--signal) / .58)"
              strokeWidth="1"
            />
            {Array.from({ length: 32 }).map((_, index) => {
              const x = 18 + ((index * 79) % 330);
              const y = 35 + ((index * 47) % 185);
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r={index % 5 === 0 ? 3.5 : 2.5}
                  fill={index % 6 === 0 ? 'hsl(var(--signal) / .74)' : 'hsl(var(--brand) / .72)'}
                />
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

const evidenceRows = [
  { icon: FileStack, label: 'Drawing revision', value: 'Rev C · acknowledged', tone: 'brand' },
  { icon: Scale, label: 'Material custody', value: '1,226 / 1,240 kg', tone: 'signal' },
  { icon: ShieldCheck, label: 'Inspection plan', value: '18 / 18 accepted', tone: 'success' },
] as const;

export function EvidenceVisual(): React.JSX.Element {
  return (
    <div className="linear-frame overflow-hidden rounded-[18px] border border-border-strong p-2">
      <div className="rounded-xl border border-border-subtle bg-[#111216] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-brand">
              JOB-00412 / Release gate
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
              Evidence before movement.
            </h3>
          </div>
          <span className="hidden rounded-full border border-signal/30 bg-signal/10 px-3 py-1 text-[0.625rem] font-semibold text-signal sm:inline-flex">
            Gate 03 / 04
          </span>
        </div>

        <div className="mt-8 grid gap-3">
          {evidenceRows.map((row) => (
            <div
              key={row.label}
              className="grid items-center gap-4 rounded-xl border border-border bg-black/20 p-4 sm:grid-cols-[40px_1fr_auto]"
            >
              <span
                className={cn(
                  'grid h-10 w-10 place-items-center rounded-lg',
                  row.tone === 'signal'
                    ? 'bg-signal/10 text-signal'
                    : row.tone === 'success'
                      ? 'bg-success/10 text-success'
                      : 'bg-brand/10 text-brand',
                )}
              >
                <row.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[0.75rem] font-semibold">{row.label}</p>
                <p className="mt-1 text-[0.6875rem] text-subtle">Verified against the job record</p>
              </div>
              <div className="flex items-center gap-2 text-[0.6875rem] text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> {row.value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-brand/25 bg-brand/[0.07] px-4 py-3">
          <span className="text-[0.6875rem] text-muted-foreground">Next controlled action</span>
          <span className="text-[0.6875rem] font-semibold text-brand">Release for dispatch →</span>
        </div>
      </div>
    </div>
  );
}

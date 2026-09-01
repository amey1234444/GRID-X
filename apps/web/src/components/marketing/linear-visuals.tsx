import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  FileStack,
  Lock,
  Scale,
  ShieldCheck,
} from 'lucide-react';

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
              fill={nodeIndex === 0 ? 'hsl(var(--brand) / .1)' : '#0d0d0d'}
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

/**
 * The release gate.
 *
 * The earlier version of this panel gave all three rows the same "Verified
 * against the job record" line and a tick, and coloured each row differently for
 * variety — so it showed that checking happens without ever showing what is
 * checked, and the colour carried no meaning.
 *
 * A gate is a comparison, so each row now states the requirement and the
 * measurement against it, and the numbers sit in a mono column that lines up
 * down the panel — that alignment is what makes it read as an instrument rather
 * than as three cards. Colour is spent only on state: a row that needs a
 * decision is amber, everything else is achromatic.
 *
 * The fourth row is deliberately unmet. A gate panel where everything passes
 * demonstrates nothing; the interesting claim is that the system refuses.
 */

const gates = [
  { label: 'Quantity', state: 'passed' },
  { label: 'Material', state: 'passed' },
  { label: 'Quality', state: 'current' },
  { label: 'Commercial', state: 'pending' },
] as const;

const evidenceRows = [
  {
    icon: FileStack,
    label: 'Drawing revision',
    rule: 'Partner must hold the released revision',
    required: 'Rev C',
    actual: 'Rev C · ack 09:41',
    state: 'met',
  },
  {
    icon: Scale,
    label: 'Material custody',
    rule: 'Issued weight must be fully accounted',
    required: '1,240 kg',
    actual: '1,226 + 14 scrap',
    state: 'met',
  },
  {
    icon: ShieldCheck,
    label: 'Inspection plan',
    rule: 'Every characteristic within tolerance',
    required: '18 checks',
    actual: '18 accepted',
    state: 'met',
  },
  {
    icon: AlertTriangle,
    label: 'Deviation approval',
    rule: 'An out-of-tolerance accept needs authorisation',
    required: 'Authorised',
    actual: 'Awaiting quality head',
    state: 'attention',
  },
] as const;

export function EvidenceVisual(): React.JSX.Element {
  return (
    <div className="evidence-gate-surface linear-frame overflow-hidden rounded-[18px] border border-border-strong p-2">
      <div className="plate plate-lit relative rounded-xl border border-border-subtle p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-subtle">
              JOB-00412 / Release gate
            </p>
            <h3 className="mt-3 font-display text-2xl font-medium tracking-[-0.04em]">
              Evidence before movement.
            </h3>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border-strong bg-surface px-3 py-1 font-mono text-[0.625rem] tracking-[0.08em] text-muted-foreground">
            GATE 03 / 04
          </span>
        </div>

        {/* Position in the sequence is structural, so it is drawn rather than described. */}
        <div className="mt-7 grid grid-cols-4 gap-2" aria-hidden>
          {gates.map((gate) => (
            <div key={gate.label} className="flex flex-col gap-2">
              <span
                className={cn(
                  'h-[3px] rounded-full',
                  gate.state === 'pending' ? 'bg-border-strong' : 'bg-foreground/70',
                )}
              />
              <span
                className={cn(
                  'font-mono text-[0.5625rem] uppercase tracking-[0.1em]',
                  gate.state === 'pending' ? 'text-subtle' : 'text-muted-foreground',
                )}
              >
                {gate.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-7 overflow-hidden rounded-xl border border-border">
          {/* A header row is what turns four cards into one table. */}
          <div className="hidden grid-cols-[1.6fr_0.8fr_1fr_auto] gap-4 border-b border-border-subtle bg-black/30 px-4 py-2.5 sm:grid">
            <span className="type-label">Control</span>
            <span className="type-label">Required</span>
            <span className="type-label">On the record</span>
            <span className="type-label text-right">State</span>
          </div>

          {evidenceRows.map((row) => (
            <div
              key={row.label}
              className={cn(
                'grid gap-x-4 gap-y-2 border-b border-border-subtle px-4 py-3.5 transition-colors duration-200 last:border-b-0 hover:bg-white/[0.025]',
                'sm:grid-cols-[1.6fr_0.8fr_1fr_auto] sm:items-center',
                row.state === 'attention' ? 'bg-warning/[0.045]' : 'bg-black/20',
              )}
            >
              <div className="flex items-start gap-3">
                <row.icon
                  className={cn(
                    'mt-0.5 h-3.5 w-3.5 shrink-0',
                    row.state === 'attention' ? 'text-warning' : 'text-muted-foreground',
                  )}
                />
                <span className="min-w-0">
                  <span className="block text-[0.75rem] font-medium leading-tight">
                    {row.label}
                  </span>
                  <span className="mt-1 block text-[0.6875rem] leading-snug text-subtle">
                    {row.rule}
                  </span>
                </span>
              </div>

              <span className="font-mono text-[0.6875rem] tabular-nums text-muted-foreground">
                {row.required}
              </span>
              <span
                className={cn(
                  'font-mono text-[0.6875rem] tabular-nums',
                  row.state === 'attention' ? 'text-warning' : 'text-foreground',
                )}
              >
                {row.actual}
              </span>

              <span className="flex items-center gap-1.5 sm:justify-end">
                {row.state === 'attention' ? (
                  <>
                    <CircleAlert className="h-3.5 w-3.5 shrink-0 text-warning" />
                    <span className="font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-warning">
                      Hold
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                    <span className="font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-muted-foreground">
                      Met
                    </span>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>

        {/* The verdict states the rule being applied, not just the next button. */}
        <div className="plate-recessed mt-4 flex flex-col gap-3 rounded-xl border border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-2.5 text-[0.6875rem] leading-snug text-muted-foreground">
            <Lock className="mt-px h-3.5 w-3.5 shrink-0 text-warning" />
            Dispatch stays blocked while one control is unmet — three of four are satisfied.
          </span>
          <span className="shrink-0 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-subtle">
            Release withheld
          </span>
        </div>
      </div>
    </div>
  );
}

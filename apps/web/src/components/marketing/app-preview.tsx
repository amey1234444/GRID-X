import {
  Activity,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Clock3,
  Factory,
  Gauge,
  LayoutDashboard,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { LogoMark } from '@/components/brand';
import { cn } from '@/lib/utils';

const rows = [
  {
    job: 'JOB-00412',
    component: 'Oven arm weldment',
    partner: 'Shree Fabrication',
    status: 'In production',
    tone: 'default' as const,
    progress: 62,
  },
  {
    job: 'JOB-00411',
    component: 'Machine base frame',
    partner: 'Vidarbha Precision',
    status: 'Inspection',
    tone: 'warning' as const,
    progress: 88,
  },
  {
    job: 'JOB-00408',
    component: 'Support bracket set',
    partner: 'Ganesh Engineering',
    status: 'Accepted',
    tone: 'success' as const,
    progress: 100,
  },
];

const metrics = [
  { label: 'Live jobs', value: '38', delta: '+6 this week', icon: Factory },
  { label: 'On-time', value: '94.2%', delta: '+3.1 pts', icon: Clock3 },
  { label: 'Acceptance', value: '98.6%', delta: '+0.8 pts', icon: ShieldCheck },
];

const navigation = [
  { icon: LayoutDashboard, label: 'Overview', active: true },
  { icon: Factory, label: 'Production' },
  { icon: Boxes, label: 'Materials' },
  { icon: ShieldCheck, label: 'Quality' },
  { icon: Truck, label: 'Logistics' },
];

const pulse = [
  { label: 'Partner units online', value: '24 / 26', tone: 'success' },
  { label: 'Jobs needing action', value: '03', tone: 'warning' },
  { label: 'Material reconciled', value: '92%', tone: 'default' },
] as const;

export function AppPreview(): React.JSX.Element {
  return (
    <div className="group relative mx-auto w-full max-w-[1180px]">
      <div
        className="pointer-events-none absolute -inset-16 -z-10 bg-brand/10 blur-3xl"
        aria-hidden
      />
      <div className="linear-frame relative overflow-hidden rounded-[20px] border border-border-strong p-2 transition-transform duration-700 ease-out-expo lg:group-hover:-translate-y-1">
        <div className="overflow-hidden rounded-[13px] border border-border bg-background">
          <div className="flex h-11 items-center justify-between gap-3 border-b border-border-subtle bg-surface px-4">
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="h-2 w-2 rounded-full bg-white/15" />
              <span className="h-2 w-2 rounded-full bg-white/15" />
              <span className="h-2 w-2 rounded-full bg-white/15" />
            </div>
            <div className="hidden items-center gap-2 rounded-control bg-black/30 px-3 py-1 font-mono text-[10px] text-subtle shadow-hairline sm:flex">
              <ShieldCheck className="h-3 w-3 text-success" /> control.gridx.oswar.in/app
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-signal">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal" />
              </span>
              Live network
            </div>
          </div>

          <div className="grid min-h-[520px] grid-cols-1 md:grid-cols-[168px_minmax(0,1fr)]">
            <aside className="hidden border-r border-border-subtle bg-surface/80 p-3 md:block">
              <div className="mb-5 flex items-center gap-2.5 border-b border-border-subtle px-1.5 pb-4 pt-1">
                <span className="grid h-8 w-8 place-items-center rounded-input bg-[#0d0d0d] text-foreground shadow-hairline">
                  <LogoMark className="h-[19px] w-[19px]" />
                </span>
                <span>
                  <span className="block font-display text-[11px] font-semibold tracking-[-0.02em]">
                    GRID<span className="text-brand">-X</span>
                  </span>
                  <span className="mt-0.5 block font-mono text-[7px] uppercase tracking-[0.12em] text-subtle">
                    Control
                  </span>
                </span>
              </div>
              <nav className="space-y-0.5">
                {navigation.map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      'relative flex items-center gap-2.5 rounded-control px-2.5 py-2 text-[10px]',
                      item.active ? 'bg-surface-hover font-medium text-foreground' : 'text-subtle',
                    )}
                  >
                    {item.active ? (
                      <span className="absolute inset-y-2 left-0 w-px bg-brand" />
                    ) : null}
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </div>
                ))}
              </nav>
              <div className="mt-7 rounded-lg border border-border-subtle bg-black/20 p-3">
                <div className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.08em] text-subtle">
                  <Activity className="h-3 w-3 text-success" /> Network health
                </div>
                <p className="mt-2 font-display text-xl font-medium tracking-[-0.04em]">96.4%</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-active">
                  <div className="h-full w-[96%] rounded-full bg-success" />
                </div>
              </div>
            </aside>

            <div className="min-w-0 bg-[linear-gradient(135deg,rgb(255_255_255/0.018),transparent_42%)]">
              <div className="flex h-14 items-center gap-3 border-b border-border-subtle px-4 sm:px-5">
                <div>
                  <p className="font-display text-xs font-medium">Command center</p>
                  <p className="mt-0.5 text-[9px] text-subtle">Monday, 31 August</p>
                </div>
                <div className="ml-auto hidden h-7 w-44 items-center gap-1.5 rounded-control bg-surface-elevated px-2.5 text-[9px] text-subtle shadow-hairline sm:flex">
                  <Search className="h-3 w-3" /> Search anything
                  <span className="ml-auto rounded bg-surface-active px-1 py-0.5">⌘K</span>
                </div>
                <span className="grid h-7 w-7 place-items-center rounded-full border border-brand/25 bg-brand/10 text-[9px] font-semibold text-brand">
                  AB
                </span>
              </div>

              <div className="space-y-3.5 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 font-mono text-[8px] font-medium uppercase tracking-[0.1em] text-success">
                      <CheckCircle2 className="h-3 w-3" /> Network stable
                    </div>
                    <p className="mt-1 font-display text-sm font-medium tracking-[-0.025em] sm:text-base">
                      Operations are running within plan.
                    </p>
                    <p className="mt-0.5 text-[9px] text-subtle sm:text-[10px]">
                      38 live jobs across 26 partner units · 3 items need attention
                    </p>
                  </div>
                  <Badge variant="outline" className="hidden font-mono text-[8px] sm:inline-flex">
                    Last sync 12s ago
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {metrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-lg bg-card p-3 shadow-hairline surface-sheen sm:p-3.5"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate font-mono text-[8px] uppercase tracking-[0.06em] text-muted-foreground sm:text-[9px]">
                          {metric.label}
                        </p>
                        <metric.icon className="hidden h-3 w-3 text-subtle sm:block" />
                      </div>
                      <p className="mt-2 font-display text-lg font-medium tracking-[-0.04em] sm:text-xl">
                        {metric.value}
                      </p>
                      <p className="mt-0.5 flex items-center gap-0.5 text-[7px] text-success sm:text-[8px]">
                        <ArrowUpRight className="h-2 w-2" /> {metric.delta}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-2.5 lg:grid-cols-[1.5fr_0.8fr]">
                  <div className="overflow-hidden rounded-lg bg-card p-3 shadow-hairline">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-medium">Production velocity</p>
                        <p className="text-[8px] text-subtle">Accepted quantity · last 7 days</p>
                      </div>
                      <span className="text-[8px] font-medium text-success">+12.8%</span>
                    </div>
                    <svg
                      viewBox="0 0 360 92"
                      className="mt-2 h-[76px] w-full"
                      role="img"
                      aria-label="Rising production velocity trend"
                    >
                      <defs>
                        <linearGradient id="preview-area" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity="0.38" />
                          <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0 79H360M0 48H360M0 17H360"
                        stroke="hsl(var(--border-subtle))"
                        strokeWidth="1"
                      />
                      <path
                        d="M0 72 C28 68 38 61 62 64 S103 76 127 52 S170 40 194 44 S239 56 260 32 S304 28 360 12 V92 H0Z"
                        fill="url(#preview-area)"
                      />
                      <path
                        d="M0 72 C28 68 38 61 62 64 S103 76 127 52 S170 40 194 44 S239 56 260 32 S304 28 360 12"
                        fill="none"
                        stroke="hsl(var(--brand))"
                        strokeLinecap="round"
                        strokeWidth="2"
                      />
                      <circle cx="360" cy="12" r="3" fill="hsl(var(--brand))" />
                    </svg>
                  </div>

                  <div className="rounded-lg bg-card p-3 shadow-hairline">
                    <div className="flex items-center gap-1.5">
                      <Gauge className="h-3 w-3 text-brand" />
                      <p className="text-[10px] font-medium">Network pulse</p>
                    </div>
                    <div className="mt-2 space-y-2.5">
                      {pulse.map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              item.tone === 'success'
                                ? 'bg-success'
                                : item.tone === 'warning'
                                  ? 'bg-warning'
                                  : 'bg-brand',
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate text-[8px] text-subtle">
                            {item.label}
                          </span>
                          <span className="font-mono text-[9px] font-medium tabular-nums">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg bg-card shadow-hairline">
                  <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
                    <div>
                      <p className="text-[10px] font-medium">Jobs requiring focus</p>
                      <p className="text-[8px] text-subtle">Live execution queue</p>
                    </div>
                    <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-brand">
                      Open board →
                    </span>
                  </div>
                  <div className="divide-y divide-border-subtle">
                    {rows.map((row) => (
                      <div
                        key={row.job}
                        className="grid grid-cols-[72px_1fr_auto] items-center gap-2 px-3 py-2.5 text-[9px] sm:grid-cols-[76px_1.2fr_1fr_auto_72px]"
                      >
                        <span className="font-medium">{row.job}</span>
                        <span className="truncate text-muted-foreground">{row.component}</span>
                        <span className="hidden truncate text-subtle sm:block">{row.partner}</span>
                        <Badge variant={row.tone} className="text-[7px]">
                          {row.status}
                        </Badge>
                        <div className="hidden items-center gap-1.5 sm:flex">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-active">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                row.progress === 100 ? 'bg-success' : 'bg-brand',
                              )}
                              style={{ width: `${row.progress}%` }}
                            />
                          </div>
                          <span className="w-5 text-right text-[7px] tabular-nums text-subtle">
                            {row.progress}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

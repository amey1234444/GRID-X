import { ArrowUpRight, CheckCircle2, Clock, Factory, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const rows = [
  {
    job: 'JOB-00412',
    component: 'Oven arm weldment',
    partner: 'Shree Fabrication Works',
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
  {
    job: 'JOB-00405',
    component: 'Drive shaft housing',
    partner: 'Shree Fabrication Works',
    status: 'Material issued',
    tone: 'secondary' as const,
    progress: 24,
  },
];

const stats = [
  { label: 'Jobs in progress', value: '38', delta: '+6 this week', icon: Factory },
  { label: 'On-time delivery', value: '94.2%', delta: '+3.1 pts', icon: Clock },
  { label: 'Quality acceptance', value: '98.6%', delta: '+0.8 pts', icon: ShieldCheck },
];

export function AppPreview(): React.JSX.Element {
  return (
    <div className="relative rounded-2xl border bg-card p-2 shadow-elevated">
      <div className="rounded-xl border bg-background">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          </div>
          <div className="rounded-md bg-secondary px-3 py-1 text-xs text-muted-foreground">
            control.gridx.oswar.in/app
          </div>
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Live
          </Badge>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{stat.value}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-success">
                <ArrowUpRight className="h-3 w-3" />
                {stat.delta}
              </p>
            </div>
          ))}
        </div>

        <div className="px-4 pb-4">
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Job</th>
                  <th className="px-4 py-2.5 font-semibold">Component</th>
                  <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Partner</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="hidden px-4 py-2.5 font-semibold md:table-cell">Progress</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.job} className="border-t">
                    <td className="px-4 py-3 font-medium">{row.job}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.component}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{row.partner}</td>
                    <td className="px-4 py-3">
                      <Badge variant={row.tone}>{row.status}</Badge>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              row.progress === 100 ? 'bg-success' : 'bg-primary',
                            )}
                            style={{ width: `${row.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{row.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

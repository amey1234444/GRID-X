import { AlertTriangle, Check, Minus } from 'lucide-react';

import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { humanise } from '@/lib/format';
import { apiGet } from '@/lib/session';
import type { CapabilityMatrix } from '@/lib/types';

export const metadata = { title: 'Capability matrix · GRID-X' };

/** A process carried by this few allocatable partners is a single point of failure. */
const THIN_COVER = 2;

export default async function CapabilityMatrixPage(): Promise<React.JSX.Element> {
  const matrix = await apiGet<CapabilityMatrix>('/partners/capability-matrix', {
    processes: [],
    partners: [],
    coverage: [],
  });

  const uncovered = matrix.coverage.filter((row) => row.allocatablePartners === 0);
  const thin = matrix.coverage.filter(
    (row) => row.allocatablePartners > 0 && row.allocatablePartners <= THIN_COVER,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Factory"
        title="Capability matrix"
        description="Which processes the network can actually run, and how many partners stand behind each one."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active partners" value={String(matrix.partners.length)} />
        <StatCard
          label="Processes with no cover"
          value={String(uncovered.length)}
          hint="Nobody allocatable can run these"
        />
        <StatCard
          label="Thinly covered"
          value={String(thin.length)}
          hint={`${THIN_COVER} allocatable partners or fewer`}
        />
      </div>

      {uncovered.length > 0 || thin.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Concentration risk</CardTitle>
            <CardDescription>
              Counts only partners who could take work today — an approved capability at a suspended
              partner is not cover.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {[...uncovered, ...thin].map((row) => (
              <span
                key={row.process}
                className={
                  row.allocatablePartners === 0
                    ? 'inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs text-destructive'
                    : 'inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs'
                }
              >
                <AlertTriangle className="h-3 w-3" />
                {humanise(row.process)} · {row.allocatablePartners} allocatable
              </span>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Partners by process</CardTitle>
          <CardDescription>
            A tick is an approved capability. A dash means the partner declared it but it has not
            been approved, and blank means they do not offer it at all.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="sticky left-0 bg-card px-3 py-2 font-medium">Partner</th>
                  {matrix.processes.map((process) => (
                    <th key={process} className="px-2 py-2 text-center font-medium">
                      <span className="block whitespace-nowrap">{humanise(process)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.partners.map((partner) => (
                  <tr key={partner.id} className="border-b last:border-0">
                    <td className="sticky left-0 bg-card px-3 py-2">
                      <a
                        href={`/app/partners/${partner.id}`}
                        className="block font-medium hover:underline"
                      >
                        {partner.businessName}
                      </a>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {partner.city}
                        <StatusBadge status={partner.approvalStatus} className="scale-90" />
                      </span>
                    </td>
                    {matrix.processes.map((process) => {
                      const capability = partner.capabilities[process];
                      return (
                        <td key={process} className="px-2 py-2 text-center">
                          {!capability ? (
                            <span className="text-muted-foreground/30">·</span>
                          ) : capability.approved ? (
                            <Check
                              className={
                                partner.allocatable
                                  ? 'mx-auto h-4 w-4 text-emerald-600'
                                  : 'mx-auto h-4 w-4 text-muted-foreground'
                              }
                            />
                          ) : (
                            <Minus className="mx-auto h-4 w-4 text-muted-foreground" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {matrix.partners.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No active partners yet.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

import { AlertTriangle } from 'lucide-react';
import { PROCESS_LABELS, type ProcessType } from '@gridx/shared';

import { CapabilityCoverage } from '@/components/app/capability-coverage';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

  // A capability nobody has signed off is a promise, not capacity. Counting them separately keeps
  // the "we can do this" number honest.
  const declaredOnly = matrix.partners.reduce(
    (sum, partner) =>
      sum + Object.values(partner.capabilities).filter((capability) => !capability.approved).length,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Factory"
        title="Capability matrix"
        description="Which processes the network can actually run, and how many partners stand behind each one."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active partners"
          value={String(matrix.partners.length)}
          icon="Factory"
          hint="in the matrix"
        />
        <StatCard
          label="Processes with no cover"
          value={String(uncovered.length)}
          tone={uncovered.length > 0 ? 'destructive' : 'default'}
          icon="AlertTriangle"
          hint="nobody allocatable can run these"
        />
        <StatCard
          label="Thinly covered"
          value={String(thin.length)}
          tone={thin.length > 0 ? 'warning' : 'default'}
          icon="AlertCircle"
          hint={`${THIN_COVER} allocatable partners or fewer`}
        />
        <StatCard
          label="Declared, not approved"
          value={String(declaredOnly)}
          tone={declaredOnly > 0 ? 'warning' : 'default'}
          icon="ClipboardCheck"
          hint="capabilities awaiting audit"
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
                    ? 'inline-flex items-center gap-1.5 rounded-control bg-destructive/10 px-2.5 py-1 text-[0.75rem] text-destructive shadow-[inset_0_0_0_1px_hsl(var(--destructive)/0.28)]'
                    : 'inline-flex items-center gap-1.5 rounded-control bg-warning/10 px-2.5 py-1 text-[0.75rem] text-warning shadow-[inset_0_0_0_1px_hsl(var(--warning)/0.28)]'
                }
              >
                <AlertTriangle className="h-3 w-3" aria-hidden />
                {PROCESS_LABELS[row.process as ProcessType] ?? row.process} ·{' '}
                {row.allocatablePartners} allocatable
              </span>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <CapabilityCoverage matrix={matrix} />
    </div>
  );
}

import Link from 'next/link';
import { Check } from 'lucide-react';
import { PROCESS_LABELS, processesByFamily, type ProcessType } from '@gridx/shared';

import { StatusBadge } from '@/components/app/status-badge';
import { cn } from '@/lib/utils';
import type { CapabilityMatrix } from '@/lib/types';

/**
 * Partner capability coverage.
 *
 * The matrix answers one question — who can actually run what — so every cell is one of exactly
 * three states and each gets its own mark rather than a shade of the same one:
 *
 *   Approved    the capability is declared *and* signed off; this is real cover.
 *   Declared    the partner says they can, nobody has verified it. Not cover, but not nothing.
 *   Not offered they do not do this process at all.
 *
 * Columns are grouped by process family because twelve flat columns cannot show that a partner
 * covers all of metalwork and none of precision, which is the shape a planner is looking for.
 * The right-hand summary closes each row with its counts so the row can be read without
 * counting ticks by eye.
 */

type CellState = 'approved' | 'declared' | 'none';

function CapabilityCell({ state }: { state: CellState }): React.JSX.Element {
  const label =
    state === 'approved' ? 'Approved' : state === 'declared' ? 'Declared' : 'Not offered';

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        'mx-auto flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border',
        state === 'approved' && 'border-success/70 bg-success/20 text-success',
        state === 'declared' && 'border-warning/70 bg-warning/10 text-warning',
        state === 'none' && 'border-border-strong/70 bg-transparent',
      )}
    >
      {state === 'approved' ? (
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
      ) : state === 'declared' ? (
        <span
          className="h-[7px] w-[7px] rounded-full border-[1.5px] border-current"
          aria-hidden
        />
      ) : null}
    </span>
  );
}

function LegendItem({ state, label }: { state: CellState; label: string }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-2">
      <CapabilityCell state={state} />
      <span className="text-[0.75rem] text-muted-foreground">{label}</span>
    </span>
  );
}

export function CapabilityCoverage({
  matrix,
  /** Total partners in the network, when the table shows a filtered subset. */
  totalPartners,
}: {
  matrix: CapabilityMatrix;
  totalPartners?: number;
}): React.JSX.Element {
  const processes = matrix.processes as ProcessType[];
  const families = processesByFamily(processes);
  const shown = matrix.partners.length;
  const total = totalPartners ?? shown;

  const rows = matrix.partners.map((partner) => {
    const cells = processes.map((process) => {
      const capability = partner.capabilities[process];
      const state: CellState = !capability ? 'none' : capability.approved ? 'approved' : 'declared';
      return { process, state };
    });
    const approved = cells.filter((cell) => cell.state === 'approved').length;
    const declared = cells.filter((cell) => cell.state === 'declared').length;
    return {
      partner,
      cells,
      approved,
      declared,
      coverage: processes.length === 0 ? 0 : approved / processes.length,
    };
  });

  /* Column-group boundaries get a vertical rule so the eye can tell where a family ends. */
  const familyStart = new Set<string>(families.map((group) => group.processes[0]));

  return (
    <section className="overflow-hidden rounded-card bg-card shadow-hairline surface-sheen">
      <header className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="type-section-title text-[1.0625rem]">Partner capability coverage</h2>
          <p className="type-small mt-1 max-w-2xl text-muted-foreground">
            Shows which partners have approved capabilities, which are declared, and which they do
            not offer.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2">
          <LegendItem state="approved" label="Approved" />
          <LegendItem state="declared" label="Declared" />
          <LegendItem state="none" label="Not offered" />
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="border-t border-border-subtle px-5 py-12 text-center text-sm text-muted-foreground">
          No active partners yet.
        </p>
      ) : (
        <div className="overflow-x-auto border-y border-border-subtle">
          <table className="w-full min-w-[64rem] border-collapse text-sm">
            <caption className="sr-only">
              Capability coverage for {shown} partners across {processes.length} processes.
            </caption>

            <thead>
              <tr>
                <th
                  rowSpan={2}
                  scope="col"
                  className="sticky left-0 z-10 min-w-[15rem] border-r border-border bg-card px-5 pb-3 pt-4 text-left align-bottom type-label"
                >
                  Partner
                </th>
                {families.map((group) => (
                  <th
                    key={group.family}
                    scope="colgroup"
                    colSpan={group.processes.length}
                    className="border-b border-l border-border-subtle px-3 pb-2 pt-4 text-center type-label"
                  >
                    {group.label}
                  </th>
                ))}
                <th
                  scope="colgroup"
                  colSpan={3}
                  className="border-b border-l border-border px-3 pb-2 pt-4 text-center type-label"
                >
                  Summary
                </th>
              </tr>
              <tr>
                {processes.map((process) => (
                  <th
                    key={process}
                    scope="col"
                    className={cn(
                      'min-w-[4.5rem] px-2 pb-3 pt-2 text-center align-bottom',
                      'text-[0.75rem] font-normal leading-tight text-muted-foreground',
                      familyStart.has(process) && 'border-l border-border-subtle',
                    )}
                  >
                    {PROCESS_LABELS[process]}
                  </th>
                ))}
                <th
                  scope="col"
                  className="min-w-[5rem] border-l border-border px-2 pb-3 pt-2 text-center align-bottom text-[0.75rem] font-normal text-muted-foreground"
                >
                  Approved
                </th>
                <th
                  scope="col"
                  className="min-w-[5rem] px-2 pb-3 pt-2 text-center align-bottom text-[0.75rem] font-normal text-muted-foreground"
                >
                  Declared
                </th>
                <th
                  scope="col"
                  className="min-w-[5rem] px-2 pb-3 pt-2 text-center align-bottom text-[0.75rem] font-normal text-muted-foreground"
                >
                  Coverage
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.partner.id}
                  className="group border-t border-border-subtle transition-colors duration-200 hover:bg-surface-hover/60"
                >
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-r border-border bg-card px-5 py-3 text-left font-normal transition-colors duration-200 group-hover:bg-surface-hover"
                  >
                    <Link
                      href={`/app/partners/${row.partner.id}`}
                      className="block truncate text-[0.875rem] font-medium hover:underline"
                    >
                      {row.partner.businessName}
                    </Link>
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-[0.75rem] text-muted-foreground">
                        {row.partner.city}
                      </span>
                      <StatusBadge status={row.partner.approvalStatus} />
                    </span>
                  </th>

                  {row.cells.map((cell) => (
                    <td
                      key={cell.process}
                      className={cn(
                        'px-2 py-3',
                        familyStart.has(cell.process) && 'border-l border-border-subtle',
                      )}
                    >
                      <CapabilityCell state={cell.state} />
                    </td>
                  ))}

                  <td className="border-l border-border px-2 py-3 text-center">
                    <span
                      className={cn(
                        'text-[0.9375rem] font-medium tabular-nums',
                        row.approved > 0 ? 'text-success' : 'text-subtle-foreground',
                      )}
                    >
                      {row.approved}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span
                      className={cn(
                        'text-[0.9375rem] font-medium tabular-nums',
                        row.declared > 0 ? 'text-warning' : 'text-subtle-foreground',
                      )}
                    >
                      {row.declared}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className="text-[0.9375rem] font-medium tabular-nums text-foreground">
                      {Math.round(row.coverage * 100)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="flex flex-col gap-2 px-5 py-3.5 text-[0.75rem] text-subtle sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing {shown} of {total} partner{total === 1 ? '' : 's'}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>
            {processes.length} process{processes.length === 1 ? '' : 'es'} across {families.length}{' '}
            famil{families.length === 1 ? 'y' : 'ies'}
          </span>
          <span aria-hidden className="text-border-strong">
            |
          </span>
          <span>Coverage = approved capabilities / total processes</span>
        </span>
      </footer>
    </section>
  );
}

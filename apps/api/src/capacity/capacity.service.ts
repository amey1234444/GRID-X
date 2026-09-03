import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@gridx/db';
import { CapacityDeclarationInput, ProcessType } from '@gridx/shared';
import { PrismaService, PrismaTransaction } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '../common/request-user';
import { allowedCompanyIds } from '../common/company-scope';

export interface CapacityWindow {
  from: Date;
  to: Date;
  partnerId?: string;
  processCode?: ProcessType;
  /** Module 5 management output — capacity by location. */
  city?: string;
}

/**
 * What a partner has actually declared for a process over a window, and what is already held
 * against it.
 *
 * This exists because the allocation engine was scoring "available capacity" — 15% of the ranking —
 * from `Partner.maxCapacityHours`, a static number on the partner master. Module 5's whole point is
 * that partners declare capacity per period, and none of it reached the ranking: a partner
 * declaring a shutdown, or nothing at all, still scored as fully available.
 */
export interface DeclaredCapacity {
  /** Sum of declared available hours overlapping the window, net of maintenance shutdown. */
  declaredHours: number;
  /** Hours already reserved by live jobs, plus any commitment the partner declared themselves. */
  committedHours: number;
  freeHours: number;
  /** False when the partner has declared nothing for this process and window. */
  hasDeclaration: boolean;
  periodsCovered: number;
}

/** A job holds capacity until it is closed or cancelled. */
export const OPEN_JOB_STATUS_FILTER: Prisma.EnumJobStatusFilter<'GridJob'> = {
  notIn: ['CLOSED', 'CANCELLED'],
};

/**
 * Module 5 management output. The heatmap answered "who has capacity" one row at a time; the
 * blueprint also asks for the network totals, capacity by process, capacity by location, and
 * explicit lists of overloaded and underutilised partners — none of which were derivable from a
 * flat row list without the reader doing the arithmetic themselves.
 */
export interface CapacityNetworkSummary {
  totalCapacityHours: number;
  utilisedHours: number;
  freeHours: number;
  utilisationPercent: number;
  partnersDeclaring: number;
  byProcess: Array<{
    processCode: string;
    availableHours: number;
    committedHours: number;
    freeHours: number;
    utilisationPercent: number;
  }>;
  byLocation: Array<{
    city: string;
    partners: number;
    availableHours: number;
    committedHours: number;
    freeHours: number;
    utilisationPercent: number;
  }>;
  overloaded: CapacityPartnerLoad[];
  underutilised: CapacityPartnerLoad[];
}

export interface CapacityPartnerLoad {
  partnerId: string;
  partnerCode: string;
  businessName: string;
  city: string;
  availableHours: number;
  committedHours: number;
  freeHours: number;
  utilisationPercent: number;
  expectedBottleneck: string | null;
}

/**
 * Where a partner stops being comfortably loaded and starts being a delivery risk, and where they
 * are idle enough to be worth more work. Thresholds rather than a ranking, so the two lists can be
 * empty — a healthy network should not be forced to nominate a worst partner.
 */
export const OVERLOAD_THRESHOLD_PERCENT = 90;
export const UNDERUTILISED_THRESHOLD_PERCENT = 40;

export interface CapacityHeatmapRow {
  partnerId: string;
  partnerCode: string;
  businessName: string;
  city: string;
  processCode: string;
  periodStart: string;
  periodEnd: string;
  availableHours: number;
  committedHours: number;
  freeHours: number;
  utilisationPercent: number;
  expectedBottleneck: string | null;
}

/** Module 5 — partners declare capacity per process and period; planners see the network heatmap. */
@Injectable()
export class CapacityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async declare(actor: RequestUser, input: CapacityDeclarationInput) {
    const partnerId = actor.partnerId ?? input.partnerId;
    if (!partnerId) throw new BadRequestException('partnerId is required');
    if (actor.partnerId && input.partnerId && input.partnerId !== actor.partnerId) {
      throw new ForbiddenException('Partners can only declare their own capacity');
    }
    if (input.periodEnd <= input.periodStart) {
      throw new BadRequestException('Period end must be after period start');
    }

    const process = await this.prisma.process.findUniqueOrThrow({
      where: { code: input.processCode },
    });
    const netHours = Math.max(input.availableHours - input.maintenanceShutdownHours, 0);

    const declaration = await this.prisma.capacityDeclaration.upsert({
      where: {
        partnerId_processId_periodStart: {
          partnerId,
          processId: process.id,
          periodStart: input.periodStart,
        },
      },
      create: {
        partnerId,
        processId: process.id,
        periodType: input.periodType,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        availableHours: netHours,
        availableWorkers: input.availableWorkers,
        availableMachines: input.availableMachines,
        maintenanceShutdownHours: input.maintenanceShutdownHours,
        expectedBottleneck: input.expectedBottleneck,
        declaredById: actor.id,
      },
      update: {
        periodType: input.periodType,
        periodEnd: input.periodEnd,
        availableHours: netHours,
        availableWorkers: input.availableWorkers,
        availableMachines: input.availableMachines,
        maintenanceShutdownHours: input.maintenanceShutdownHours,
        expectedBottleneck: input.expectedBottleneck,
        declaredById: actor.id,
      },
    });

    await this.audit.record(actor, {
      action: 'CAPACITY_DECLARED',
      entityType: 'CapacityDeclaration',
      entityId: declaration.id,
      after: {
        partnerId,
        processCode: input.processCode,
        availableHours: netHours,
        periodStart: input.periodStart,
      },
    });
    return declaration;
  }

  /** Capacity belongs to a partner, so company scope is applied one relation deep. */
  private partnerScope(actor: RequestUser): { partner?: { companyId: { in: string[] } } } {
    const ids = allowedCompanyIds(actor);
    return ids ? { partner: { companyId: { in: ids } } } : {};
  }

  async declarations(actor: RequestUser, window: CapacityWindow) {
    return this.prisma.capacityDeclaration.findMany({
      where: {
        ...this.partnerScope(actor),
        ...(actor.partnerId ? { partnerId: actor.partnerId } : window.partnerId ? { partnerId: window.partnerId } : {}),
        ...(window.processCode ? { process: { code: window.processCode } } : {}),
        periodStart: { gte: window.from },
        periodEnd: { lte: window.to },
      },
      orderBy: [{ periodStart: 'asc' }],
      include: {
        process: { select: { id: true, code: true, name: true } },
        partner: { select: { id: true, partnerCode: true, businessName: true } },
      },
    });
  }

  /** Network capacity heatmap: declared vs committed hours per partner, process and period. */
  async heatmap(actor: RequestUser, window: CapacityWindow): Promise<CapacityHeatmapRow[]> {
    const declarations = await this.prisma.capacityDeclaration.findMany({
      where: {
        ...this.partnerScope(actor),
        ...(actor.partnerId ? { partnerId: actor.partnerId } : {}),
        ...(window.partnerId ? { partnerId: window.partnerId } : {}),
        ...(window.processCode ? { process: { code: window.processCode } } : {}),
        ...(window.city ? { partner: { city: { equals: window.city, mode: 'insensitive' } } } : {}),
        periodStart: { gte: window.from },
        periodEnd: { lte: window.to },
      },
      include: {
        partner: { select: { id: true, partnerCode: true, businessName: true, city: true } },
        process: { select: { code: true } },
        // Only live jobs hold capacity. Closed and cancelled jobs release their reservation, but
        // filtering here too keeps the board honest if a release is ever missed.
        allocations: {
          where: { OR: [{ jobId: null }, { job: { status: OPEN_JOB_STATUS_FILTER } }] },
        },
      },
      orderBy: [{ periodStart: 'asc' }],
    });

    return declarations.map((declaration) => {
      const committedHours = declaration.allocations.reduce(
        (sum, allocation) => sum + allocation.allocatedHours,
        declaration.committedHours,
      );
      const freeHours = Math.max(declaration.availableHours - committedHours, 0);
      return {
        partnerId: declaration.partnerId,
        partnerCode: declaration.partner.partnerCode,
        businessName: declaration.partner.businessName,
        city: declaration.partner.city,
        processCode: declaration.process.code,
        periodStart: declaration.periodStart.toISOString(),
        periodEnd: declaration.periodEnd.toISOString(),
        availableHours: declaration.availableHours,
        committedHours,
        freeHours,
        utilisationPercent:
          declaration.availableHours > 0
            ? Math.round((committedHours / declaration.availableHours) * 1000) / 10
            : 0,
        expectedBottleneck: declaration.expectedBottleneck,
      };
    });
  }

  /**
   * Module 5 — the management view of network capacity.
   *
   * Built from the same declarations as the heatmap so the totals always agree with the rows a
   * planner can see, rather than being a second query that can quietly diverge.
   */
  async networkSummary(
    actor: RequestUser,
    window: CapacityWindow,
  ): Promise<CapacityNetworkSummary> {
    const rows = await this.heatmap(actor, window);

    const byProcess = new Map<string, { available: number; committed: number }>();
    const byLocation = new Map<
      string,
      { available: number; committed: number; partners: Set<string> }
    >();
    const byPartner = new Map<string, CapacityPartnerLoad>();

    for (const row of rows) {
      const process = byProcess.get(row.processCode) ?? { available: 0, committed: 0 };
      process.available += row.availableHours;
      process.committed += row.committedHours;
      byProcess.set(row.processCode, process);

      const city = row.city || 'Unspecified';
      const location = byLocation.get(city) ?? {
        available: 0,
        committed: 0,
        partners: new Set<string>(),
      };
      location.available += row.availableHours;
      location.committed += row.committedHours;
      location.partners.add(row.partnerId);
      byLocation.set(city, location);

      // A partner declares per process and period; their load is the sum across all of it.
      const partner = byPartner.get(row.partnerId) ?? {
        partnerId: row.partnerId,
        partnerCode: row.partnerCode,
        businessName: row.businessName,
        city: row.city,
        availableHours: 0,
        committedHours: 0,
        freeHours: 0,
        utilisationPercent: 0,
        expectedBottleneck: null,
      };
      partner.availableHours += row.availableHours;
      partner.committedHours += row.committedHours;
      partner.expectedBottleneck = partner.expectedBottleneck ?? row.expectedBottleneck;
      byPartner.set(row.partnerId, partner);
    }

    const partners = [...byPartner.values()].map((partner) => ({
      ...partner,
      availableHours: round2(partner.availableHours),
      committedHours: round2(partner.committedHours),
      freeHours: round2(Math.max(0, partner.availableHours - partner.committedHours)),
      utilisationPercent: utilisation(partner.availableHours, partner.committedHours),
    }));

    const totalCapacityHours = round2(
      partners.reduce((sum, partner) => sum + partner.availableHours, 0),
    );
    const utilisedHours = round2(
      partners.reduce((sum, partner) => sum + partner.committedHours, 0),
    );

    return {
      totalCapacityHours,
      utilisedHours,
      freeHours: round2(Math.max(0, totalCapacityHours - utilisedHours)),
      utilisationPercent: utilisation(totalCapacityHours, utilisedHours),
      partnersDeclaring: partners.length,
      byProcess: [...byProcess.entries()]
        .map(([processCode, value]) => ({
          processCode,
          availableHours: round2(value.available),
          committedHours: round2(value.committed),
          freeHours: round2(Math.max(0, value.available - value.committed)),
          utilisationPercent: utilisation(value.available, value.committed),
        }))
        // Most loaded first: the bottleneck is the thing a planner is looking for.
        .sort((a, b) => b.utilisationPercent - a.utilisationPercent),
      byLocation: [...byLocation.entries()]
        .map(([city, value]) => ({
          city,
          partners: value.partners.size,
          availableHours: round2(value.available),
          committedHours: round2(value.committed),
          freeHours: round2(Math.max(0, value.available - value.committed)),
          utilisationPercent: utilisation(value.available, value.committed),
        }))
        .sort((a, b) => b.availableHours - a.availableHours),
      overloaded: partners
        .filter((partner) => partner.utilisationPercent >= OVERLOAD_THRESHOLD_PERCENT)
        .sort((a, b) => b.utilisationPercent - a.utilisationPercent),
      underutilised: partners
        .filter(
          (partner) =>
            partner.availableHours > 0 &&
            partner.utilisationPercent <= UNDERUTILISED_THRESHOLD_PERCENT,
        )
        .sort((a, b) => b.freeHours - a.freeHours),
    };
  }

  /**
   * Declared capacity for one partner and process over a window, for the allocation ranking.
   *
   * Declarations are per period, and a job window usually spans several of them, so every
   * declaration overlapping the window is summed. Reservations held by live jobs are subtracted,
   * which is what makes the figure a *free* capacity rather than a gross one.
   */
  async declaredCapacityFor(
    partnerId: string,
    processId: string,
    from: Date,
    to: Date,
  ): Promise<DeclaredCapacity> {
    const [declarations, allocations] = await Promise.all([
      this.prisma.capacityDeclaration.findMany({
        // Overlap, not containment: a monthly declaration covers a job window inside it, and a
        // weekly one only part. Both should count.
        where: { partnerId, processId, periodStart: { lte: to }, periodEnd: { gte: from } },
        select: { availableHours: true, committedHours: true },
      }),
      this.prisma.capacityAllocation.aggregate({
        where: {
          partnerId,
          processId,
          periodStart: { lte: to },
          periodEnd: { gte: from },
          OR: [{ jobId: null }, { job: { status: OPEN_JOB_STATUS_FILTER } }],
        },
        _sum: { allocatedHours: true },
      }),
    ]);

    const declaredHours = declarations.reduce((sum, row) => sum + row.availableHours, 0);
    const declaredCommitment = declarations.reduce((sum, row) => sum + row.committedHours, 0);
    // The partner's own stated commitment and the system's reservations describe the same load
    // from two directions; taking the higher avoids double-counting while staying conservative.
    const committedHours = Math.max(declaredCommitment, allocations._sum.allocatedHours ?? 0);

    return {
      declaredHours: round2(declaredHours),
      committedHours: round2(committedHours),
      freeHours: round2(Math.max(0, declaredHours - committedHours)),
      hasDeclaration: declarations.length > 0,
      periodsCovered: declarations.length,
    };
  }

  /**
   * The same figure for many partners at once, so ranking a job does not make one round trip per
   * candidate. Keyed by partner id.
   */
  async declaredCapacityForMany(
    partnerIds: string[],
    processId: string,
    from: Date,
    to: Date,
  ): Promise<Map<string, DeclaredCapacity>> {
    const result = new Map<string, DeclaredCapacity>();
    if (partnerIds.length === 0) return result;

    const [declarations, allocations] = await Promise.all([
      this.prisma.capacityDeclaration.groupBy({
        by: ['partnerId'],
        where: {
          partnerId: { in: partnerIds },
          processId,
          periodStart: { lte: to },
          periodEnd: { gte: from },
        },
        _sum: { availableHours: true, committedHours: true },
        _count: { _all: true },
      }),
      this.prisma.capacityAllocation.groupBy({
        by: ['partnerId'],
        where: {
          partnerId: { in: partnerIds },
          processId,
          periodStart: { lte: to },
          periodEnd: { gte: from },
          OR: [{ jobId: null }, { job: { status: OPEN_JOB_STATUS_FILTER } }],
        },
        _sum: { allocatedHours: true },
      }),
    ]);

    const allocated = new Map(
      allocations.map((row) => [row.partnerId, row._sum.allocatedHours ?? 0]),
    );

    for (const partnerId of partnerIds) {
      const declaration = declarations.find((row) => row.partnerId === partnerId);
      const declaredHours = declaration?._sum.availableHours ?? 0;
      const committedHours = Math.max(
        declaration?._sum.committedHours ?? 0,
        allocated.get(partnerId) ?? 0,
      );
      result.set(partnerId, {
        declaredHours: round2(declaredHours),
        committedHours: round2(committedHours),
        freeHours: round2(Math.max(0, declaredHours - committedHours)),
        hasDeclaration: (declaration?._count._all ?? 0) > 0,
        periodsCovered: declaration?._count._all ?? 0,
      });
    }
    return result;
  }

  /**
   * Reserve capacity when a job is allocated so planners never double-book a partner.
   *
   * Reservations are keyed on the job, so re-allocating a job to a different partner replaces the
   * previous hold rather than stacking a second one. Runs inside the caller's transaction when one
   * is passed, so the reservation and the allocation commit together.
   */
  async reserve(
    input: {
      partnerId: string;
      processId: string;
      jobId: string;
      hours: number;
      periodStart: Date;
      periodEnd: Date;
    },
    tx: PrismaTransaction = this.prisma,
  ) {
    const declaration = await tx.capacityDeclaration.findFirst({
      where: {
        partnerId: input.partnerId,
        processId: input.processId,
        periodStart: { lte: input.periodStart },
        periodEnd: { gte: input.periodStart },
      },
    });
    await tx.capacityAllocation.deleteMany({ where: { jobId: input.jobId } });
    return tx.capacityAllocation.create({
      data: {
        declarationId: declaration?.id,
        partnerId: input.partnerId,
        processId: input.processId,
        jobId: input.jobId,
        allocatedHours: input.hours,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      },
    });
  }

  /**
   * Give the hours back. Called when a job is closed, cancelled or declined — capacity held by a
   * job nobody is working on would quietly shrink the network's free capacity forever.
   */
  async release(jobId: string, tx: PrismaTransaction = this.prisma): Promise<number> {
    const { count } = await tx.capacityAllocation.deleteMany({ where: { jobId } });
    return count;
  }

  /**
   * Hours a job needs from a partner, taken from the component routing and falling back to the
   * component's standard cycle time. Used both to size a reservation and to rank recommendations.
   */
  async estimatedHours(componentId: string, quantity: number): Promise<number> {
    const [processes, component] = await Promise.all([
      this.prisma.componentProcess.findMany({ where: { componentId } }),
      this.prisma.component.findUnique({
        where: { id: componentId },
        select: { standardCycleTimeMinutes: true },
      }),
    ]);
    const routedMinutes = processes.reduce(
      (sum, process) => sum + (process.cycleTimeMinutes ?? 0) * quantity,
      0,
    );
    const minutes =
      routedMinutes > 0 ? routedMinutes : (component?.standardCycleTimeMinutes ?? 0) * quantity;
    return Math.round((minutes / 60) * 100) / 100;
  }

  /**
   * The process a job consumes capacity from: the first outsourced step in the routing, falling
   * back to the component's primary process so a component with no routing still reserves.
   */
  async processForComponent(componentId: string): Promise<string | null> {
    const routed = await this.prisma.componentProcess.findFirst({
      where: { componentId, isOutsourced: true },
      orderBy: { sequence: 'asc' },
      select: { processId: true },
    });
    if (routed) return routed.processId;

    const component = await this.prisma.component.findUnique({
      where: { id: componentId },
      select: { primaryProcess: true },
    });
    if (!component) return null;
    const process = await this.prisma.process.findUnique({
      where: { code: component.primaryProcess },
      select: { id: true },
    });
    return process?.id ?? null;
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function utilisation(available: number, committed: number): number {
  return available > 0 ? Math.round((committed / available) * 1000) / 10 : 0;
}

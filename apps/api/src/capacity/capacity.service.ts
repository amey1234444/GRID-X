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
}

/** A job holds capacity until it is closed or cancelled. */
export const OPEN_JOB_STATUS_FILTER: Prisma.EnumJobStatusFilter<'GridJob'> = {
  notIn: ['CLOSED', 'CANCELLED'],
};

export interface CapacityHeatmapRow {
  partnerId: string;
  partnerCode: string;
  businessName: string;
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
        periodStart: { gte: window.from },
        periodEnd: { lte: window.to },
      },
      include: {
        partner: { select: { id: true, partnerCode: true, businessName: true } },
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

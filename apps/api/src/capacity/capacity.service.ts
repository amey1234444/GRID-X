import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { CapacityDeclarationInput, ProcessType } from '@gridx/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '../common/request-user';

export interface CapacityWindow {
  from: Date;
  to: Date;
  partnerId?: string;
  processCode?: ProcessType;
}

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

  async declarations(actor: RequestUser, window: CapacityWindow) {
    return this.prisma.capacityDeclaration.findMany({
      where: {
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
  async heatmap(window: CapacityWindow): Promise<CapacityHeatmapRow[]> {
    const declarations = await this.prisma.capacityDeclaration.findMany({
      where: {
        ...(window.partnerId ? { partnerId: window.partnerId } : {}),
        ...(window.processCode ? { process: { code: window.processCode } } : {}),
        periodStart: { gte: window.from },
        periodEnd: { lte: window.to },
      },
      include: {
        partner: { select: { id: true, partnerCode: true, businessName: true } },
        process: { select: { code: true } },
        allocations: true,
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

  /** Reserve capacity when a job is allocated so planners never double-book a partner. */
  async reserve(
    partnerId: string,
    processId: string,
    jobId: string,
    hours: number,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const declaration = await this.prisma.capacityDeclaration.findFirst({
      where: { partnerId, processId, periodStart: { lte: periodStart }, periodEnd: { gte: periodStart } },
    });
    return this.prisma.capacityAllocation.create({
      data: {
        declarationId: declaration?.id,
        partnerId,
        processId,
        jobId,
        allocatedHours: hours,
        periodStart,
        periodEnd,
      },
    });
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@gridx/db';
import {
  Paginated,
  PaginationInput,
  calibrationSchema,
  createToolSchema,
  issueToolSchema,
  returnToolSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SequenceService } from '../audit/sequence.service';
import { RequestUser } from '../common/request-user';
import { paginate, paginationArgs } from '../common/pagination';

export interface ToolFilters extends PaginationInput {
  category?: string;
  partnerId?: string;
  calibrationDue?: boolean;
}

/** Module 9 — OSWAR-owned tools, fixtures and gauges tracked while in partner custody. */
@Injectable()
export class ToolingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
  ) {}

  async list(actor: RequestUser, filters: ToolFilters): Promise<Paginated<unknown>> {
    const where: Prisma.ToolWhereInput = {
      isActive: true,
      ...(actor.partnerId
        ? { currentPartnerId: actor.partnerId }
        : filters.partnerId
          ? { currentPartnerId: filters.partnerId }
          : {}),
      ...(filters.category ? { category: filters.category as Prisma.EnumToolCategoryFilter } : {}),
      ...(filters.calibrationDue
        ? { nextCalibrationDue: { lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { toolCode: { contains: filters.search, mode: 'insensitive' } },
              { description: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.tool.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: { toolCode: 'asc' },
        include: {
          issues: {
            where: { status: 'ISSUED' },
            include: { partner: { select: { id: true, businessName: true } } },
          },
          calibrations: { orderBy: { calibratedAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.tool.count({ where }),
    ]);
    return paginate(data, total, filters);
  }

  async create(actor: RequestUser, input: z.infer<typeof createToolSchema>) {
    const toolCode = await this.sequence.next('TOOL');
    const tool = await this.prisma.tool.create({ data: { ...input, toolCode } });
    await this.audit.record(actor, {
      action: 'TOOL_CREATED',
      entityType: 'Tool',
      entityId: tool.id,
      companyId: input.companyId,
      after: { toolCode, category: tool.category, description: tool.description },
    });
    return tool;
  }

  async issue(actor: RequestUser, id: string, input: z.infer<typeof issueToolSchema>) {
    const tool = await this.prisma.tool.findUniqueOrThrow({
      where: { id },
      include: { issues: { where: { status: 'ISSUED' } } },
    });
    if (tool.issues.length > 0) {
      throw new BadRequestException('This tool is already issued and not yet returned');
    }
    const issue = await this.prisma.toolIssue.create({
      data: {
        toolId: id,
        partnerId: input.partnerId,
        jobId: input.jobId,
        expectedReturnDate: input.expectedReturnDate,
        conditionOnIssue: input.conditionOnIssue,
        remarks: input.remarks,
        issuedById: actor.id,
      },
    });
    await this.prisma.tool.update({
      where: { id },
      data: { currentPartnerId: input.partnerId, condition: input.conditionOnIssue },
    });
    await this.audit.record(actor, {
      action: 'TOOL_ISSUED',
      entityType: 'ToolIssue',
      entityId: issue.id,
      after: { toolId: id, partnerId: input.partnerId },
    });
    return issue;
  }

  async returnTool(actor: RequestUser, issueId: string, input: z.infer<typeof returnToolSchema>) {
    const issue = await this.prisma.toolIssue.update({
      where: { id: issueId },
      data: {
        status:
          input.conditionOnReturn === 'DAMAGED' || input.conditionOnReturn === 'SCRAPPED'
            ? 'DAMAGED'
            : 'RETURNED',
        actualReturnDate: new Date(),
        conditionOnReturn: input.conditionOnReturn,
        remarks: input.remarks,
      },
    });
    await this.prisma.tool.update({
      where: { id: issue.toolId },
      data: { currentPartnerId: null, condition: input.conditionOnReturn },
    });
    await this.audit.record(actor, {
      action: 'TOOL_RETURNED',
      entityType: 'ToolIssue',
      entityId: issueId,
      after: { conditionOnReturn: input.conditionOnReturn },
    });
    return issue;
  }

  /** Calibration records keep gauges legally usable; the next due date drives reminders. */
  async recordCalibration(
    actor: RequestUser,
    id: string,
    input: z.infer<typeof calibrationSchema>,
  ) {
    const tool = await this.prisma.tool.findUniqueOrThrow({ where: { id } });
    const calibratedAt = input.calibratedAt ?? new Date();
    const nextDueAt =
      input.nextDueAt ??
      (tool.calibrationFrequencyDays
        ? new Date(calibratedAt.getTime() + tool.calibrationFrequencyDays * 24 * 60 * 60 * 1000)
        : undefined);

    const record = await this.prisma.calibrationRecord.create({
      data: {
        toolId: id,
        calibratedAt,
        nextDueAt,
        agency: input.agency,
        certificateNo: input.certificateNo,
        result: input.result,
        performedById: actor.id,
      },
    });
    await this.prisma.tool.update({
      where: { id },
      data: { lastCalibratedAt: calibratedAt, nextCalibrationDue: nextDueAt },
    });
    await this.audit.record(actor, {
      action: 'TOOL_CALIBRATED',
      entityType: 'Tool',
      entityId: id,
      after: { calibratedAt, nextDueAt, certificateNo: input.certificateNo },
    });
    return record;
  }
}

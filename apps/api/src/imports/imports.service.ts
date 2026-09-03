import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@gridx/db';
import {
  CRITICALITY_CLASSES,
  INSPECTION_LEVELS,
  PROCESS_TYPES,
} from '@gridx/shared';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '../common/request-user';
import { allowedCompanyIds, assertCanWriteToCompany } from '../common/company-scope';
import { parseCsvRows } from './csv';

/**
 * §25 step 4 — "create the component and drawing master". A pilot needs 15 to 25 components with
 * their routings, rates and approved partners before a single job can be raised. Entering those
 * through one form at a time is days of work and the main reason a pilot slips.
 *
 * Every import is validated in full before anything is written, and the caller can ask for the
 * validation without the write (`commit: false`), so a bad spreadsheet is a report rather than a
 * half-loaded master.
 */

export const IMPORT_ENTITIES = ['components', 'partner-rates', 'approved-partners'] as const;
export type ImportEntity = (typeof IMPORT_ENTITIES)[number];

export interface ImportIssue {
  /** 1-based row number as the person sees it in their spreadsheet, header included. */
  row: number;
  field?: string;
  message: string;
}

export interface ImportResult {
  entity: ImportEntity;
  committed: boolean;
  totalRows: number;
  valid: number;
  created: number;
  updated: number;
  issues: ImportIssue[];
}

/** Blank optional cells arrive as '' from a spreadsheet; treat them as absent. */
const blankToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === '' || value === null ? undefined : value), schema);

const optionalText = blankToUndefined(z.string().trim().min(1).optional());
const optionalNumber = blankToUndefined(z.coerce.number().optional());

const componentRowSchema = z.object({
  companyCode: z.string().trim().min(1),
  componentCode: z.string().trim().min(2),
  name: z.string().trim().min(2),
  primaryProcess: z.enum(PROCESS_TYPES),
  drawingNumber: optionalText,
  materialGrade: optionalText,
  theoreticalWeightKg: optionalNumber,
  inspectionLevel: blankToUndefined(z.enum(INSPECTION_LEVELS).default('LEVEL_2_SAMPLING')),
  criticality: blankToUndefined(z.enum(CRITICALITY_CLASSES).default('CLASS_C')),
  standardCycleTimeMinutes: optionalNumber,
  standardConversionRate: optionalNumber,
  packagingRequirement: optionalText,
  scrapAllowancePercent: blankToUndefined(z.coerce.number().min(0).max(100).default(5)),
});

const partnerRateRowSchema = z.object({
  companyCode: z.string().trim().min(1),
  partnerCode: z.string().trim().min(1),
  componentCode: z.string().trim().min(1),
  conversionRate: z.coerce.number().positive(),
  effectiveFrom: z.coerce.date(),
  minimumBatch: blankToUndefined(z.coerce.number().min(0).default(1)),
  revisionNote: optionalText,
});

const approvedPartnerRowSchema = z.object({
  componentCode: z.string().trim().min(1),
  partnerCode: z.string().trim().min(1),
  firstArticleDone: blankToUndefined(
    z
      .string()
      .trim()
      .transform((value) => ['yes', 'y', 'true', '1'].includes(value.toLowerCase()))
      .default('no'),
  ),
  remarks: optionalText,
});

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** The header row a person should start from, offered as a downloadable template. */
  template(entity: ImportEntity): string {
    const headers: Record<ImportEntity, string[]> = {
      components: [
        'companyCode',
        'componentCode',
        'name',
        'primaryProcess',
        'drawingNumber',
        'materialGrade',
        'theoreticalWeightKg',
        'inspectionLevel',
        'criticality',
        'standardCycleTimeMinutes',
        'standardConversionRate',
        'packagingRequirement',
        'scrapAllowancePercent',
      ],
      'partner-rates': [
        'companyCode',
        'partnerCode',
        'componentCode',
        'conversionRate',
        'effectiveFrom',
        'minimumBatch',
        'revisionNote',
      ],
      'approved-partners': ['componentCode', 'partnerCode', 'firstArticleDone', 'remarks'],
    };
    return `${headers[entity].join(',')}\n`;
  }

  async run(
    actor: RequestUser,
    entity: ImportEntity,
    csv: string,
    commit: boolean,
  ): Promise<ImportResult> {
    const rows = parseCsvRows(csv);
    if (rows.length === 0) {
      throw new BadRequestException('That file has a header but no rows.');
    }
    if (rows.length > 2000) {
      throw new BadRequestException('Import files are limited to 2000 rows. Split the file.');
    }

    switch (entity) {
      case 'components':
        return this.importComponents(actor, rows, commit);
      case 'partner-rates':
        return this.importPartnerRates(actor, rows, commit);
      case 'approved-partners':
        return this.importApprovedPartners(actor, rows, commit);
      default:
        throw new BadRequestException(`Unknown import: ${String(entity)}`);
    }
  }

  /** Turns a zod failure into row-and-column feedback a person can act on. */
  private issuesFrom(rowNumber: number, error: z.ZodError): ImportIssue[] {
    return error.issues.map((issue) => ({
      row: rowNumber,
      field: issue.path.join('.') || undefined,
      message: issue.message,
    }));
  }

  /** Companies the actor may write to, by code, so a CSV cannot reach across the group. */
  private async companyLookup(actor: RequestUser): Promise<Map<string, string>> {
    const ids = allowedCompanyIds(actor);
    const companies = await this.prisma.company.findMany({
      where: ids ? { id: { in: ids } } : {},
      select: { id: true, code: true },
    });
    return new Map(companies.map((company) => [company.code.toUpperCase(), company.id]));
  }

  private async importComponents(
    actor: RequestUser,
    rows: Record<string, string>[],
    commit: boolean,
  ): Promise<ImportResult> {
    const companies = await this.companyLookup(actor);
    const issues: ImportIssue[] = [];
    const parsed: Array<{ row: number; data: z.infer<typeof componentRowSchema>; companyId: string }> =
      [];
    const seen = new Set<string>();

    rows.forEach((row, index) => {
      const rowNumber = index + 2; // +1 for zero-index, +1 for the header line
      const result = componentRowSchema.safeParse(row);
      if (!result.success) {
        issues.push(...this.issuesFrom(rowNumber, result.error));
        return;
      }
      const companyId = companies.get(result.data.companyCode.toUpperCase());
      if (!companyId) {
        issues.push({
          row: rowNumber,
          field: 'companyCode',
          message: `Unknown company "${result.data.companyCode}", or you do not have access to it`,
        });
        return;
      }
      const key = `${companyId}|${result.data.componentCode.toUpperCase()}`;
      if (seen.has(key)) {
        issues.push({
          row: rowNumber,
          field: 'componentCode',
          message: `Duplicate of an earlier row in this file`,
        });
        return;
      }
      seen.add(key);
      parsed.push({ row: rowNumber, data: result.data, companyId });
    });

    if (!commit || issues.length > 0) {
      return this.dryRun('components', rows.length, parsed.length, issues, commit);
    }

    let created = 0;
    let updated = 0;
    for (const entry of parsed) {
      const existing = await this.prisma.component.findUnique({
        where: {
          companyId_componentCode: {
            companyId: entry.companyId,
            componentCode: entry.data.componentCode,
          },
        },
        select: { id: true },
      });

      const data = {
        name: entry.data.name,
        primaryProcess: entry.data.primaryProcess,
        drawingNumber: entry.data.drawingNumber,
        materialGrade: entry.data.materialGrade,
        theoreticalWeightKg: entry.data.theoreticalWeightKg,
        inspectionLevel: entry.data.inspectionLevel,
        criticality: entry.data.criticality,
        standardCycleTimeMinutes: entry.data.standardCycleTimeMinutes,
        standardConversionRate: entry.data.standardConversionRate,
        packagingRequirement: entry.data.packagingRequirement,
        scrapAllowancePercent: entry.data.scrapAllowancePercent,
      } satisfies Prisma.ComponentUpdateInput;

      if (existing) {
        await this.prisma.component.update({ where: { id: existing.id }, data });
        updated += 1;
      } else {
        await this.prisma.component.create({
          data: {
            ...data,
            companyId: entry.companyId,
            componentCode: entry.data.componentCode,
            criticalityHistory: {
              create: { criticality: entry.data.criticality, reason: 'Imported' },
            },
          },
        });
        created += 1;
      }
    }

    await this.record(actor, 'components', rows.length, created, updated);
    return {
      entity: 'components',
      committed: true,
      totalRows: rows.length,
      valid: parsed.length,
      created,
      updated,
      issues,
    };
  }

  private async importPartnerRates(
    actor: RequestUser,
    rows: Record<string, string>[],
    commit: boolean,
  ): Promise<ImportResult> {
    const companies = await this.companyLookup(actor);
    const [partners, components] = await Promise.all([
      this.prisma.partner.findMany({ select: { id: true, partnerCode: true, companyId: true } }),
      this.prisma.component.findMany({
        select: { id: true, componentCode: true, companyId: true },
      }),
    ]);
    const partnerByCode = new Map(partners.map((p) => [p.partnerCode.toUpperCase(), p]));
    const componentByCode = new Map(components.map((c) => [c.componentCode.toUpperCase(), c]));

    const issues: ImportIssue[] = [];
    const parsed: Array<{
      data: z.infer<typeof partnerRateRowSchema>;
      companyId: string;
      partnerId: string;
      componentId: string;
    }> = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const result = partnerRateRowSchema.safeParse(row);
      if (!result.success) {
        issues.push(...this.issuesFrom(rowNumber, result.error));
        return;
      }
      const companyId = companies.get(result.data.companyCode.toUpperCase());
      const partner = partnerByCode.get(result.data.partnerCode.toUpperCase());
      const component = componentByCode.get(result.data.componentCode.toUpperCase());

      if (!companyId) {
        issues.push({ row: rowNumber, field: 'companyCode', message: 'Unknown or inaccessible company' });
        return;
      }
      if (!partner) {
        issues.push({ row: rowNumber, field: 'partnerCode', message: 'No partner with that code' });
        return;
      }
      if (!component) {
        issues.push({
          row: rowNumber,
          field: 'componentCode',
          message: 'No component with that code — import components first',
        });
        return;
      }
      if (partner.companyId !== companyId || component.companyId !== companyId) {
        issues.push({
          row: rowNumber,
          message: 'The partner and the component must belong to the company on this row',
        });
        return;
      }
      parsed.push({ data: result.data, companyId, partnerId: partner.id, componentId: component.id });
    });

    if (!commit || issues.length > 0) {
      return this.dryRun('partner-rates', rows.length, parsed.length, issues, commit);
    }

    let created = 0;
    let updated = 0;
    for (const entry of parsed) {
      // Rate revisions keep history: close the current rate rather than overwriting it.
      const current = await this.prisma.partnerRate.findFirst({
        where: { partnerId: entry.partnerId, componentId: entry.componentId, isActive: true },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (current) {
        await this.prisma.partnerRate.update({
          where: { id: current.id },
          data: { isActive: false, effectiveTo: entry.data.effectiveFrom },
        });
        updated += 1;
      }
      await this.prisma.partnerRate.create({
        data: {
          companyId: entry.companyId,
          partnerId: entry.partnerId,
          componentId: entry.componentId,
          conversionRate: entry.data.conversionRate,
          effectiveFrom: entry.data.effectiveFrom,
          minimumBatch: entry.data.minimumBatch,
          revisionNote: entry.data.revisionNote ?? 'Imported',
          previousRate: current?.conversionRate,
        },
      });
      created += 1;
    }

    await this.record(actor, 'partner-rates', rows.length, created, updated);
    return {
      entity: 'partner-rates',
      committed: true,
      totalRows: rows.length,
      valid: parsed.length,
      created,
      updated,
      issues,
    };
  }

  private async importApprovedPartners(
    actor: RequestUser,
    rows: Record<string, string>[],
    commit: boolean,
  ): Promise<ImportResult> {
    const [partners, components] = await Promise.all([
      this.prisma.partner.findMany({
        select: { id: true, partnerCode: true, companyId: true, capabilities: true },
      }),
      this.prisma.component.findMany({
        select: { id: true, componentCode: true, companyId: true, primaryProcess: true },
      }),
    ]);
    const partnerByCode = new Map(partners.map((p) => [p.partnerCode.toUpperCase(), p]));
    const componentByCode = new Map(components.map((c) => [c.componentCode.toUpperCase(), c]));

    const issues: ImportIssue[] = [];
    const parsed: Array<{
      data: z.infer<typeof approvedPartnerRowSchema>;
      partnerId: string;
      componentId: string;
    }> = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const result = approvedPartnerRowSchema.safeParse(row);
      if (!result.success) {
        issues.push(...this.issuesFrom(rowNumber, result.error));
        return;
      }
      const partner = partnerByCode.get(result.data.partnerCode.toUpperCase());
      const component = componentByCode.get(result.data.componentCode.toUpperCase());
      if (!partner || !component) {
        issues.push({
          row: rowNumber,
          message: !partner ? 'No partner with that code' : 'No component with that code',
        });
        return;
      }

      try {
        assertCanWriteToCompany(actor, component.companyId);
      } catch {
        issues.push({ row: rowNumber, message: 'That component belongs to another company' });
        return;
      }

      // The same rule the single-record path enforces: a partner cannot be approved for a
      // component whose primary process they are not approved to run.
      const capable = partner.capabilities.some(
        (capability) =>
          capability.process === component.primaryProcess && capability.isApproved,
      );
      if (!capable) {
        issues.push({
          row: rowNumber,
          field: 'partnerCode',
          message: `${result.data.partnerCode} has no approved ${component.primaryProcess} capability`,
        });
        return;
      }
      parsed.push({ data: result.data, partnerId: partner.id, componentId: component.id });
    });

    if (!commit || issues.length > 0) {
      return this.dryRun('approved-partners', rows.length, parsed.length, issues, commit);
    }

    let created = 0;
    let updated = 0;
    for (const entry of parsed) {
      const existing = await this.prisma.approvedPartnerComponent.findUnique({
        where: {
          componentId_partnerId: { componentId: entry.componentId, partnerId: entry.partnerId },
        },
        select: { id: true },
      });
      const firstArticleDone = Boolean(entry.data.firstArticleDone);
      const payload = {
        isActive: true,
        firstArticleDone,
        firstArticleDate: firstArticleDone ? new Date() : null,
        remarks: entry.data.remarks,
      };

      if (existing) {
        await this.prisma.approvedPartnerComponent.update({
          where: { id: existing.id },
          data: payload,
        });
        updated += 1;
      } else {
        await this.prisma.approvedPartnerComponent.create({
          data: {
            componentId: entry.componentId,
            partnerId: entry.partnerId,
            approvedBy: actor.id,
            ...payload,
          },
        });
        created += 1;
      }
    }

    await this.record(actor, 'approved-partners', rows.length, created, updated);
    return {
      entity: 'approved-partners',
      committed: true,
      totalRows: rows.length,
      valid: parsed.length,
      created,
      updated,
      issues,
    };
  }

  /** Nothing is written when the caller asked for a dry run, or when any row failed. */
  private dryRun(
    entity: ImportEntity,
    totalRows: number,
    valid: number,
    issues: ImportIssue[],
    commit: boolean,
  ): ImportResult {
    if (commit && issues.length > 0) {
      this.logger.warn(`Import of ${entity} rejected: ${issues.length} row problem(s)`);
    }
    return { entity, committed: false, totalRows, valid, created: 0, updated: 0, issues };
  }

  private async record(
    actor: RequestUser,
    entity: ImportEntity,
    totalRows: number,
    created: number,
    updated: number,
  ): Promise<void> {
    await this.audit.record(actor, {
      action: 'MASTER_DATA_IMPORTED',
      entityType: 'Import',
      entityId: entity,
      after: { entity, totalRows, created, updated },
    });
  }
}

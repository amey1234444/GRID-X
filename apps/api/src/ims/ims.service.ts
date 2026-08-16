import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@gridx/db';
import { z } from 'zod';
import { AppConfig } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '../common/request-user';

/** Entities GRID-X consumes from IMS (Section 10). */
export const IMS_INBOUND_ENTITIES = [
  'companies',
  'products',
  'items',
  'sales-orders',
  'work-orders',
  'suppliers',
  'stock',
  'warehouses',
  'material-transactions',
  'users',
  'purchase-orders',
] as const;
export type ImsInboundEntity = (typeof IMS_INBOUND_ENTITIES)[number];

/** Facts GRID-X pushes back to IMS (Section 10). */
export const IMS_OUTBOUND_ENTITIES = [
  'outsourced-work-order-status',
  'material-issued',
  'finished-components-received',
  'rejected-quantities',
  'conversion-cost',
  'partner-invoices',
  'actual-completion-dates',
] as const;
export type ImsOutboundEntity = (typeof IMS_OUTBOUND_ENTITIES)[number];

const imsCompanySchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  legalName: z.string().trim().optional(),
  gstNumber: z.string().trim().optional(),
  panNumber: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
});

const imsItemSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  uom: z.string().trim().default('KG'),
  materialGrade: z.string().trim().optional(),
  unitWeightKg: z.coerce.number().optional(),
  standardRate: z.coerce.number().optional(),
  imsRef: z.string().trim().optional(),
});

const imsProductSchema = z.object({
  companyCode: z.string().trim().min(1),
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  imsRef: z.string().trim().optional(),
});

export interface SyncSummary {
  entity: string;
  received: number;
  created: number;
  updated: number;
  skipped: number;
  message?: string;
}

/**
 * Section 10 — the IMS boundary. GRID-X owns external distributed manufacturing only; masters
 * flow inbound from IMS and outsourcing facts flow back outbound. Every call is logged so the
 * boundary stays auditable even when the IMS endpoint is unavailable.
 */
@Injectable()
export class ImsService {
  private readonly logger = new Logger(ImsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  private imsConfig(): AppConfig['ims'] {
    return this.config.get('ims', { infer: true });
  }

  status(): AppConfig['ims'] & { configured: boolean } {
    const ims = this.imsConfig();
    return { ...ims, configured: Boolean(ims.enabled && ims.baseUrl) };
  }

  async listLogs(limit = 100) {
    return this.prisma.imsSyncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
    });
  }

  private async log(input: {
    direction: 'INBOUND' | 'OUTBOUND';
    entity: string;
    recordRef?: string | null;
    payload?: Prisma.InputJsonValue;
    success: boolean;
    message?: string;
    companyId?: string | null;
  }): Promise<void> {
    await this.prisma.imsSyncLog.create({
      data: {
        direction: input.direction,
        entity: input.entity,
        recordRef: input.recordRef ?? null,
        payload: input.payload,
        success: input.success,
        message: input.message,
        companyId: input.companyId ?? null,
      },
    });
  }

  private async fetchFromIms(entity: ImsInboundEntity): Promise<unknown[]> {
    const ims = this.imsConfig();
    if (!ims.enabled || !ims.baseUrl) {
      throw new Error('IMS integration is not configured');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ims.timeoutMs);
    try {
      const response = await fetch(`${ims.baseUrl.replace(/\/$/, '')}/${entity}`, {
        headers: ims.apiKey ? { Authorization: `Bearer ${ims.apiKey}` } : {},
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`IMS responded ${response.status}`);
      }
      const body: unknown = await response.json();
      if (Array.isArray(body)) return body;
      if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown[] }).data)) {
        return (body as { data: unknown[] }).data;
      }
      throw new Error('Unexpected IMS payload shape');
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Pulls a master entity from IMS. Only masters GRID-X genuinely needs locally are persisted;
   * transactional IMS data (stock, purchase orders, sales orders) is logged as a read-through so
   * GRID-X never becomes a second source of truth for it.
   */
  async pull(
    actor: RequestUser,
    entity: ImsInboundEntity,
    payload?: unknown[],
  ): Promise<SyncSummary> {
    let records: unknown[];
    try {
      records = payload ?? (await this.fetchFromIms(entity));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'IMS fetch failed';
      await this.log({ direction: 'INBOUND', entity, success: false, message });
      return { entity, received: 0, created: 0, updated: 0, skipped: 0, message };
    }

    const summary =
      entity === 'companies'
        ? await this.upsertCompanies(records)
        : entity === 'items'
          ? await this.upsertItems(records)
          : entity === 'products'
            ? await this.upsertProducts(records)
            : {
                entity,
                received: records.length,
                created: 0,
                updated: 0,
                skipped: records.length,
                message: 'Read-through entity: IMS remains the system of record',
              };

    await this.log({
      direction: 'INBOUND',
      entity,
      success: true,
      message: summary.message,
      payload: { received: summary.received, created: summary.created, updated: summary.updated },
    });
    await this.audit.record(actor, {
      action: 'IMS_PULL',
      entityType: 'ImsSyncLog',
      after: { ...summary, entity },
    });
    return summary;
  }

  private async upsertCompanies(records: unknown[]): Promise<SyncSummary> {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    for (const record of records) {
      const parsed = imsCompanySchema.safeParse(record);
      if (!parsed.success) {
        skipped += 1;
        continue;
      }
      const existing = await this.prisma.company.findUnique({ where: { code: parsed.data.code } });
      await this.prisma.company.upsert({
        where: { code: parsed.data.code },
        create: parsed.data,
        update: parsed.data,
      });
      if (existing) updated += 1;
      else created += 1;
    }
    return { entity: 'companies', received: records.length, created, updated, skipped };
  }

  private async upsertItems(records: unknown[]): Promise<SyncSummary> {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    for (const record of records) {
      const parsed = imsItemSchema.safeParse(record);
      if (!parsed.success) {
        skipped += 1;
        continue;
      }
      const existing = await this.prisma.item.findUnique({ where: { code: parsed.data.code } });
      await this.prisma.item.upsert({
        where: { code: parsed.data.code },
        create: parsed.data,
        update: parsed.data,
      });
      if (existing) updated += 1;
      else created += 1;
    }
    return { entity: 'items', received: records.length, created, updated, skipped };
  }

  private async upsertProducts(records: unknown[]): Promise<SyncSummary> {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    for (const record of records) {
      const parsed = imsProductSchema.safeParse(record);
      if (!parsed.success) {
        skipped += 1;
        continue;
      }
      const company = await this.prisma.company.findUnique({
        where: { code: parsed.data.companyCode },
      });
      if (!company) {
        skipped += 1;
        continue;
      }
      const data = {
        companyId: company.id,
        code: parsed.data.code,
        name: parsed.data.name,
        description: parsed.data.description,
        imsRef: parsed.data.imsRef,
      };
      const existing = await this.prisma.product.findUnique({
        where: { companyId_code: { companyId: company.id, code: parsed.data.code } },
      });
      await this.prisma.product.upsert({
        where: { companyId_code: { companyId: company.id, code: parsed.data.code } },
        create: data,
        update: data,
      });
      if (existing) updated += 1;
      else created += 1;
    }
    return { entity: 'products', received: records.length, created, updated, skipped };
  }

  /** Builds and pushes the outbound payload for a job or invoice. */
  async push(
    actor: RequestUser,
    entity: ImsOutboundEntity,
    recordRef: string,
  ): Promise<{ entity: string; delivered: boolean; payload: Prisma.InputJsonValue }> {
    const payload = await this.buildOutboundPayload(entity, recordRef);
    const ims = this.imsConfig();
    let delivered = false;
    let message: string | undefined;

    if (ims.enabled && ims.baseUrl) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ims.timeoutMs);
      try {
        const response = await fetch(`${ims.baseUrl.replace(/\/$/, '')}/${entity}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(ims.apiKey ? { Authorization: `Bearer ${ims.apiKey}` } : {}),
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        delivered = response.ok;
        if (!response.ok) message = `IMS responded ${response.status}`;
      } catch (error) {
        message = error instanceof Error ? error.message : 'IMS push failed';
        this.logger.warn(`IMS push failed for ${entity}: ${message}`);
      } finally {
        clearTimeout(timer);
      }
    } else {
      message = 'IMS integration is not configured; payload queued in the sync log';
    }

    await this.log({
      direction: 'OUTBOUND',
      entity,
      recordRef,
      payload,
      success: delivered,
      message,
    });
    await this.audit.record(actor, {
      action: 'IMS_PUSH',
      entityType: 'ImsSyncLog',
      entityId: recordRef,
      after: { entity, delivered, message },
    });
    return { entity, delivered, payload };
  }

  private async buildOutboundPayload(
    entity: ImsOutboundEntity,
    recordRef: string,
  ): Promise<Prisma.InputJsonValue> {
    if (entity === 'partner-invoices') {
      const invoice = await this.prisma.partnerInvoice.findUniqueOrThrow({
        where: { id: recordRef },
        include: {
          partner: { select: { businessName: true, partnerCode: true } },
          items: {
            select: {
              jobId: true,
              acceptedQuantity: true,
              conversionRate: true,
              amount: true,
            },
          },
        },
      });
      return {
        invoiceNumber: invoice.invoiceNumber,
        partnerCode: invoice.partner.partnerCode,
        partnerName: invoice.partner.businessName,
        status: invoice.status,
        invoiceDate: invoice.invoiceDate.toISOString(),
        basicAmount: invoice.basicAmount,
        deductionAmount: invoice.deductionAmount,
        taxAmount: invoice.taxAmount,
        netAmount: invoice.netAmount,
        paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
        items: invoice.items.map((item) => ({
          jobId: item.jobId,
          acceptedQuantity: item.acceptedQuantity,
          conversionRate: item.conversionRate,
          amount: item.amount,
        })),
      };
    }

    const job = await this.prisma.gridJob.findUniqueOrThrow({
      where: { id: recordRef },
      include: {
        component: { select: { componentCode: true, name: true } },
        partner: { select: { partnerCode: true, businessName: true } },
        materialIssues: {
          include: { items: { include: { item: { select: { code: true } } } } },
        },
      },
    });

    const base = {
      jobNumber: job.jobNumber,
      sourceRef: job.sourceRef,
      componentCode: job.component.componentCode,
      partnerCode: job.partner?.partnerCode ?? null,
      partnerName: job.partner?.businessName ?? null,
    };

    switch (entity) {
      case 'outsourced-work-order-status':
        return {
          ...base,
          status: job.status,
          quantity: job.quantity,
          dispatchedQuantity: job.dispatchedQuantity,
          receivedQuantity: job.receivedQuantity,
          dueDate: job.dueDate.toISOString(),
        };
      case 'material-issued':
        return {
          ...base,
          issues: job.materialIssues.map((issue) => ({
            challanNumber: issue.challanNumber,
            status: issue.status,
            issueDate: issue.issueDate ? issue.issueDate.toISOString() : null,
            items: issue.items.map((item) => ({
              itemCode: item.item.code,
              quantity: item.quantity,
              uom: item.uom,
              weightKg: item.issueWeightKg,
            })),
          })),
        };
      case 'finished-components-received':
        return {
          ...base,
          receivedQuantity: job.receivedQuantity,
          acceptedQuantity: job.acceptedQuantity,
        };
      case 'rejected-quantities':
        return {
          ...base,
          rejectedQuantity: job.rejectedQuantity,
          reworkQuantity: job.reworkQuantity,
        };
      case 'conversion-cost':
        return {
          ...base,
          rate: job.rate,
          acceptedQuantity: job.acceptedQuantity,
          conversionCost: job.rate * job.acceptedQuantity,
        };
      case 'actual-completion-dates':
        return {
          ...base,
          productionStartedAt: job.productionStartedAt
            ? job.productionStartedAt.toISOString()
            : null,
          completedAt: job.completedAt ? job.completedAt.toISOString() : null,
          closedAt: job.closedAt ? job.closedAt.toISOString() : null,
        };
      default:
        return base;
    }
  }
}

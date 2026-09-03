import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@gridx/db';
import { AppConfig } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '../common/request-user';
import { DatabaseImsDriver, type ImsIntrospection } from './drivers/database.driver';
import { DisabledImsDriver } from './drivers/disabled.driver';
import { HttpImsDriver } from './drivers/http.driver';
import {
  IMS_ENTITY_SCHEMAS,
  IMS_INBOUND_ENTITIES,
  IMS_OUTBOUND_ENTITIES,
  IMS_PERSISTED_ENTITIES,
  imsCompanySchema,
  imsItemSchema,
  imsOrderSchema,
  imsProductSchema,
  imsStockSchema,
  isPersistedEntity,
  type ImsGateway,
  type ImsHealth,
  type ImsInboundEntity,
  type ImsOrderOption,
  type ImsOutboundEntity,
  type ImsStockRecord,
} from './ims.contract';

export {
  IMS_INBOUND_ENTITIES,
  IMS_OUTBOUND_ENTITIES,
  IMS_PERSISTED_ENTITIES,
  type ImsInboundEntity,
  type ImsOutboundEntity,
  type ImsOrderOption,
};

/** After this many failed attempts an outbound fact is abandoned and raised to an operator. */
export const MAX_PUSH_ATTEMPTS = 8;

/** Exponential backoff, 1 minute doubling to a 6-hour ceiling. */
export function backoffFrom(attempts: number, now: Date = new Date()): Date {
  const minutes = Math.min(6 * 60, 2 ** Math.max(0, attempts - 1));
  return new Date(now.getTime() + minutes * 60_000);
}

/** Where a per-entity incremental watermark lives. `SystemSetting` already exists; no migration. */
const CURSOR_PREFIX = 'ims:cursor:';

export interface SyncSummary {
  entity: string;
  received: number;
  created: number;
  updated: number;
  skipped: number;
  message?: string;
  /** The watermark stored after this sync, when the entity supports incremental reads. */
  watermark?: string | null;
  /** Where the rows came from — an endpoint or a schema-qualified table. */
  source?: string;
}

export interface ImsStatus {
  enabled: boolean;
  configured: boolean;
  driver: 'database' | 'http' | 'disabled';
  writeMode: 'outbox' | 'http' | 'none';
  baseUrl?: string;
  databaseUrl?: string;
  schema?: string;
  outboxTable?: string;
  mappingProfile: string;
  mappingOverrides: string[];
  mappingWarnings: string[];
  timeoutMs: number;
  statementTimeoutMs: number;
  inboundSyncEnabled: boolean;
  syncEntities: string[];
  batchSize: number;
}

/**
 * Section 10 — the IMS boundary. GRID-X owns external distributed manufacturing only; masters
 * flow inbound from IMS and outsourcing facts flow back outbound.
 *
 * This service owns the *meaning* of the boundary — what is persisted, what is read-through, how
 * a failed delivery is retried and what gets audited. It owns none of the transport: that is an
 * `ImsGateway`, either a direct PostgreSQL connection to the IMS database or the IMS REST API.
 * Every call is logged either way, so the boundary stays auditable even when IMS is unreachable.
 */
@Injectable()
export class ImsService {
  private readonly logger = new Logger(ImsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly databaseDriver: DatabaseImsDriver,
    private readonly httpDriver: HttpImsDriver,
    private readonly disabledDriver: DisabledImsDriver,
  ) {}

  private imsConfig(): AppConfig['ims'] {
    return this.config.get('ims', { infer: true });
  }

  /** The transport in force. Read fresh each call so a config reload is picked up. */
  private gateway(): ImsGateway {
    const { driver } = this.imsConfig();
    if (driver === 'database') return this.databaseDriver;
    if (driver === 'http') return this.httpDriver;
    return this.disabledDriver;
  }

  /**
   * Outbound facts can travel a different road from inbound reads: a deployment may read the IMS
   * database directly but still be asked to POST facts to the IMS API.
   */
  private writeGateway(): ImsGateway {
    const { write } = this.imsConfig();
    if (write.mode === 'http') return this.httpDriver;
    if (write.mode === 'none') return this.disabledDriver;
    return this.gateway();
  }

  // -------------------------------------------------------------------------
  // Status, health and mapping
  // -------------------------------------------------------------------------

  status(): ImsStatus {
    const ims = this.imsConfig();
    const gateway = this.gateway();
    const mapping = ims.driver === 'database' ? this.databaseDriver.mapping() : null;

    return {
      enabled: ims.enabled,
      configured: gateway.isConfigured(),
      driver: ims.driver,
      writeMode: ims.write.mode,
      baseUrl: ims.baseUrl,
      databaseUrl: ims.driver === 'database' ? this.databaseDriverUrl() : undefined,
      schema: ims.driver === 'database' ? ims.database.schema : undefined,
      outboxTable:
        ims.write.mode === 'outbox' ? `${ims.write.schema}.${ims.write.table}` : undefined,
      mappingProfile: ims.mapping.profile,
      mappingOverrides: mapping?.overridden ?? [],
      mappingWarnings: mapping?.warnings ?? [],
      timeoutMs: ims.timeoutMs,
      statementTimeoutMs: ims.database.statementTimeoutMs,
      inboundSyncEnabled: ims.sync.inboundEnabled,
      syncEntities: ims.sync.entities,
      batchSize: ims.sync.batchSize,
    };
  }

  private databaseDriverUrl(): string | undefined {
    // The password never leaves the process; the host and database name are what an operator
    // actually needs to confirm they are pointed at the right IMS.
    return this.databaseDriver.isConfigured() ? this.redactedDatabaseUrl() : undefined;
  }

  private redactedDatabaseUrl(): string | undefined {
    const url = this.imsConfig().database.url;
    if (!url) return undefined;
    try {
      const parsed = new URL(url);
      if (parsed.password) parsed.password = '***';
      return parsed.toString();
    } catch {
      return 'set (unparseable)';
    }
  }

  async health(): Promise<ImsHealth> {
    return this.gateway().health();
  }

  /**
   * The mapping checked against the live IMS schema. Only meaningful for the direct driver —
   * over HTTP there is no schema to compare against.
   */
  async introspect(): Promise<ImsIntrospection> {
    if (this.imsConfig().driver !== 'database') {
      throw new BadRequestException(
        'Schema introspection needs the direct database driver. Set IMS_DRIVER=database and IMS_DATABASE_URL.',
      );
    }
    return this.databaseDriver.introspect();
  }

  /** The effective mapping, for the Control screen and for support. */
  mapping(): { profile: string; overridden: string[]; warnings: string[]; mapping: unknown } {
    const ims = this.imsConfig();
    if (ims.driver !== 'database') {
      return { profile: ims.mapping.profile, overridden: [], warnings: [], mapping: null };
    }
    const loaded = this.databaseDriver.mapping();
    return {
      profile: ims.mapping.profile,
      overridden: loaded.overridden,
      warnings: loaded.warnings,
      mapping: loaded.mapping,
    };
  }

  async listLogs(limit = 100) {
    return this.prisma.imsSyncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
    });
  }

  // -------------------------------------------------------------------------
  // Sync log
  // -------------------------------------------------------------------------

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
        nextAttemptAt:
          input.direction === 'OUTBOUND' && !input.success ? backoffFrom(1) : null,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Incremental watermarks
  // -------------------------------------------------------------------------

  /**
   * The last change timestamp GRID-X has seen for an entity. Stored in `SystemSetting` rather
   * than a table of its own: it is one small row per entity and it must survive a redeploy,
   * which is exactly what that table is for.
   */
  private async readCursor(entity: ImsInboundEntity): Promise<Date | undefined> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: `${CURSOR_PREFIX}${entity}` },
    });
    const value = row?.value as { watermark?: string } | null;
    if (!value?.watermark) return undefined;
    const parsed = new Date(value.watermark);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private async writeCursor(entity: ImsInboundEntity, watermark: Date): Promise<void> {
    const value = { watermark: watermark.toISOString(), syncedAt: new Date().toISOString() };
    await this.prisma.systemSetting.upsert({
      where: { key: `${CURSOR_PREFIX}${entity}` },
      create: { key: `${CURSOR_PREFIX}${entity}`, value },
      update: { value },
    });
  }

  /** Clears a watermark so the next sync reads the entity in full. */
  async resetCursor(entity: ImsInboundEntity): Promise<{ entity: string; cleared: boolean }> {
    const deleted = await this.prisma.systemSetting.deleteMany({
      where: { key: `${CURSOR_PREFIX}${entity}` },
    });
    return { entity, cleared: deleted.count > 0 };
  }

  async cursors(): Promise<Array<{ entity: string; watermark: string; syncedAt: string }>> {
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { startsWith: CURSOR_PREFIX } },
    });
    return rows.map((row) => {
      const value = (row.value ?? {}) as { watermark?: string; syncedAt?: string };
      return {
        entity: row.key.slice(CURSOR_PREFIX.length),
        watermark: value.watermark ?? '',
        syncedAt: value.syncedAt ?? row.updatedAt.toISOString(),
      };
    });
  }

  // -------------------------------------------------------------------------
  // Inbound
  // -------------------------------------------------------------------------

  /**
   * Pulls a master entity from IMS. Only masters GRID-X genuinely needs locally are persisted;
   * transactional IMS data (stock, purchase orders, sales orders) is logged as a read-through so
   * GRID-X never becomes a second source of truth for it.
   *
   * `payload` lets an operator (or a test) post records directly to GRID-X instead of reading
   * them from IMS, which is how the boundary is exercised before an IMS credential exists.
   */
  async pull(
    actor: RequestUser | null,
    entity: ImsInboundEntity,
    payload?: unknown[],
    options: { incremental?: boolean } = {},
  ): Promise<SyncSummary> {
    let records: unknown[];
    let watermark: Date | null = null;
    let source = 'operator-supplied payload';

    if (payload) {
      // Posted records still go through the boundary contract, so a hand-fed payload cannot put
      // a shape into the database that a real IMS read never would.
      const schema = IMS_ENTITY_SCHEMAS[entity];
      records = payload
        .map((row) => schema.safeParse(row))
        .filter((parsed): parsed is { success: true; data: unknown } => parsed.success)
        .map((parsed) => parsed.data);
    } else {
      const since = options.incremental ? await this.readCursor(entity) : undefined;
      try {
        const result = await this.gateway().fetch(entity, {
          since,
          limit: this.imsConfig().sync.batchSize,
        });
        records = result.records;
        watermark = result.watermark;
        source = result.source;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'IMS fetch failed';
        await this.log({ direction: 'INBOUND', entity, success: false, message });
        return { entity, received: 0, created: 0, updated: 0, skipped: 0, message };
      }
    }

    const summary = await this.persist(entity, records);
    summary.source = source;

    if (watermark) {
      await this.writeCursor(entity, watermark);
      summary.watermark = watermark.toISOString();
    }

    await this.log({
      direction: 'INBOUND',
      entity,
      success: true,
      message: summary.message,
      payload: {
        received: summary.received,
        created: summary.created,
        updated: summary.updated,
        skipped: summary.skipped,
        source,
        watermark: summary.watermark ?? null,
      },
    });
    await this.audit.record(actor, {
      action: 'IMS_PULL',
      entityType: 'ImsSyncLog',
      after: { ...summary, entity },
    });
    return summary;
  }

  /**
   * The scheduled sweep: every configured entity, incrementally, in order. Returning a summary
   * per entity rather than a single number means a partial failure is visible — "items synced,
   * products did not" is actionable in a way that "sync failed" is not.
   */
  async syncAll(actor: RequestUser | null = null): Promise<SyncSummary[]> {
    const { sync } = this.imsConfig();
    const summaries: SyncSummary[] = [];
    for (const name of sync.entities) {
      if (!(IMS_INBOUND_ENTITIES as readonly string[]).includes(name)) {
        summaries.push({
          entity: name,
          received: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          message: 'Not an IMS boundary entity; check IMS_SYNC_ENTITIES',
        });
        continue;
      }
      summaries.push(
        await this.pull(actor, name as ImsInboundEntity, undefined, { incremental: true }),
      );
    }
    return summaries;
  }

  private async persist(entity: ImsInboundEntity, records: unknown[]): Promise<SyncSummary> {
    if (!isPersistedEntity(entity)) {
      return {
        entity,
        received: records.length,
        created: 0,
        updated: 0,
        skipped: records.length,
        message: 'Read-through entity: IMS remains the system of record',
      };
    }
    if (entity === 'companies') return this.upsertCompanies(records);
    if (entity === 'items') return this.upsertItems(records);
    return this.upsertProducts(records);
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
        // A product whose company has not been pulled yet is skipped, not invented: creating a
        // placeholder company would put a record into GRID-X that IMS never sent.
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

  // -------------------------------------------------------------------------
  // Read-through lookups
  // -------------------------------------------------------------------------

  /**
   * Module 4 — "a GRID-X job should be generated from a sales order, a work order …".
   *
   * These are read live rather than copied in: Section 10 is explicit that GRID-X must not
   * duplicate inventory, purchase-order or customer data. The planner picks an order here and
   * only its reference is stored on the job, so IMS stays the system of record for the order.
   */
  async lookupOrders(
    entity: Extract<ImsInboundEntity, 'sales-orders' | 'work-orders'>,
    search?: string,
  ): Promise<ImsOrderOption[]> {
    const gateway = this.gateway();
    if (!gateway.isConfigured()) {
      throw new BadRequestException(
        'IMS integration is not configured, so orders cannot be looked up. Raise the job manually.',
      );
    }
    const result = await gateway.fetch(entity, { search, limit: 50 });
    return result.records
      .map((record) => imsOrderSchema.safeParse(record))
      .filter((parsed): parsed is { success: true; data: ImsOrderOption } => parsed.success)
      .map((parsed) => parsed.data);
  }

  /**
   * Live stock, for a stores user deciding whether a job's material can be issued at all. Read
   * only — GRID-X tracks material *under partner custody*, never IMS's warehouse balances.
   */
  async readStock(search?: string, limit = 100): Promise<ImsStockRecord[]> {
    const gateway = this.gateway();
    if (!gateway.isConfigured()) {
      throw new BadRequestException('IMS integration is not configured, so stock cannot be read.');
    }
    const result = await gateway.fetch('stock', { search, limit });
    return result.records
      .map((record) => imsStockSchema.safeParse(record))
      .filter((parsed): parsed is { success: true; data: ImsStockRecord } => parsed.success)
      .map((parsed) => parsed.data);
  }

  /**
   * Reads an entity without persisting anything, so an operator can confirm a mapping returns
   * the rows they expect before turning the scheduled sync on.
   */
  async preview(entity: ImsInboundEntity, limit = 10): Promise<{ source: string; rows: unknown[] }> {
    const gateway = this.gateway();
    if (!gateway.isConfigured()) {
      throw new BadRequestException('IMS integration is not configured.');
    }
    const result = await gateway.fetch(entity, { limit });
    return { source: result.source, rows: result.records };
  }

  // -------------------------------------------------------------------------
  // Outbound
  // -------------------------------------------------------------------------

  /**
   * Section 10 — replays outbound facts IMS has not accepted yet. Without this the sync log says
   * "queued" and means "dropped": a job closed while IMS was down would never reach it.
   *
   * Delivery is at-least-once with exponential backoff. A repeated `recordRef` for the same
   * entity is an update, not a duplicate — the outbox upserts on it, and an HTTP IMS is expected
   * to do the same, which it must anyway because a job can be reopened and re-closed.
   */
  async retryFailedPushes(limit = 50): Promise<{ attempted: number; delivered: number }> {
    const now = new Date();
    const pending = await this.prisma.imsSyncLog.findMany({
      where: {
        direction: 'OUTBOUND',
        success: false,
        abandonedAt: null,
        attempts: { lt: MAX_PUSH_ATTEMPTS },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    let delivered = 0;
    for (const row of pending) {
      const payload = (row.payload ?? {}) as Record<string, unknown>;
      const failure = await this.writeGateway().deliver(
        row.entity as ImsOutboundEntity,
        row.recordRef ?? row.id,
        payload,
      );
      const attempts = row.attempts + 1;

      if (!failure) {
        delivered += 1;
        await this.prisma.imsSyncLog.update({
          where: { id: row.id },
          data: {
            success: true,
            attempts,
            message: `Delivered on attempt ${attempts}`,
            nextAttemptAt: null,
          },
        });
        continue;
      }

      const exhausted = attempts >= MAX_PUSH_ATTEMPTS;
      await this.prisma.imsSyncLog.update({
        where: { id: row.id },
        data: {
          attempts,
          message: failure,
          nextAttemptAt: exhausted ? null : backoffFrom(attempts),
          abandonedAt: exhausted ? new Date() : null,
        },
      });
      if (exhausted) {
        this.logger.error(
          `Giving up on IMS ${row.entity} for ${row.recordRef} after ${attempts} attempts: ${failure}`,
        );
      }
    }

    if (pending.length > 0) {
      this.logger.log(`IMS retry: ${delivered}/${pending.length} pending pushes delivered`);
    }
    return { attempted: pending.length, delivered };
  }

  /**
   * Fire-and-forget push used by the modules that produce outbound facts. Failures are queued for
   * the retry worker rather than thrown, so a closing job is never blocked by the IMS being down.
   */
  async pushInBackground(entity: ImsOutboundEntity, recordRef: string): Promise<void> {
    try {
      await this.push(null, entity, recordRef);
    } catch (error) {
      this.logger.warn(`Could not queue IMS ${entity} for ${recordRef}: ${String(error)}`);
    }
  }

  /** Builds and pushes the outbound payload for a job or invoice. */
  /** `actor` is null when a module pushes automatically rather than an operator clicking push. */
  async push(
    actor: RequestUser | null,
    entity: ImsOutboundEntity,
    recordRef: string,
  ): Promise<{ entity: string; delivered: boolean; payload: Prisma.InputJsonValue }> {
    const payload = await this.buildOutboundPayload(entity, recordRef);
    const failure = await this.writeGateway().deliver(entity, recordRef, payload);
    const delivered = failure === null;
    const message = failure ?? undefined;
    if (failure) this.logger.warn(`IMS push failed for ${entity}: ${failure}`);

    await this.log({
      direction: 'OUTBOUND',
      entity,
      recordRef,
      payload: payload as Prisma.InputJsonValue,
      success: delivered,
      message,
    });
    await this.audit.record(actor, {
      action: 'IMS_PUSH',
      entityType: 'ImsSyncLog',
      entityId: recordRef,
      after: { entity, delivered, message },
    });
    return { entity, delivered, payload: payload as Prisma.InputJsonValue };
  }

  private async buildOutboundPayload(
    entity: ImsOutboundEntity,
    recordRef: string,
  ): Promise<Record<string, unknown>> {
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

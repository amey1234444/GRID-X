import { BadRequestException } from '@nestjs/common';
import { ImsService, MAX_PUSH_ATTEMPTS, backoffFrom } from './ims.service';
import type { AppConfig } from '../config/configuration';
import type { ImsGateway } from './ims.contract';

type Mock = jest.Mock;

function imsConfig(overrides: Partial<AppConfig['ims']> = {}): AppConfig['ims'] {
  return {
    enabled: true,
    driver: 'database',
    baseUrl: undefined,
    apiKey: undefined,
    timeoutMs: 15000,
    database: {
      url: 'postgresql://gridx:secret@ims.internal:5432/ims',
      schema: 'public',
      poolMax: 5,
      connectionTimeoutMs: 10000,
      statementTimeoutMs: 15000,
      idleTimeoutMs: 30000,
      ssl: 'require',
      applicationName: 'gridx-ims',
    },
    mapping: { profile: 'prisma' },
    write: { mode: 'outbox', schema: 'gridx', table: 'ims_outbound_fact', autoCreate: true },
    sync: { inboundEnabled: true, batchSize: 500, entities: ['companies', 'items'] },
    ...overrides,
  };
}

function gatewayStub(name: ImsGateway['name'], configured = true) {
  return {
    name,
    isConfigured: jest.fn().mockReturnValue(configured),
    health: jest.fn().mockResolvedValue({ driver: name, reachable: configured }),
    fetch: jest.fn().mockResolvedValue({
      records: [],
      watermark: null,
      fullScan: true,
      source: `${name}-source`,
    }),
    // An unconfigured gateway reports why it could not deliver, exactly as the real one does.
    deliver: jest.fn().mockResolvedValue(configured ? null : `${name}: not configured`),
    mapping: jest.fn().mockReturnValue({ mapping: {}, warnings: [], overridden: [] }),
    introspect: jest.fn(),
  };
}

function build(configOverrides: Partial<AppConfig['ims']> = {}) {
  const prisma = {
    imsSyncLog: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
    systemSetting: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    company: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
    item: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
    product: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
    gridJob: { findUniqueOrThrow: jest.fn() },
    partnerInvoice: { findUniqueOrThrow: jest.fn() },
  };
  const audit = { record: jest.fn() };
  const settings = imsConfig(configOverrides);
  const config = { get: jest.fn().mockReturnValue(settings) };
  const database = gatewayStub('database');
  const http = gatewayStub('http');
  const disabled = gatewayStub('disabled', false);

  const service = new ImsService(
    prisma as never,
    audit as never,
    config as never,
    database as never,
    http as never,
    disabled as never,
  );

  return { service, prisma, audit, database, http, disabled, settings };
}

describe('ImsService', () => {
  describe('backoff', () => {
    it('doubles from one minute', () => {
      const now = new Date('2026-01-01T00:00:00.000Z');
      expect(backoffFrom(1, now).toISOString()).toBe('2026-01-01T00:01:00.000Z');
      expect(backoffFrom(2, now).toISOString()).toBe('2026-01-01T00:02:00.000Z');
      expect(backoffFrom(4, now).toISOString()).toBe('2026-01-01T00:08:00.000Z');
    });

    it('never waits longer than six hours', () => {
      const now = new Date('2026-01-01T00:00:00.000Z');
      expect(backoffFrom(50, now).toISOString()).toBe('2026-01-01T06:00:00.000Z');
    });
  });

  describe('transport selection', () => {
    it('reads through the database driver when IMS_DRIVER=database', async () => {
      const { service, database, http } = build();
      await service.preview('items', 5);
      expect(database.fetch).toHaveBeenCalled();
      expect(http.fetch).not.toHaveBeenCalled();
    });

    it('reads through the HTTP driver when IMS_DRIVER=http', async () => {
      const { service, database, http } = build({ driver: 'http', baseUrl: 'https://ims/api' });
      await service.preview('items', 5);
      expect(http.fetch).toHaveBeenCalled();
      expect(database.fetch).not.toHaveBeenCalled();
    });

    it('lets outbound facts take a different road from inbound reads', async () => {
      const { service, prisma, database, http } = build({
        driver: 'database',
        write: { mode: 'http', schema: 'gridx', table: 'ims_outbound_fact', autoCreate: true },
      });
      prisma.gridJob.findUniqueOrThrow.mockResolvedValue(job());

      await service.push(null, 'outsourced-work-order-status', 'job-1');

      expect(http.deliver).toHaveBeenCalled();
      expect(database.deliver).not.toHaveBeenCalled();
    });

    it('records the fact without delivering it when the write mode is none', async () => {
      const { service, prisma, database, http, disabled } = build({
        write: { mode: 'none', schema: 'gridx', table: 'ims_outbound_fact', autoCreate: true },
      });
      prisma.gridJob.findUniqueOrThrow.mockResolvedValue(job());

      const result = await service.push(null, 'rejected-quantities', 'job-1');

      expect(disabled.deliver).toHaveBeenCalled();
      expect(database.deliver).not.toHaveBeenCalled();
      expect(http.deliver).not.toHaveBeenCalled();
      expect(result.delivered).toBe(false);
      expect(prisma.imsSyncLog.create).toHaveBeenCalled();
    });
  });

  describe('status', () => {
    it('never exposes the IMS database password', () => {
      const { service } = build();
      const status = service.status();
      expect(status.databaseUrl).toContain('ims.internal');
      expect(status.databaseUrl).not.toContain('secret');
    });

    it('names the outbox only when facts are written to one', () => {
      expect(build().service.status().outboxTable).toBe('gridx.ims_outbound_fact');
      expect(
        build({
          write: { mode: 'http', schema: 'gridx', table: 'ims_outbound_fact', autoCreate: true },
        }).service.status().outboxTable,
      ).toBeUndefined();
    });
  });

  describe('pull', () => {
    it('persists items and reports what changed', async () => {
      const { service, database, prisma } = build();
      database.fetch.mockResolvedValue({
        records: [{ code: 'MS-16', name: 'MS Plate 16mm', uom: 'KG' }],
        watermark: new Date('2026-02-01T10:00:00.000Z'),
        fullScan: false,
        source: 'public.Item',
      });

      const summary = await service.pull(null, 'items', undefined, { incremental: true });

      expect(prisma.item.upsert).toHaveBeenCalledTimes(1);
      expect(summary).toMatchObject({ entity: 'items', received: 1, created: 1, updated: 0 });
      expect(summary.watermark).toBe('2026-02-01T10:00:00.000Z');
      expect(prisma.systemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { key: 'ims:cursor:items' } }),
      );
    });

    it('does not persist a read-through entity', async () => {
      const { service, database, prisma } = build();
      database.fetch.mockResolvedValue({
        records: [{ itemCode: 'MS-16', quantity: 400 }],
        watermark: null,
        fullScan: true,
        source: 'public.StockBalance',
      });

      const summary = await service.pull(null, 'stock');

      expect(summary.message).toMatch(/system of record/);
      expect(summary.skipped).toBe(1);
      expect(prisma.item.upsert).not.toHaveBeenCalled();
    });

    it('skips a product whose company has not been pulled yet rather than inventing one', async () => {
      const { service, database, prisma } = build();
      database.fetch.mockResolvedValue({
        records: [{ companyCode: 'OSWAR', code: 'RV-200', name: 'Rotary valve' }],
        watermark: null,
        fullScan: true,
        source: 'public.Product',
      });
      prisma.company.findUnique.mockResolvedValue(null);

      const summary = await service.pull(null, 'products');

      expect(summary.skipped).toBe(1);
      expect(prisma.product.upsert).not.toHaveBeenCalled();
      expect(prisma.company.upsert).not.toHaveBeenCalled();
    });

    it('validates an operator-supplied payload against the boundary contract', async () => {
      const { service, prisma, database } = build();

      const summary = await service.pull(null, 'items', [
        { code: 'MS-16', name: 'MS Plate 16mm' },
        { name: 'no code, so not an item' },
      ]);

      expect(database.fetch).not.toHaveBeenCalled();
      expect(summary.received).toBe(1);
      expect(prisma.item.upsert).toHaveBeenCalledTimes(1);
    });

    it('logs the failure and returns a summary when IMS is unreachable', async () => {
      const { service, database, prisma } = build();
      database.fetch.mockRejectedValue(new Error('connection refused'));

      const summary = await service.pull(null, 'items');

      expect(summary.message).toBe('connection refused');
      expect(summary.received).toBe(0);
      expect(prisma.imsSyncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ success: false }) }),
      );
    });
  });

  describe('syncAll', () => {
    it('pulls each configured entity incrementally', async () => {
      const { service, database } = build();
      const summaries = await service.syncAll();
      expect(summaries.map((summary) => summary.entity)).toEqual(['companies', 'items']);
      expect(database.fetch).toHaveBeenCalledTimes(2);
    });

    it('reports an unknown entity instead of throwing', async () => {
      const { service } = build({
        sync: { inboundEnabled: true, batchSize: 100, entities: ['widgets'] },
      });
      const [summary] = await service.syncAll();
      expect(summary.message).toMatch(/IMS_SYNC_ENTITIES/);
    });
  });

  describe('lookups', () => {
    it('refuses an order lookup when nothing is configured', async () => {
      const { service } = build({ driver: 'disabled' });
      await expect(service.lookupOrders('work-orders')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('drops order rows that do not satisfy the contract', async () => {
      const { service, database } = build();
      database.fetch.mockResolvedValue({
        records: [{ reference: 'WO-1' }, { description: 'no reference' }],
        watermark: null,
        fullScan: true,
        source: 'public.WorkOrder',
      });
      await expect(service.lookupOrders('work-orders')).resolves.toEqual([{ reference: 'WO-1' }]);
    });
  });

  describe('retryFailedPushes', () => {
    it('marks a delivered fact as successful and stops retrying it', async () => {
      const { service, prisma, database } = build();
      prisma.imsSyncLog.findMany.mockResolvedValue([
        pendingRow({ id: 'log-1', attempts: 2, entity: 'conversion-cost', recordRef: 'job-1' }),
      ]);
      database.deliver.mockResolvedValue(null);

      const result = await service.retryFailedPushes();

      expect(result).toEqual({ attempted: 1, delivered: 1 });
      expect(prisma.imsSyncLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: expect.objectContaining({ success: true, attempts: 3, nextAttemptAt: null }),
      });
    });

    it('backs off after a failure', async () => {
      const { service, prisma, database } = build();
      prisma.imsSyncLog.findMany.mockResolvedValue([pendingRow({ attempts: 1 })]);
      database.deliver.mockResolvedValue('IMS responded 503');

      await service.retryFailedPushes();

      const update = (prisma.imsSyncLog.update as Mock).mock.calls[0][0];
      expect(update.data.attempts).toBe(2);
      expect(update.data.abandonedAt).toBeNull();
      expect(update.data.nextAttemptAt).toBeInstanceOf(Date);
    });

    it('abandons a fact once the attempt budget is spent', async () => {
      const { service, prisma, database } = build();
      prisma.imsSyncLog.findMany.mockResolvedValue([
        pendingRow({ attempts: MAX_PUSH_ATTEMPTS - 1 }),
      ]);
      database.deliver.mockResolvedValue('IMS responded 500');

      await service.retryFailedPushes();

      const update = (prisma.imsSyncLog.update as Mock).mock.calls[0][0];
      expect(update.data.attempts).toBe(MAX_PUSH_ATTEMPTS);
      expect(update.data.abandonedAt).toBeInstanceOf(Date);
      expect(update.data.nextAttemptAt).toBeNull();
    });
  });

  describe('push payloads', () => {
    it('computes the conversion cost from the accepted quantity, not the ordered one', async () => {
      const { service, prisma } = build();
      prisma.gridJob.findUniqueOrThrow.mockResolvedValue(
        job({ quantity: 100, acceptedQuantity: 92, rate: 45 }),
      );

      const result = await service.push(null, 'conversion-cost', 'job-1');

      expect(result.payload).toMatchObject({ conversionCost: 92 * 45, acceptedQuantity: 92 });
    });

    it('keys the fact on the GRID-X record so redelivery overwrites rather than duplicates', async () => {
      const { service, prisma, database } = build();
      prisma.gridJob.findUniqueOrThrow.mockResolvedValue(job());

      await service.push(null, 'outsourced-work-order-status', 'job-1');

      expect(database.deliver).toHaveBeenCalledWith(
        'outsourced-work-order-status',
        'job-1',
        expect.objectContaining({ jobNumber: 'JOB-00001' }),
      );
    });
  });

  describe('pushInBackground', () => {
    it('swallows a failure so a closing job is never blocked by IMS', async () => {
      const { service, prisma } = build();
      prisma.gridJob.findUniqueOrThrow.mockRejectedValue(new Error('job vanished'));
      await expect(service.pushInBackground('rejected-quantities', 'job-1')).resolves.toBeUndefined();
    });
  });

  describe('introspect', () => {
    it('refuses over HTTP, where there is no schema to inspect', async () => {
      const { service } = build({ driver: 'http', baseUrl: 'https://ims/api' });
      await expect(service.introspect()).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});

function pendingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'log-1',
    direction: 'OUTBOUND',
    entity: 'outsourced-work-order-status',
    recordRef: 'job-1',
    payload: { jobNumber: 'JOB-00001' },
    success: false,
    attempts: 1,
    nextAttemptAt: null,
    abandonedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function job(overrides: Record<string, unknown> = {}) {
  return {
    jobNumber: 'JOB-00001',
    sourceRef: 'WO-77',
    status: 'CLOSED',
    quantity: 100,
    dispatchedQuantity: 100,
    receivedQuantity: 100,
    acceptedQuantity: 100,
    rejectedQuantity: 0,
    reworkQuantity: 0,
    rate: 40,
    dueDate: new Date('2026-03-01T00:00:00.000Z'),
    productionStartedAt: null,
    completedAt: null,
    closedAt: null,
    component: { componentCode: 'CMP-1', name: 'Bracket' },
    partner: { partnerCode: 'PTR-1', businessName: 'Shree Engineering' },
    materialIssues: [],
    ...overrides,
  };
}

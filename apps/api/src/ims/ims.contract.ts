import { z } from 'zod';

/**
 * Section 10 of the blueprint — the IMS boundary, expressed as a contract rather than as HTTP.
 *
 * GRID-X owns external distributed manufacturing; IMS owns internal inventory and manufacturing.
 * This file is the only place that says what the two systems exchange. Transports (the REST API,
 * a direct PostgreSQL connection) implement `ImsGateway` against it, so adding or swapping one
 * cannot quietly change the meaning of the boundary.
 */

/** Entities GRID-X consumes from IMS (Section 10, "GRID-X should consume the following from IMS"). */
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

/** Facts GRID-X pushes back to IMS (Section 10, "GRID-X should send back"). */
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

/**
 * Inbound entities GRID-X *persists*. Everything else is read-through: reading it is allowed,
 * copying it is not, because Section 10 is explicit that GRID-X must not duplicate inventory,
 * purchase-order or customer data.
 */
export const IMS_PERSISTED_ENTITIES = ['companies', 'items', 'products'] as const;
export type ImsPersistedEntity = (typeof IMS_PERSISTED_ENTITIES)[number];

export function isPersistedEntity(entity: string): entity is ImsPersistedEntity {
  return (IMS_PERSISTED_ENTITIES as readonly string[]).includes(entity);
}

// ---------------------------------------------------------------------------
// Canonical record shapes
// ---------------------------------------------------------------------------
// Every driver normalises IMS rows into these shapes before the service sees them, so the
// persistence code is identical whether a row arrived as JSON over HTTP or as a Postgres row.

export const imsCompanySchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  legalName: z.string().trim().optional(),
  gstNumber: z.string().trim().optional(),
  panNumber: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
});
export type ImsCompanyRecord = z.infer<typeof imsCompanySchema>;

export const imsItemSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  uom: z.string().trim().default('KG'),
  materialGrade: z.string().trim().optional(),
  unitWeightKg: z.coerce.number().optional(),
  standardRate: z.coerce.number().optional(),
  imsRef: z.string().trim().optional(),
});
export type ImsItemRecord = z.infer<typeof imsItemSchema>;

export const imsProductSchema = z.object({
  companyCode: z.string().trim().min(1),
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  imsRef: z.string().trim().optional(),
});
export type ImsProductRecord = z.infer<typeof imsProductSchema>;

/**
 * The shape GRID-X needs from an IMS order to reference it on a job. Everything else about the
 * order stays in IMS.
 */
export const imsOrderSchema = z.object({
  reference: z.string().trim().min(1),
  description: z.string().trim().optional(),
  customer: z.string().trim().optional(),
  itemCode: z.string().trim().optional(),
  quantity: z.coerce.number().optional(),
  dueDate: z.string().trim().optional(),
});
export type ImsOrderOption = z.infer<typeof imsOrderSchema>;

/** Read-through only: shown to a planner or a stores user, never persisted. */
export const imsStockSchema = z.object({
  itemCode: z.string().trim().min(1),
  itemName: z.string().trim().optional(),
  warehouseCode: z.string().trim().optional(),
  warehouseName: z.string().trim().optional(),
  quantity: z.coerce.number().optional(),
  uom: z.string().trim().optional(),
  batchNumber: z.string().trim().optional(),
  updatedAt: z.string().trim().optional(),
});
export type ImsStockRecord = z.infer<typeof imsStockSchema>;

export const imsWarehouseSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  companyCode: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
});
export type ImsWarehouseRecord = z.infer<typeof imsWarehouseSchema>;

export const imsSupplierSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  gstNumber: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
});
export type ImsSupplierRecord = z.infer<typeof imsSupplierSchema>;

export const imsUserSchema = z.object({
  reference: z.string().trim().min(1),
  name: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  role: z.string().trim().optional(),
  isActive: z.coerce.boolean().optional(),
});
export type ImsUserRecord = z.infer<typeof imsUserSchema>;

export const imsMaterialTransactionSchema = z.object({
  reference: z.string().trim().min(1),
  itemCode: z.string().trim().optional(),
  warehouseCode: z.string().trim().optional(),
  transactionType: z.string().trim().optional(),
  quantity: z.coerce.number().optional(),
  uom: z.string().trim().optional(),
  occurredAt: z.string().trim().optional(),
});
export type ImsMaterialTransactionRecord = z.infer<typeof imsMaterialTransactionSchema>;

export const imsPurchaseOrderSchema = z.object({
  reference: z.string().trim().min(1),
  supplierCode: z.string().trim().optional(),
  itemCode: z.string().trim().optional(),
  quantity: z.coerce.number().optional(),
  status: z.string().trim().optional(),
  orderedAt: z.string().trim().optional(),
  expectedAt: z.string().trim().optional(),
});
export type ImsPurchaseOrderRecord = z.infer<typeof imsPurchaseOrderSchema>;

/** The parser for each inbound entity, so a driver never has to know the shapes individually. */
export const IMS_ENTITY_SCHEMAS: Record<ImsInboundEntity, z.ZodTypeAny> = {
  companies: imsCompanySchema,
  products: imsProductSchema,
  items: imsItemSchema,
  'sales-orders': imsOrderSchema,
  'work-orders': imsOrderSchema,
  suppliers: imsSupplierSchema,
  stock: imsStockSchema,
  warehouses: imsWarehouseSchema,
  'material-transactions': imsMaterialTransactionSchema,
  users: imsUserSchema,
  'purchase-orders': imsPurchaseOrderSchema,
};

// ---------------------------------------------------------------------------
// Gateway
// ---------------------------------------------------------------------------

export interface ImsFetchOptions {
  /** Free-text filter, applied to whichever columns the mapping marks as searchable. */
  search?: string;
  /** Row ceiling for one call. */
  limit?: number;
  /**
   * Incremental watermark. Only rows changed at or after this instant are returned, when the
   * entity has a mapped change column. Without one the driver falls back to a full read and
   * says so, rather than silently returning everything as if it were new.
   */
  since?: Date;
}

export interface ImsFetchResult<T = unknown> {
  records: T[];
  /** Highest change timestamp seen, to be stored as the next watermark. Null when not incremental. */
  watermark: Date | null;
  /** True when the entity has no mapped change column, so `since` could not be honoured. */
  fullScan: boolean;
  /** Where the rows came from, in words, for the sync log. */
  source: string;
}

export interface ImsHealth {
  driver: 'database' | 'http' | 'disabled';
  reachable: boolean;
  /** Round-trip time of the health probe in milliseconds, when one ran. */
  latencyMs?: number;
  /** Server version or endpoint identity — whatever the transport can cheaply report. */
  serverVersion?: string;
  message?: string;
}

/**
 * One transport across the IMS boundary. Implementations must not throw for an IMS that is merely
 * down: `deliver` returns the failure so the caller can queue a retry, and `fetch` throws only for
 * a caller that cannot proceed without the data.
 */
export interface ImsGateway {
  readonly name: 'database' | 'http' | 'disabled';
  /** Whether this gateway has everything it needs to talk to IMS. */
  isConfigured(): boolean;
  /** Cheap liveness probe used by `/ims/health` and the Control screen. */
  health(): Promise<ImsHealth>;
  /** Reads one inbound entity. Records come back already normalised and validated. */
  fetch(entity: ImsInboundEntity, options?: ImsFetchOptions): Promise<ImsFetchResult>;
  /**
   * Delivers one outbound fact. Returns null on success or a reason string on failure — never
   * throws, because a job must not fail to close because IMS is unavailable.
   */
  deliver(
    entity: ImsOutboundEntity,
    recordRef: string,
    payload: Record<string, unknown>,
  ): Promise<string | null>;
}

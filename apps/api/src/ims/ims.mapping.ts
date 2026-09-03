import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { ImsMappingProfileName } from '../config/configuration';
import { IMS_INBOUND_ENTITIES, type ImsInboundEntity } from './ims.contract';

/**
 * The IMS database is not ours. Its tables were designed by the IMS team, they will be renamed
 * without telling us, and GRID-X must never own a migration against them. So the direct driver
 * does not hardcode a schema — it reads through a *mapping*: for each entity in the boundary
 * contract, which table it lives in and which column carries each canonical field.
 *
 * Two built-in profiles cover the plausible shapes, and either can be overridden per entity from
 * `IMS_MAPPING_FILE` or `IMS_MAPPING_JSON` without a redeploy of code. `GET /api/ims/introspect`
 * checks a mapping against the live database and names every table and column that is missing, so
 * correcting a wrong guess is a config edit rather than an investigation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImsJoinMapping {
  /** Table being joined. */
  table: string;
  /** Schema of the joined table; defaults to the entity's schema. */
  schema?: string;
  /** Alias the ON clause and column expressions refer to. */
  alias: string;
  /** Join predicate, written against `t` (the base table) and the alias. */
  on: string;
  type?: 'INNER' | 'LEFT';
}

export interface ImsEntityMapping {
  /** Table or view in the IMS database holding this entity. */
  table: string;
  /** Schema override for this entity; defaults to `IMS_DATABASE_SCHEMA`. */
  schema?: string;
  /**
   * Canonical field to IMS column. A bare name (`code`) is a column on the base table; a
   * qualified name (`c.code`) refers to a join alias; a value starting with `=` is a raw SQL
   * expression (`=coalesce(t."name", t."title")`).
   */
  columns: Partial<Record<string, string>>;
  /** Optional joins, referenced by alias from `columns`. */
  joins?: ImsJoinMapping[];
  /** Static filter, e.g. `t."deletedAt" IS NULL`. */
  where?: string;
  /** Columns a free-text search matches against. */
  searchColumns?: string[];
  /** Column carrying the row's last change time, which makes incremental sync possible. */
  changeColumn?: string;
  /** Ordering column; defaults to `changeColumn`, then the entity's first mapped column. */
  orderBy?: string;
}

export type ImsMapping = Record<ImsInboundEntity, ImsEntityMapping>;

/** Fields a mapping must provide for the entity to be usable at all. */
export const IMS_REQUIRED_FIELDS: Record<ImsInboundEntity, string[]> = {
  companies: ['code', 'name'],
  products: ['companyCode', 'code', 'name'],
  items: ['code', 'name'],
  'sales-orders': ['reference'],
  'work-orders': ['reference'],
  suppliers: ['code', 'name'],
  stock: ['itemCode'],
  warehouses: ['code', 'name'],
  'material-transactions': ['reference'],
  users: ['reference'],
  'purchase-orders': ['reference'],
};

// ---------------------------------------------------------------------------
// Built-in profiles
// ---------------------------------------------------------------------------

/**
 * PascalCase tables with camelCase columns — what Prisma generates when a schema declares no
 * `@@map`, which is how the sibling Autix products (CRM, IMS, VMS) are built. This is the
 * default because it is the most likely shape, not because it is guaranteed: run
 * `pnpm ims:introspect` against the real database before trusting it.
 */
const PRISMA_PROFILE: ImsMapping = {
  companies: {
    table: 'Company',
    columns: {
      code: 'code',
      name: 'name',
      legalName: 'legalName',
      gstNumber: 'gstNumber',
      panNumber: 'panNumber',
      city: 'city',
      state: 'state',
    },
    searchColumns: ['code', 'name'],
    changeColumn: 'updatedAt',
  },
  products: {
    table: 'Product',
    joins: [{ table: 'Company', alias: 'c', on: 'c."id" = t."companyId"', type: 'LEFT' }],
    columns: {
      companyCode: 'c.code',
      code: 'code',
      name: 'name',
      description: 'description',
      imsRef: 'id',
    },
    searchColumns: ['code', 'name'],
    changeColumn: 'updatedAt',
  },
  items: {
    table: 'Item',
    columns: {
      code: 'code',
      name: 'name',
      uom: 'uom',
      materialGrade: 'materialGrade',
      unitWeightKg: 'unitWeightKg',
      standardRate: 'standardRate',
      imsRef: 'id',
    },
    searchColumns: ['code', 'name'],
    changeColumn: 'updatedAt',
  },
  'sales-orders': {
    table: 'SalesOrder',
    columns: {
      reference: 'orderNumber',
      description: 'description',
      customer: 'customerName',
      itemCode: 'itemCode',
      quantity: 'quantity',
      dueDate: 'dueDate',
    },
    searchColumns: ['orderNumber', 'customerName'],
    changeColumn: 'updatedAt',
  },
  'work-orders': {
    table: 'WorkOrder',
    columns: {
      reference: 'orderNumber',
      description: 'description',
      customer: 'customerName',
      itemCode: 'itemCode',
      quantity: 'quantity',
      dueDate: 'dueDate',
    },
    searchColumns: ['orderNumber', 'customerName'],
    changeColumn: 'updatedAt',
  },
  suppliers: {
    table: 'Supplier',
    columns: {
      code: 'code',
      name: 'name',
      gstNumber: 'gstNumber',
      city: 'city',
      state: 'state',
      phone: 'phone',
      email: 'email',
    },
    searchColumns: ['code', 'name'],
    changeColumn: 'updatedAt',
  },
  stock: {
    table: 'StockBalance',
    joins: [
      { table: 'Item', alias: 'i', on: 'i."id" = t."itemId"', type: 'LEFT' },
      { table: 'Warehouse', alias: 'w', on: 'w."id" = t."warehouseId"', type: 'LEFT' },
    ],
    columns: {
      itemCode: 'i.code',
      itemName: 'i.name',
      warehouseCode: 'w.code',
      warehouseName: 'w.name',
      quantity: 'quantity',
      uom: 'i.uom',
      batchNumber: 'batchNumber',
      updatedAt: 'updatedAt',
    },
    searchColumns: ['i.code', 'i.name', 'w.code'],
    changeColumn: 'updatedAt',
  },
  warehouses: {
    table: 'Warehouse',
    joins: [{ table: 'Company', alias: 'c', on: 'c."id" = t."companyId"', type: 'LEFT' }],
    columns: {
      code: 'code',
      name: 'name',
      companyCode: 'c.code',
      city: 'city',
      state: 'state',
    },
    searchColumns: ['code', 'name'],
    changeColumn: 'updatedAt',
  },
  'material-transactions': {
    table: 'StockMovement',
    joins: [
      { table: 'Item', alias: 'i', on: 'i."id" = t."itemId"', type: 'LEFT' },
      { table: 'Warehouse', alias: 'w', on: 'w."id" = t."warehouseId"', type: 'LEFT' },
    ],
    columns: {
      reference: 'id',
      itemCode: 'i.code',
      warehouseCode: 'w.code',
      transactionType: 'type',
      quantity: 'quantity',
      uom: 'i.uom',
      occurredAt: 'createdAt',
    },
    searchColumns: ['i.code'],
    changeColumn: 'createdAt',
  },
  users: {
    table: 'User',
    columns: {
      reference: 'id',
      name: 'name',
      email: 'email',
      phone: 'phone',
      role: 'role',
      isActive: 'isActive',
    },
    searchColumns: ['name', 'email'],
    changeColumn: 'updatedAt',
  },
  'purchase-orders': {
    table: 'PurchaseOrder',
    joins: [
      { table: 'Supplier', alias: 's', on: 's."id" = t."supplierId"', type: 'LEFT' },
      { table: 'Item', alias: 'i', on: 'i."id" = t."itemId"', type: 'LEFT' },
    ],
    columns: {
      reference: 'orderNumber',
      supplierCode: 's.code',
      itemCode: 'i.code',
      quantity: 'quantity',
      status: 'status',
      orderedAt: 'orderDate',
      expectedAt: 'expectedDate',
    },
    searchColumns: ['orderNumber'],
    changeColumn: 'updatedAt',
  },
};

/** Plural snake_case tables and snake_case columns — the other common convention. */
const SNAKE_PROFILE: ImsMapping = {
  companies: {
    table: 'companies',
    columns: {
      code: 'code',
      name: 'name',
      legalName: 'legal_name',
      gstNumber: 'gst_number',
      panNumber: 'pan_number',
      city: 'city',
      state: 'state',
    },
    searchColumns: ['code', 'name'],
    changeColumn: 'updated_at',
  },
  products: {
    table: 'products',
    joins: [{ table: 'companies', alias: 'c', on: 'c."id" = t."company_id"', type: 'LEFT' }],
    columns: {
      companyCode: 'c.code',
      code: 'code',
      name: 'name',
      description: 'description',
      imsRef: 'id',
    },
    searchColumns: ['code', 'name'],
    changeColumn: 'updated_at',
  },
  items: {
    table: 'items',
    columns: {
      code: 'code',
      name: 'name',
      uom: 'uom',
      materialGrade: 'material_grade',
      unitWeightKg: 'unit_weight_kg',
      standardRate: 'standard_rate',
      imsRef: 'id',
    },
    searchColumns: ['code', 'name'],
    changeColumn: 'updated_at',
  },
  'sales-orders': {
    table: 'sales_orders',
    columns: {
      reference: 'order_number',
      description: 'description',
      customer: 'customer_name',
      itemCode: 'item_code',
      quantity: 'quantity',
      dueDate: 'due_date',
    },
    searchColumns: ['order_number', 'customer_name'],
    changeColumn: 'updated_at',
  },
  'work-orders': {
    table: 'work_orders',
    columns: {
      reference: 'order_number',
      description: 'description',
      customer: 'customer_name',
      itemCode: 'item_code',
      quantity: 'quantity',
      dueDate: 'due_date',
    },
    searchColumns: ['order_number', 'customer_name'],
    changeColumn: 'updated_at',
  },
  suppliers: {
    table: 'suppliers',
    columns: {
      code: 'code',
      name: 'name',
      gstNumber: 'gst_number',
      city: 'city',
      state: 'state',
      phone: 'phone',
      email: 'email',
    },
    searchColumns: ['code', 'name'],
    changeColumn: 'updated_at',
  },
  stock: {
    table: 'stock_balances',
    joins: [
      { table: 'items', alias: 'i', on: 'i."id" = t."item_id"', type: 'LEFT' },
      { table: 'warehouses', alias: 'w', on: 'w."id" = t."warehouse_id"', type: 'LEFT' },
    ],
    columns: {
      itemCode: 'i.code',
      itemName: 'i.name',
      warehouseCode: 'w.code',
      warehouseName: 'w.name',
      quantity: 'quantity',
      uom: 'i.uom',
      batchNumber: 'batch_number',
      updatedAt: 'updated_at',
    },
    searchColumns: ['i.code', 'i.name', 'w.code'],
    changeColumn: 'updated_at',
  },
  warehouses: {
    table: 'warehouses',
    joins: [{ table: 'companies', alias: 'c', on: 'c."id" = t."company_id"', type: 'LEFT' }],
    columns: {
      code: 'code',
      name: 'name',
      companyCode: 'c.code',
      city: 'city',
      state: 'state',
    },
    searchColumns: ['code', 'name'],
    changeColumn: 'updated_at',
  },
  'material-transactions': {
    table: 'stock_movements',
    joins: [
      { table: 'items', alias: 'i', on: 'i."id" = t."item_id"', type: 'LEFT' },
      { table: 'warehouses', alias: 'w', on: 'w."id" = t."warehouse_id"', type: 'LEFT' },
    ],
    columns: {
      reference: 'id',
      itemCode: 'i.code',
      warehouseCode: 'w.code',
      transactionType: 'type',
      quantity: 'quantity',
      uom: 'i.uom',
      occurredAt: 'created_at',
    },
    searchColumns: ['i.code'],
    changeColumn: 'created_at',
  },
  users: {
    table: 'users',
    columns: {
      reference: 'id',
      name: 'name',
      email: 'email',
      phone: 'phone',
      role: 'role',
      isActive: 'is_active',
    },
    searchColumns: ['name', 'email'],
    changeColumn: 'updated_at',
  },
  'purchase-orders': {
    table: 'purchase_orders',
    joins: [
      { table: 'suppliers', alias: 's', on: 's."id" = t."supplier_id"', type: 'LEFT' },
      { table: 'items', alias: 'i', on: 'i."id" = t."item_id"', type: 'LEFT' },
    ],
    columns: {
      reference: 'order_number',
      supplierCode: 's.code',
      itemCode: 'i.code',
      quantity: 'quantity',
      status: 'status',
      orderedAt: 'order_date',
      expectedAt: 'expected_date',
    },
    searchColumns: ['order_number'],
    changeColumn: 'updated_at',
  },
};

export const IMS_MAPPING_PROFILES: Record<ImsMappingProfileName, ImsMapping> = {
  prisma: PRISMA_PROFILE,
  snake: SNAKE_PROFILE,
};

// ---------------------------------------------------------------------------
// Loading and validation
// ---------------------------------------------------------------------------

const joinSchema = z.object({
  table: z.string().trim().min(1),
  schema: z.string().trim().min(1).optional(),
  alias: z.string().trim().min(1),
  on: z.string().trim().min(1),
  type: z.enum(['INNER', 'LEFT']).optional(),
});

const entitySchema = z.object({
  table: z.string().trim().min(1),
  schema: z.string().trim().min(1).optional(),
  columns: z.record(z.string().trim().min(1)),
  joins: z.array(joinSchema).optional(),
  where: z.string().trim().min(1).optional(),
  searchColumns: z.array(z.string().trim().min(1)).optional(),
  changeColumn: z.string().trim().min(1).optional(),
  orderBy: z.string().trim().min(1).optional(),
});

const overrideSchema = z.record(z.string(), entitySchema.partial().passthrough());

export interface MappingLoadResult {
  mapping: ImsMapping;
  /** Entities the operator overrode, so the Control screen can show what is customised. */
  overridden: ImsInboundEntity[];
  /** Non-fatal problems: an unknown entity key, an unreadable file. */
  warnings: string[];
}

/**
 * Builds the effective mapping: profile first, then a shallow per-entity merge of the file
 * override, then the inline JSON override. Later wins, so a deployment can pin one awkward table
 * without restating the other ten.
 */
export function loadMapping(options: {
  profile: ImsMappingProfileName;
  file?: string;
  json?: string;
}): MappingLoadResult {
  const mapping: ImsMapping = structuredClone(IMS_MAPPING_PROFILES[options.profile]);
  const overridden = new Set<ImsInboundEntity>();
  const warnings: string[] = [];

  for (const [label, raw] of [
    ['IMS_MAPPING_FILE', readMappingFile(options.file, warnings)],
    ['IMS_MAPPING_JSON', parseMappingJson(options.json, warnings)],
  ] as const) {
    if (!raw) continue;
    const parsed = overrideSchema.safeParse(raw);
    if (!parsed.success) {
      warnings.push(`${label} ignored: ${parsed.error.issues[0]?.message ?? 'invalid shape'}`);
      continue;
    }
    for (const [entity, patch] of Object.entries(parsed.data)) {
      if (!(IMS_INBOUND_ENTITIES as readonly string[]).includes(entity)) {
        warnings.push(`${label} names "${entity}", which is not an IMS boundary entity`);
        continue;
      }
      const key = entity as ImsInboundEntity;
      const base = mapping[key];
      mapping[key] = {
        ...base,
        ...patch,
        // Columns merge rather than replace: overriding one column should not delete the rest.
        columns: { ...base.columns, ...(patch.columns ?? {}) },
      } as ImsEntityMapping;
      overridden.add(key);
    }
  }

  return { mapping, overridden: [...overridden], warnings };
}

function readMappingFile(file: string | undefined, warnings: string[]): unknown {
  if (!file) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as unknown;
  } catch (error) {
    warnings.push(`IMS_MAPPING_FILE ${file} could not be read: ${String(error)}`);
    return null;
  }
}

function parseMappingJson(json: string | undefined, warnings: string[]): unknown {
  if (!json) return null;
  try {
    return JSON.parse(json) as unknown;
  } catch (error) {
    warnings.push(`IMS_MAPPING_JSON is not valid JSON: ${String(error)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// SQL construction
// ---------------------------------------------------------------------------

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_$]*$/;

/**
 * Mappings come from configuration, not from users — but configuration is edited under pressure
 * and a typo that becomes a second statement is not a typo any more. Identifiers are checked and
 * quoted; free-form fragments (`where`, `on`, `=` expressions) are refused if they carry a
 * statement separator or a comment.
 */
export function quoteIdentifier(name: string): string {
  if (!IDENTIFIER.test(name)) {
    throw new Error(`"${name}" is not a valid SQL identifier for the IMS mapping`);
  }
  return `"${name}"`;
}

export function assertSafeFragment(fragment: string, context: string): string {
  if (/;|--|\/\*/.test(fragment)) {
    throw new Error(
      `IMS mapping ${context} may not contain a statement separator or comment: ${fragment}`,
    );
  }
  return fragment;
}

/** Turns a mapping column value into the SQL that selects it. */
export function columnExpression(value: string, context: string): string {
  if (value.startsWith('=')) return assertSafeFragment(value.slice(1), context);
  const parts = value.split('.');
  if (parts.length === 1) return `t.${quoteIdentifier(parts[0])}`;
  if (parts.length === 2) return `${quoteIdentifier(parts[0])}.${quoteIdentifier(parts[1])}`;
  throw new Error(`IMS mapping ${context} column "${value}" has too many qualifiers`);
}

export interface BuiltQuery {
  text: string;
  values: unknown[];
  /** Canonical fields the query actually selects. */
  fields: string[];
  /** True when the entity has a change column, so `since` was honoured. */
  incremental: boolean;
}

/**
 * Builds the read for one entity. Every value is bound as a parameter; nothing user-supplied is
 * ever concatenated into the statement.
 */
export function buildSelect(
  entity: ImsInboundEntity,
  mapping: ImsEntityMapping,
  defaultSchema: string,
  options: { search?: string; limit?: number; since?: Date } = {},
): BuiltQuery {
  const schema = quoteIdentifier(mapping.schema ?? defaultSchema);
  const table = quoteIdentifier(mapping.table);
  const values: unknown[] = [];
  const fields: string[] = [];

  const selects: string[] = [];
  for (const [field, column] of Object.entries(mapping.columns)) {
    if (!column) continue;
    selects.push(`${columnExpression(column, `${entity}.${field}`)} AS ${quoteIdentifier(field)}`);
    fields.push(field);
  }
  if (selects.length === 0) {
    throw new Error(`IMS mapping for ${entity} selects no columns`);
  }

  const joins = (mapping.joins ?? []).map((join) => {
    const joinSchemaName = quoteIdentifier(join.schema ?? mapping.schema ?? defaultSchema);
    const joinTable = quoteIdentifier(join.table);
    const alias = quoteIdentifier(join.alias);
    const on = assertSafeFragment(join.on, `${entity} join ${join.alias}`);
    return `${join.type ?? 'LEFT'} JOIN ${joinSchemaName}.${joinTable} AS ${alias} ON ${on}`;
  });

  const conditions: string[] = [];
  if (mapping.where) {
    conditions.push(`(${assertSafeFragment(mapping.where, `${entity}.where`)})`);
  }

  const search = options.search?.trim();
  const searchColumns = mapping.searchColumns ?? [];
  if (search && searchColumns.length > 0) {
    values.push(`%${search}%`);
    const placeholder = `$${values.length}`;
    const clauses = searchColumns.map(
      (column) => `${columnExpression(column, `${entity}.search`)}::text ILIKE ${placeholder}`,
    );
    conditions.push(`(${clauses.join(' OR ')})`);
  }

  const incremental = Boolean(mapping.changeColumn);
  if (options.since && mapping.changeColumn) {
    values.push(options.since);
    conditions.push(
      `${columnExpression(mapping.changeColumn, `${entity}.changeColumn`)} >= $${values.length}`,
    );
  }

  const orderColumn = mapping.orderBy ?? mapping.changeColumn ?? Object.values(mapping.columns)[0];
  const order = orderColumn
    ? `ORDER BY ${columnExpression(orderColumn, `${entity}.orderBy`)} ASC NULLS LAST`
    : '';

  values.push(Math.max(1, Math.min(options.limit ?? 500, 10_000)));
  const limit = `LIMIT $${values.length}`;

  const text = [
    `SELECT ${selects.join(', ')}`,
    `FROM ${schema}.${table} AS t`,
    ...joins,
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    order,
    limit,
  ]
    .filter(Boolean)
    .join('\n');

  return { text, values, fields, incremental };
}

// ---------------------------------------------------------------------------
// Static validation
// ---------------------------------------------------------------------------

export interface MappingIssue {
  entity: ImsInboundEntity;
  severity: 'error' | 'warning';
  message: string;
}

/**
 * Checks a mapping without touching the database: required fields present, identifiers legal,
 * join aliases actually declared. `GET /api/ims/introspect` runs this first, then goes on to
 * compare the surviving mappings against the real `information_schema`.
 */
export function validateMapping(mapping: ImsMapping): MappingIssue[] {
  const issues: MappingIssue[] = [];

  for (const entity of IMS_INBOUND_ENTITIES) {
    const entityMapping = mapping[entity];
    if (!entityMapping) {
      issues.push({ entity, severity: 'error', message: 'No mapping declared' });
      continue;
    }

    for (const field of IMS_REQUIRED_FIELDS[entity]) {
      if (!entityMapping.columns[field]) {
        issues.push({
          entity,
          severity: 'error',
          message: `Required field "${field}" has no column mapped`,
        });
      }
    }

    const aliases = new Set((entityMapping.joins ?? []).map((join) => join.alias));
    for (const [field, column] of Object.entries(entityMapping.columns)) {
      if (!column || column.startsWith('=')) continue;
      const [qualifier, rest] = column.split('.');
      if (rest !== undefined && !aliases.has(qualifier)) {
        issues.push({
          entity,
          severity: 'error',
          message: `Field "${field}" refers to alias "${qualifier}", which no join declares`,
        });
      }
    }

    if (!entityMapping.changeColumn) {
      issues.push({
        entity,
        severity: 'warning',
        message: 'No change column, so every sync of this entity is a full read',
      });
    }

    try {
      buildSelect(entity, entityMapping, 'public', { limit: 1 });
    } catch (error) {
      issues.push({ entity, severity: 'error', message: String(error) });
    }
  }

  return issues;
}

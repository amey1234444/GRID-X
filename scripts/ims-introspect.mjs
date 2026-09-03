#!/usr/bin/env node
/**
 * Introspects the OSWAR IMS database and reports how well the configured GRID-X mapping fits it.
 *
 *   pnpm ims:introspect              # report only
 *   pnpm ims:introspect --write      # also write ims-mapping.generated.json
 *   pnpm ims:introspect --profile snake
 *
 * Run this the first time a real `IMS_DATABASE_URL` is available, before enabling the sync.
 * The built-in mapping profiles are informed guesses at the IMS schema; this tells you which of
 * those guesses were right and, for the ones that were not, which real table and column look
 * like the intended match.
 *
 * It is read-only: it runs SELECTs against `information_schema` and nothing else.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

require(resolve(repoRoot, 'apps/api/node_modules/dotenv')).config({
  path: resolve(repoRoot, '.env'),
});
const { Pool } = require(resolve(repoRoot, 'apps/api/node_modules/pg'));

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')
    ? args[index + 1]
    : fallback;
};

const url = process.env.IMS_DATABASE_URL;
const schema = flag('schema', process.env.IMS_DATABASE_SCHEMA || 'public');
const profileName = flag('profile', process.env.IMS_MAPPING_PROFILE || 'prisma');
const shouldWrite = args.includes('--write');
const sslMode = process.env.IMS_DB_SSL || 'require';

if (!url) {
  console.error('IMS_DATABASE_URL is not set. Put it in .env, then run this again.');
  process.exit(1);
}

// -----------------------------------------------------------------------------
// The entities and the fields each one needs, mirrored from apps/api/src/ims/ims.contract.ts.
// Kept as data here rather than imported so this script needs no build step.
// -----------------------------------------------------------------------------
const ENTITY_FIELDS = {
  companies: ['code', 'name', 'legalName', 'gstNumber', 'panNumber', 'city', 'state'],
  products: ['companyCode', 'code', 'name', 'description', 'imsRef'],
  items: ['code', 'name', 'uom', 'materialGrade', 'unitWeightKg', 'standardRate', 'imsRef'],
  'sales-orders': ['reference', 'description', 'customer', 'itemCode', 'quantity', 'dueDate'],
  'work-orders': ['reference', 'description', 'customer', 'itemCode', 'quantity', 'dueDate'],
  suppliers: ['code', 'name', 'gstNumber', 'city', 'state', 'phone', 'email'],
  stock: ['itemCode', 'warehouseCode', 'quantity', 'uom', 'batchNumber', 'updatedAt'],
  warehouses: ['code', 'name', 'companyCode', 'city', 'state'],
  'material-transactions': ['reference', 'itemCode', 'warehouseCode', 'transactionType', 'quantity'],
  users: ['reference', 'name', 'email', 'phone', 'role', 'isActive'],
  'purchase-orders': ['reference', 'supplierCode', 'itemCode', 'quantity', 'status'],
};

/** Table-name candidates per entity, best guess first. */
const TABLE_CANDIDATES = {
  companies: ['Company', 'companies', 'Organization', 'organizations', 'company'],
  products: ['Product', 'products', 'product'],
  items: ['Item', 'items', 'Material', 'materials', 'Product', 'products'],
  'sales-orders': ['SalesOrder', 'sales_orders', 'SaleOrder', 'sale_orders', 'Order', 'orders'],
  'work-orders': ['WorkOrder', 'work_orders', 'ProductionOrder', 'production_orders'],
  suppliers: ['Supplier', 'suppliers', 'Vendor', 'vendors'],
  stock: ['StockBalance', 'stock_balances', 'Stock', 'stock', 'Inventory', 'inventory'],
  warehouses: ['Warehouse', 'warehouses', 'Location', 'locations'],
  'material-transactions': [
    'StockMovement',
    'stock_movements',
    'MaterialTransaction',
    'material_transactions',
    'InventoryTransaction',
    'inventory_transactions',
  ],
  users: ['User', 'users'],
  'purchase-orders': ['PurchaseOrder', 'purchase_orders'],
};

const toSnake = (value) => value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
const normalise = (value) => value.replace(/[^a-z0-9]/gi, '').toLowerCase();

/** Column candidates for a canonical field, in the two conventions plus common synonyms. */
const FIELD_SYNONYMS = {
  code: ['code', 'sku', 'itemCode', 'partNumber', 'number'],
  name: ['name', 'title', 'description'],
  reference: ['orderNumber', 'number', 'reference', 'code', 'id'],
  companyCode: ['companyCode', 'organizationCode', 'companyId', 'organizationId'],
  itemCode: ['itemCode', 'sku', 'materialCode', 'itemId'],
  warehouseCode: ['warehouseCode', 'locationCode', 'warehouseId', 'locationId'],
  supplierCode: ['supplierCode', 'vendorCode', 'supplierId', 'vendorId'],
  quantity: ['quantity', 'qty', 'balance', 'onHand', 'availableQuantity'],
  uom: ['uom', 'unit', 'unitOfMeasure'],
  updatedAt: ['updatedAt', 'modifiedAt', 'lastUpdatedAt'],
  transactionType: ['type', 'transactionType', 'movementType'],
  customer: ['customerName', 'customer', 'partyName', 'buyerName'],
  dueDate: ['dueDate', 'deliveryDate', 'requiredDate', 'expectedDate'],
  isActive: ['isActive', 'active', 'enabled'],
};

function candidatesFor(field) {
  const base = FIELD_SYNONYMS[field] ?? [field];
  return [...new Set(base.flatMap((name) => [name, toSnake(name)]))];
}

const pool = new Pool({
  connectionString: url,
  max: 2,
  application_name: 'gridx-ims-introspect',
  ssl: sslMode === 'disable' ? undefined : { rejectUnauthorized: sslMode === 'require' },
});

try {
  const { rows } = await pool.query(
    `SELECT c.table_name, c.column_name, c.data_type
       FROM information_schema.columns AS c
       JOIN information_schema.tables  AS t
         ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = $1
        AND t.table_type IN ('BASE TABLE', 'VIEW')
      ORDER BY c.table_name, c.ordinal_position`,
    [schema],
  );

  if (rows.length === 0) {
    console.error(`No tables found in schema "${schema}". Is IMS_DATABASE_SCHEMA correct?`);
    process.exit(1);
  }

  /** @type {Map<string, string[]>} */
  const tables = new Map();
  for (const row of rows) {
    const columns = tables.get(row.table_name) ?? [];
    columns.push(row.column_name);
    tables.set(row.table_name, columns);
  }

  console.log(`\nIMS database: ${redact(url)}`);
  console.log(`Schema "${schema}" — ${tables.size} table(s)/view(s), ${rows.length} column(s)`);
  console.log(`Mapping profile under test: ${profileName}\n`);

  const generated = {};
  let broken = 0;
  let degraded = 0;

  for (const [entity, fields] of Object.entries(ENTITY_FIELDS)) {
    const table = pickTable(entity, tables);
    if (!table) {
      broken += 1;
      console.log(`✗ ${entity.padEnd(24)} no candidate table found`);
      console.log(`    tried: ${TABLE_CANDIDATES[entity].join(', ')}`);
      continue;
    }

    const columns = tables.get(table) ?? [];
    const mapped = {};
    const missing = [];
    for (const field of fields) {
      const column = pickColumn(field, columns);
      if (column) mapped[field] = column;
      else missing.push(field);
    }

    const changeColumn = pickColumn('updatedAt', columns) ?? pickColumn('createdAt', columns);
    generated[entity] = {
      table,
      columns: mapped,
      ...(changeColumn ? { changeColumn } : {}),
      ...(mapped.code || mapped.name
        ? { searchColumns: [mapped.code, mapped.name].filter(Boolean) }
        : {}),
    };

    if (missing.length > 0) {
      degraded += 1;
      console.log(`~ ${entity.padEnd(24)} ${schema}.${table}  (unmatched: ${missing.join(', ')})`);
    } else {
      console.log(`✓ ${entity.padEnd(24)} ${schema}.${table}`);
    }
  }

  console.log(
    `\n${Object.keys(ENTITY_FIELDS).length - broken - degraded} clean, ${degraded} partial, ${broken} unmatched.`,
  );
  console.log(
    'Fields left unmatched are usually joins (a code that lives on a parent table) or genuinely\n' +
      'absent. Fill those in by hand: a joined column is written "alias.column" with a matching\n' +
      '`joins` entry, and a computed one as "=<sql expression>".\n',
  );

  if (shouldWrite) {
    const target = resolve(repoRoot, 'ims-mapping.generated.json');
    writeFileSync(target, `${JSON.stringify(generated, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${target}`);
    console.log('Review it, then point GRID-X at it with:');
    console.log(`  IMS_MAPPING_FILE="${target}"\n`);
  } else {
    console.log('Re-run with --write to save a candidate mapping file.\n');
  }
} catch (error) {
  console.error(`\nCould not introspect the IMS database: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}

function pickTable(entity, tables) {
  for (const candidate of TABLE_CANDIDATES[entity]) {
    if (tables.has(candidate)) return candidate;
  }
  // Second pass: ignore case and punctuation, so `SALES_ORDERS` still matches `SalesOrder`.
  const wanted = TABLE_CANDIDATES[entity].map(normalise);
  for (const table of tables.keys()) {
    if (wanted.includes(normalise(table))) return table;
  }
  return null;
}

function pickColumn(field, columns) {
  for (const candidate of candidatesFor(field)) {
    if (columns.includes(candidate)) return candidate;
  }
  const wanted = candidatesFor(field).map(normalise);
  for (const column of columns) {
    if (wanted.includes(normalise(column))) return column;
  }
  return null;
}

function redact(connectionString) {
  try {
    const parsed = new URL(connectionString);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '(unparseable connection string)';
  }
}

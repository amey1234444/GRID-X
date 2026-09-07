#!/usr/bin/env node
/**
 * Lists the organisations in the OSWAR IMS, so `IMS_ORG_ID` can be filled in.
 *
 *   pnpm ims:orgs
 *
 * The IMS is multi-tenant: every material, warehouse, supplier and ledger row carries an `org_id`,
 * and GRID-X refuses to read without knowing which organisation it speaks for — an unscoped read
 * would pull every company's catalogue in. This prints each organisation's id alongside how much
 * data it actually holds, because a database often carries a test workspace or two and the id you
 * want is the one with the materials in it.
 *
 * Read-only: every statement runs inside a READ ONLY transaction, so it cannot alter the IMS even
 * through a mistake.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

require(resolve(repoRoot, 'apps/api/node_modules/dotenv')).config({
  path: resolve(repoRoot, '.env'),
});
const { Pool } = require(resolve(repoRoot, 'apps/api/node_modules/pg'));

const url = process.env.IMS_DATABASE_URL;
const schema = process.env.IMS_DATABASE_SCHEMA?.trim() || 'ims';
const sslMode = process.env.IMS_DB_SSL || 'require';

if (!url) {
  console.error('IMS_DATABASE_URL is not set. Put it in .env at the repository root, then run this again.');
  process.exit(1);
}

// The schema name reaches SQL as an identifier, so it is checked rather than trusted.
if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(schema)) {
  console.error(`IMS_DATABASE_SCHEMA "${schema}" is not a valid identifier.`);
  process.exit(1);
}
const S = `"${schema}"`;

const pool = new Pool({
  connectionString: url,
  max: 1,
  application_name: 'gridx-ims-orgs',
  connectionTimeoutMillis: Number(process.env.IMS_DB_CONNECTION_TIMEOUT_MS ?? 20000),
  ssl: sslMode === 'disable' ? undefined : { rejectUnauthorized: sslMode === 'require' },
});

const client = await pool.connect().catch((error) => {
  console.error(`\nCould not connect to the IMS database: ${error.message}`);
  if (error.code === 'ENOTFOUND') {
    console.error(
      '\nThe hostname does not resolve. Check the endpoint still exists in your database\n' +
        "provider's console — a deleted or renamed compute endpoint fails exactly like this.",
    );
  }
  process.exit(1);
});

try {
  await client.query('BEGIN READ ONLY');

  const { rows: version } = await client.query('SELECT version() AS v');
  console.log(`\nConnected: ${version[0].v.split(',')[0]}`);
  console.log(`Schema:    ${schema}\n`);

  const { rows: orgs } = await client.query(
    `SELECT o.id, o.slug, o.name,
            (SELECT count(*) FROM ${S}.materials  m WHERE m.org_id = o.id AND m.deleted_at IS NULL) AS materials,
            (SELECT count(*) FROM ${S}.warehouses w WHERE w.org_id = o.id AND w.deleted_at IS NULL) AS warehouses,
            (SELECT count(*) FROM ${S}.suppliers  s WHERE s.org_id = o.id AND s.deleted_at IS NULL) AS suppliers,
            (SELECT count(*) FROM ${S}.stock_transactions t WHERE t.org_id = o.id) AS ledger
       FROM ${S}.organizations o
      WHERE o.deleted_at IS NULL
      ORDER BY materials DESC, o.created_at ASC`,
  );

  if (orgs.length === 0) {
    console.log(`No organisations found in ${schema}.organizations.`);
  } else {
    for (const o of orgs) {
      console.log(`  ${o.name}  (${o.slug})`);
      console.log(`    IMS_ORG_ID="${o.id}"`);
      console.log(
        `    ${o.materials} materials · ${o.warehouses} warehouses · ` +
          `${o.suppliers} suppliers · ${o.ledger} ledger rows\n`,
      );
    }
    // Naming the likely answer beats leaving the reader to compare counts by eye.
    if (orgs.length > 1) {
      console.log(
        `Most likely "${orgs[0].slug}" — it holds the most materials. Confirm it is the\n` +
          'workspace OSWAR actually operates in before using it.\n',
      );
    }
  }

  await client.query('COMMIT');
} catch (error) {
  console.error(`\nQuery failed: ${error.message}`);
  if (error.code === '42P01') {
    console.error(
      `\nThat table does not exist in schema "${schema}". Check IMS_DATABASE_SCHEMA — the\n` +
        'OSWAR IMS keeps its tables in "ims", not "public".',
    );
  }
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}

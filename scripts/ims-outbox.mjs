#!/usr/bin/env node
/**
 * Applies `packages/db/prisma/ims/001_gridx_outbox.sql` to the IMS database.
 *
 *   pnpm ims:outbox            # create the GRID-X outbox schema and table
 *   pnpm ims:outbox --check    # report what exists, change nothing
 *
 * GRID-X creates the outbox itself on first push when IMS_OUTBOX_AUTO_CREATE=true. This script is
 * for the common case where it may not: the IMS database user is granted INSERT on one table and
 * nothing more, so a DBA runs this once with a privileged role and GRID-X is deployed with
 * IMS_OUTBOX_AUTO_CREATE=false.
 *
 * The SQL file is idempotent, so re-running is safe.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

require(resolve(repoRoot, 'apps/api/node_modules/dotenv')).config({
  path: resolve(repoRoot, '.env'),
});
const { Client } = require(resolve(repoRoot, 'apps/api/node_modules/pg'));

const url = process.env.IMS_DATABASE_URL;
const schema = process.env.IMS_OUTBOX_SCHEMA || 'gridx';
const table = process.env.IMS_OUTBOX_TABLE || 'ims_outbound_fact';
const sslMode = process.env.IMS_DB_SSL || 'require';
const checkOnly = process.argv.includes('--check');

if (!url) {
  console.error('IMS_DATABASE_URL is not set. Put it in .env, then run this again.');
  process.exit(1);
}

const client = new Client({
  connectionString: url,
  application_name: 'gridx-ims-outbox',
  ssl: sslMode === 'disable' ? undefined : { rejectUnauthorized: sslMode === 'require' },
});

try {
  await client.connect();

  const { rows: before } = await client.query(
    `SELECT to_regclass($1) IS NOT NULL AS present`,
    [`"${schema}"."${table}"`],
  );
  const present = before[0]?.present === true;

  if (checkOnly) {
    console.log(
      present
        ? `Outbox present: "${schema}"."${table}"`
        : `Outbox missing: "${schema}"."${table}" — run without --check to create it.`,
    );
    if (present) await reportQueue(client, schema, table);
    process.exit(0);
  }

  if (present) {
    console.log(`Outbox already present at "${schema}"."${table}"; re-applying is a no-op.`);
  }

  const sqlPath = resolve(repoRoot, 'packages/db/prisma/ims/001_gridx_outbox.sql');
  let sql = readFileSync(sqlPath, 'utf8');
  // The checked-in file names the defaults; honour an override without a second copy of the DDL.
  if (schema !== 'gridx') sql = sql.replaceAll('"gridx"', `"${schema}"`);
  if (table !== 'ims_outbound_fact') sql = sql.replaceAll('ims_outbound_fact', table);

  await client.query(sql);
  console.log(`Applied ${sqlPath}`);
  console.log(`Outbox ready at "${schema}"."${table}".`);
  console.log('Deploy GRID-X with IMS_OUTBOX_AUTO_CREATE=false if its role cannot create schemas.');
  await reportQueue(client, schema, table);
} catch (error) {
  console.error(`\nCould not apply the outbox DDL: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}

async function reportQueue(pgClient, outboxSchema, outboxTable) {
  const { rows } = await pgClient.query(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE consumed_at IS NULL)::int AS pending
       FROM "${outboxSchema}"."${outboxTable}"`,
  );
  const { total, pending } = rows[0] ?? { total: 0, pending: 0 };
  console.log(`Queue: ${pending} unconsumed of ${total} fact(s).`);
}

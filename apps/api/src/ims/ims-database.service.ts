import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, type PoolClient, type PoolConfig } from 'pg';
import type { AppConfig } from '../config/configuration';

/**
 * The direct connection to the IMS database.
 *
 * This is a second, deliberately small pool — separate from Prisma, which owns the GRID-X
 * database. Keeping them apart matters: the IMS pool is capped low so GRID-X can never exhaust
 * the IMS's connection budget, every read runs inside a `READ ONLY` transaction so a mapping
 * mistake cannot mutate the IMS, and a server-side `statement_timeout` means a query against an
 * unindexed column gives up instead of holding a connection open.
 *
 * The one thing GRID-X writes into the IMS database is its own outbox table, in its own schema
 * (`gridx` by default). It never writes to a table the IMS owns — it does not know the IMS's
 * invariants, and a foreign system quietly inserting rows is how integrations become outages.
 */
@Injectable()
export class ImsDatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(ImsDatabaseService.name);
  private pool: Pool | null = null;
  private outboxReady = false;

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  private get settings(): AppConfig['ims'] {
    return this.config.get('ims', { infer: true });
  }

  isConfigured(): boolean {
    return Boolean(this.settings.enabled && this.settings.database.url);
  }

  /** The connection string with its password removed, safe to show on a settings screen. */
  redactedUrl(): string | undefined {
    const url = this.settings.database.url;
    if (!url) return undefined;
    try {
      const parsed = new URL(url);
      if (parsed.password) parsed.password = '***';
      return parsed.toString();
    } catch {
      return 'set (unparseable)';
    }
  }

  private poolConfig(): PoolConfig {
    const { database } = this.settings;
    return {
      connectionString: database.url,
      max: database.poolMax,
      connectionTimeoutMillis: database.connectionTimeoutMs,
      idleTimeoutMillis: database.idleTimeoutMs,
      application_name: database.applicationName,
      ssl:
        database.ssl === 'disable'
          ? undefined
          : { rejectUnauthorized: database.ssl === 'require' },
      // Belt and braces: the same ceiling the transaction sets, in case a caller uses the pool
      // directly. `idle_in_transaction_session_timeout` stops a crashed request pinning a row.
      statement_timeout: database.statementTimeoutMs,
      idle_in_transaction_session_timeout: database.statementTimeoutMs * 2,
    };
  }

  private getPool(): Pool {
    if (!this.settings.database.url) {
      throw new Error('IMS_DATABASE_URL is not set, so GRID-X cannot reach the IMS database');
    }
    if (!this.pool) {
      this.pool = new Pool(this.poolConfig());
      // A pool error with no listener is an unhandled rejection that takes the process down.
      this.pool.on('error', (error) => {
        this.logger.error(`IMS connection pool error: ${error.message}`);
      });
      this.logger.log(
        `IMS database pool opened (max ${this.settings.database.poolMax}, schema ${this.settings.database.schema})`,
      );
    }
    return this.pool;
  }

  /**
   * Runs a SELECT inside a read-only transaction. Read-only is enforced by PostgreSQL, not by
   * convention, so an override that mapped an entity to `DELETE`-shaped SQL would be rejected by
   * the server rather than by our good intentions.
   */
  async read<T extends Record<string, unknown>>(text: string, values: unknown[] = []): Promise<T[]> {
    const client = await this.getPool().connect();
    try {
      await client.query('BEGIN READ ONLY');
      await client.query(`SET LOCAL statement_timeout = ${this.settings.database.statementTimeoutMs}`);
      const result = await client.query<T>(text, values);
      await client.query('COMMIT');
      return result.rows;
    } catch (error) {
      await safeRollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  /** A write against GRID-X's own schema inside the IMS database. Never against an IMS table. */
  async writeOutbox<T extends Record<string, unknown>>(
    text: string,
    values: unknown[] = [],
  ): Promise<T[]> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query<T>(text, values);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /** `schema.table`, quoted, for the outbox. */
  outboxTable(): string {
    const { write } = this.settings;
    return `"${write.schema}"."${write.table}"`;
  }

  /**
   * Creates the outbox schema and table if they are missing. Idempotent, and safe to call on
   * every push: after the first success it short-circuits.
   *
   * The same DDL is checked in as `packages/db/prisma/ims/001_gridx_outbox.sql` for teams whose
   * IMS database user is not allowed to create schemas — a DBA runs the file once and
   * `IMS_OUTBOX_AUTO_CREATE=false` keeps GRID-X from trying.
   */
  async ensureOutbox(): Promise<void> {
    if (this.outboxReady) return;
    const { write } = this.settings;
    if (!write.autoCreate) {
      this.outboxReady = true;
      return;
    }

    const schema = write.schema.replace(/"/g, '');
    const table = write.table.replace(/"/g, '');
    await this.writeOutbox(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await this.writeOutbox(
      `CREATE TABLE IF NOT EXISTS "${schema}"."${table}" (
         id             bigserial PRIMARY KEY,
         entity         text        NOT NULL,
         record_ref     text        NOT NULL,
         payload        jsonb       NOT NULL,
         source         text        NOT NULL DEFAULT 'grid-x',
         created_at     timestamptz NOT NULL DEFAULT now(),
         updated_at     timestamptz NOT NULL DEFAULT now(),
         consumed_at    timestamptz,
         consumer_note  text,
         CONSTRAINT ${quoteConstraint(table, 'entity_record_uniq')} UNIQUE (entity, record_ref)
       )`,
    );
    await this.writeOutbox(
      `CREATE INDEX IF NOT EXISTS ${quoteConstraint(table, 'unconsumed_idx')}
         ON "${schema}"."${table}" (created_at)
         WHERE consumed_at IS NULL`,
    );
    this.outboxReady = true;
    this.logger.log(`IMS outbox ready at "${schema}"."${table}"`);
  }

  /** Round-trip probe: server version and latency, or the reason it could not connect. */
  async probe(): Promise<{
    reachable: boolean;
    latencyMs: number;
    serverVersion?: string;
    message?: string;
  }> {
    const startedAt = Date.now();
    try {
      const rows = await this.read<{ version: string }>('SELECT version() AS version');
      return {
        reachable: true,
        latencyMs: Date.now() - startedAt,
        serverVersion: rows[0]?.version?.split(',')[0],
      };
    } catch (error) {
      return {
        reachable: false,
        latencyMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Everything GRID-X can see in the IMS schema: tables, views and their columns. This is what
   * makes a wrong mapping a five-minute fix instead of a support ticket — the operator is shown
   * the real table names next to the ones the mapping expected.
   */
  async introspectSchema(): Promise<Map<string, Set<string>>> {
    const rows = await this.read<{ table_name: string; column_name: string }>(
      `SELECT c.table_name, c.column_name
         FROM information_schema.columns AS c
         JOIN information_schema.tables  AS t
           ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE c.table_schema = $1
          AND t.table_type IN ('BASE TABLE', 'VIEW')
        ORDER BY c.table_name, c.ordinal_position`,
      [this.settings.database.schema],
    );

    const schema = new Map<string, Set<string>>();
    for (const row of rows) {
      const columns = schema.get(row.table_name) ?? new Set<string>();
      columns.add(row.column_name);
      schema.set(row.table_name, columns);
    }
    return schema;
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.pool) return;
    await this.pool.end();
    this.pool = null;
  }
}

async function safeRollback(client: PoolClient): Promise<void> {
  try {
    await client.query('ROLLBACK');
  } catch {
    // The connection is already broken; releasing it is the only useful thing left.
  }
}

/** Constraint and index names are per-table, so they carry the table name to stay unique. */
function quoteConstraint(table: string, suffix: string): string {
  return `"${table}_${suffix}"`;
}

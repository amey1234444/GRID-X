import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import { ImsDatabaseService } from '../ims-database.service';
import {
  IMS_ENTITY_SCHEMAS,
  IMS_INBOUND_ENTITIES,
  type ImsFetchOptions,
  type ImsFetchResult,
  type ImsGateway,
  type ImsHealth,
  type ImsInboundEntity,
  type ImsOutboundEntity,
} from '../ims.contract';
import {
  buildSelect,
  loadMapping,
  validateMapping,
  type ImsMapping,
  type MappingIssue,
} from '../ims.mapping';

export interface EntityIntrospection {
  entity: ImsInboundEntity;
  table: string;
  /** Whether the mapped table exists in the IMS schema. */
  tableExists: boolean;
  /** Mapped columns the table does not have. Joined and expression columns are not checked here. */
  missingColumns: string[];
  /** Columns the table has that the mapping does not use — useful when a name has drifted. */
  unmappedColumns: string[];
  status: 'ok' | 'degraded' | 'broken';
}

export interface ImsIntrospection {
  schema: string;
  tables: string[];
  entities: EntityIntrospection[];
  issues: MappingIssue[];
}

/**
 * The direct-database transport.
 *
 * Reads are SELECTs against the IMS's own tables through the configured mapping, run inside a
 * read-only transaction. Writes never touch an IMS table: outbound facts are upserted into
 * GRID-X's own outbox table inside the IMS database, keyed on (entity, record_ref), which makes
 * redelivery harmless and gives the IMS a queue it can drain at its own pace.
 *
 * Reading a foreign schema directly buys latency and removes a moving part, and costs coupling:
 * if the IMS renames a column, GRID-X notices. That is the trade the mapping layer and
 * `/api/ims/introspect` exist to make survivable.
 */
@Injectable()
export class DatabaseImsDriver implements ImsGateway {
  readonly name = 'database' as const;
  private readonly logger = new Logger(DatabaseImsDriver.name);
  private cachedMapping: { mapping: ImsMapping; warnings: string[]; overridden: string[] } | null =
    null;

  constructor(
    private readonly db: ImsDatabaseService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  private get settings(): AppConfig['ims'] {
    return this.config.get('ims', { infer: true });
  }

  /** The effective mapping. Built once — it comes from env and a file, neither of which move. */
  mapping(): { mapping: ImsMapping; warnings: string[]; overridden: string[] } {
    if (!this.cachedMapping) {
      const loaded = loadMapping(this.settings.mapping);
      for (const warning of loaded.warnings) this.logger.warn(warning);
      this.cachedMapping = {
        mapping: loaded.mapping,
        warnings: loaded.warnings,
        overridden: loaded.overridden,
      };
    }
    return this.cachedMapping;
  }

  isConfigured(): boolean {
    return this.db.isConfigured();
  }

  async health(): Promise<ImsHealth> {
    if (!this.isConfigured()) {
      return {
        driver: this.name,
        reachable: false,
        message: 'IMS_DATABASE_URL is not set',
      };
    }
    const probe = await this.db.probe();
    return {
      driver: this.name,
      reachable: probe.reachable,
      latencyMs: probe.latencyMs,
      serverVersion: probe.serverVersion,
      message: probe.message,
    };
  }

  async fetch(entity: ImsInboundEntity, options: ImsFetchOptions = {}): Promise<ImsFetchResult> {
    const { mapping } = this.mapping();
    const entityMapping = mapping[entity];
    if (!entityMapping) {
      throw new Error(`No IMS mapping is declared for ${entity}`);
    }

    const query = buildSelect(entity, entityMapping, this.settings.database.schema, {
      search: options.search,
      limit: options.limit ?? this.settings.sync.batchSize,
      since: options.since,
    });

    const rows = await this.db.read<Record<string, unknown>>(query.text, query.values);
    const schema = IMS_ENTITY_SCHEMAS[entity];

    const records: unknown[] = [];
    let dropped = 0;
    let watermark: Date | null = null;

    for (const row of rows) {
      if (entityMapping.changeColumn) {
        const changed = toDate(row[entityMapping.changeColumn] ?? row.updatedAt);
        if (changed && (!watermark || changed > watermark)) watermark = changed;
      }
      const parsed = schema.safeParse(normaliseRow(row));
      if (parsed.success) records.push(parsed.data);
      else dropped += 1;
    }

    if (dropped > 0) {
      this.logger.warn(
        `IMS ${entity}: ${dropped} of ${rows.length} row(s) did not match the boundary contract — check the mapping with GET /api/ims/introspect`,
      );
    }

    return {
      records,
      watermark: query.incremental ? watermark : null,
      fullScan: !query.incremental || !options.since,
      source: `${this.settings.database.schema}.${entityMapping.table}`,
    };
  }

  /**
   * Upserts one outbound fact into the GRID-X outbox inside the IMS database.
   *
   * ON CONFLICT means at-least-once delivery is safe: a job that is reopened and re-closed
   * overwrites its own row rather than queueing a second, contradictory one, and IMS sees the
   * latest truth for a record whether it has consumed the earlier version or not.
   */
  async deliver(
    entity: ImsOutboundEntity,
    recordRef: string,
    payload: Record<string, unknown>,
  ): Promise<string | null> {
    const { write } = this.settings;
    if (write.mode === 'none') {
      return 'IMS write mode is "none"; the fact is recorded in the sync log only';
    }
    if (!this.isConfigured()) {
      return 'IMS_DATABASE_URL is not set; payload queued in the sync log';
    }

    try {
      await this.db.ensureOutbox();
      await this.db.writeOutbox(
        `INSERT INTO ${this.db.outboxTable()} (entity, record_ref, payload, source, updated_at)
         VALUES ($1, $2, $3::jsonb, $4, now())
         ON CONFLICT (entity, record_ref) DO UPDATE
           SET payload    = EXCLUDED.payload,
               updated_at = now(),
               consumed_at = NULL,
               consumer_note = NULL`,
        [entity, recordRef, JSON.stringify(payload), 'grid-x'],
      );
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'IMS outbox write failed';
    }
  }

  /**
   * Compares the mapping against the live schema. This is the tool that turns "the sync returns
   * nothing" into "the mapping expects `Item.materialGrade` and the table has `material_grade`".
   */
  async introspect(): Promise<ImsIntrospection> {
    const { mapping } = this.mapping();
    const issues = validateMapping(mapping);
    const schemaName = this.settings.database.schema;
    const live = await this.db.introspectSchema();

    const entities: EntityIntrospection[] = IMS_INBOUND_ENTITIES.map((entity) => {
      const entityMapping = mapping[entity];
      const columns = live.get(entityMapping.table);
      const tableExists = Boolean(columns);

      // Only base-table columns can be checked here: a joined or expression column belongs to
      // another table and reporting it as missing would be noise.
      const baseColumns = Object.values(entityMapping.columns).filter(
        (column): column is string =>
          typeof column === 'string' && !column.startsWith('=') && !column.includes('.'),
      );
      const missingColumns = tableExists
        ? baseColumns.filter((column) => !columns?.has(column))
        : baseColumns;
      const mapped = new Set(baseColumns);
      const unmappedColumns = tableExists
        ? [...(columns ?? [])].filter((column) => !mapped.has(column))
        : [];

      const hasError = issues.some(
        (issue) => issue.entity === entity && issue.severity === 'error',
      );
      const status: EntityIntrospection['status'] =
        !tableExists || hasError ? 'broken' : missingColumns.length > 0 ? 'degraded' : 'ok';

      return {
        entity,
        table: `${entityMapping.schema ?? schemaName}.${entityMapping.table}`,
        tableExists,
        missingColumns,
        unmappedColumns,
        status,
      };
    });

    return { schema: schemaName, tables: [...live.keys()].sort(), entities, issues };
  }
}

/**
 * `pg` hands back `Date` objects for timestamps and `null` for absent values; the boundary
 * contract wants ISO strings and `undefined`, because `z.string().optional()` rejects null.
 * Doing the conversion here keeps every entity schema free of driver-specific unions.
 */
function normaliseRow(row: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) continue;
    if (value instanceof Date) output[key] = value.toISOString();
    else if (Buffer.isBuffer(value)) output[key] = value.toString('utf8');
    else output[key] = value;
  }
  return output;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

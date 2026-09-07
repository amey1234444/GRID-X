export type ImsDriverName = 'database' | 'http' | 'disabled';
export type ImsSslMode = 'disable' | 'require' | 'no-verify';
export type ImsWriteMode = 'outbox' | 'http' | 'none';
export type ImsMappingProfileName = 'oswar' | 'prisma' | 'snake';

export interface AppConfig {
  port: number;
  globalPrefix: string;
  corsOrigins: string[];
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  sessionIdleTimeoutMinutes: number;
  otpTtlMinutes: number;
  storage: {
    driver: 'local' | 's3';
    localDir: string;
    signedUrlTtlSeconds: number;
    s3: {
      endpoint?: string;
      region: string;
      bucket: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      forcePathStyle: boolean;
    };
  };
  notifications: {
    emailEnabled: boolean;
    smtp: {
      host?: string;
      port: number;
      user?: string;
      password?: string;
      from: string;
    };
    whatsappEnabled: boolean;
    whatsapp: {
      apiUrl?: string;
      apiToken?: string;
    };
  };
  ims: {
    /**
     * Master switch. When false GRID-X still records every boundary event in the sync log but
     * talks to nothing, so the boundary stays testable without an IMS to hand.
     */
    enabled: boolean;
    /**
     * How GRID-X reaches IMS.
     *
     * - `database` — a direct, read-only PostgreSQL connection to the IMS database
     *   (`IMS_DATABASE_URL`). Reads are SELECTs against the IMS's own tables; outbound facts
     *   never touch them (see `write.mode`).
     * - `http` — the IMS REST API (`IMS_BASE_URL`), the original boundary.
     * - `disabled` — no transport at all.
     *
     * Left unset it is derived: a database URL wins, then a base URL, else disabled.
     */
    driver: ImsDriverName;
    baseUrl?: string;
    apiKey?: string;
    /**
     * The IMS organisation GRID-X speaks for.
     *
     * The OSWAR IMS is multi-tenant: every material, warehouse, supplier and ledger row carries an
     * `org_id`. The direct driver scopes every read to this id and refuses to read without it. The
     * HTTP driver does not need it — the IMS derives the tenant from the access token — but it is
     * still checked against the token's org, so a credential pointing at the wrong workspace is
     * caught on the first call rather than after a week of importing someone else's catalogue.
     */
    orgId?: string;
    /**
     * Credentials for the REST transport. The OSWAR IMS issues no API keys and has no
     * client-credentials flow — `POST /auth/login` with a user's email and password is the only
     * way in — so this is a dedicated, least-privilege IMS user, not a person's own login.
     */
    email?: string;
    password?: string;
    timeoutMs: number;
    database: {
      /** PostgreSQL connection string for the IMS database — the whole point of the direct driver. */
      url?: string;
      /** Schema the IMS tables live in; `public` unless the IMS was namespaced. */
      schema: string;
      poolMax: number;
      connectionTimeoutMs: number;
      /** Per-statement ceiling applied server-side, so a bad mapping cannot pin the IMS. */
      statementTimeoutMs: number;
      idleTimeoutMs: number;
      /**
       * `require` verifies the server certificate, `no-verify` accepts a self-signed one (what
       * most managed Postgres providers hand out), `disable` turns TLS off entirely.
       */
      ssl: ImsSslMode;
      applicationName: string;
    };
    mapping: {
      /**
       * Which IMS the mapping describes. `oswar` is the real OSWAR IMS, transcribed from its
       * `schema.prisma` and the default. `prisma` (PascalCase tables, camelCase columns) and
       * `snake` (plural snake_case) are generic conventions kept for a different IMS.
       */
      profile: ImsMappingProfileName;
      /** Path to a JSON file overriding part or all of the profile. */
      file?: string;
      /** Inline JSON override, for platforms where a mounted file is awkward (Render, Vercel). */
      json?: string;
    };
    write: {
      /**
       * How outbound facts reach IMS.
       *
       * - `outbox` — INSERT into a GRID-X-owned table inside the IMS database. GRID-X never
       *   writes to a table IMS owns, so it cannot break an invariant it does not know about.
       * - `http` — POST to the IMS REST API.
       * - `none` — record in the sync log only.
       */
      mode: ImsWriteMode;
      schema: string;
      table: string;
      /** Create the outbox schema and table on boot when they are missing. */
      autoCreate: boolean;
      /**
       * Whether GRID-X may post real stock movements into the IMS ledger over REST.
       *
       * Off by default, and deliberately. `POST /transactions/bulk` accepts no idempotency key, so
       * a retry after a lost response issues the same material to the same partner twice. Turning
       * this on is a decision that the IMS ledger may occasionally need a manual correction —
       * worth it for a live integration, not something to inherit from a default.
       */
      postStock: boolean;
      /** The IMS warehouse outsourced material is issued from and returned to. */
      warehouseId?: string;
    };
    sync: {
      /** Whether the scheduler pulls masters on its own, or only an operator does. */
      inboundEnabled: boolean;
      /** Rows read per entity per sweep. */
      batchSize: number;
      /** Entities the scheduled sweep pulls, in order. */
      entities: string[];
    };
  };
  sentryDsn?: string;
  webAppUrl: string;
}

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function list(value: string | undefined, fallback: string[]): string[] {
  const parsed = (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}

/** An enum-ish env var, falling back rather than booting with a value nothing understands. */
function oneOf<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  const normalised = value?.trim().toLowerCase() as T | undefined;
  return normalised && allowed.includes(normalised) ? normalised : fallback;
}

/**
 * `IMS_DRIVER` is honoured when set; otherwise the transport is inferred from what was
 * configured. Inferring beats defaulting to `http`, because an operator who sets only
 * `IMS_DATABASE_URL` has said plainly which transport they mean.
 */
function resolveImsDriver(
  enabled: boolean,
  databaseUrl: string | undefined,
  baseUrl: string | undefined,
): ImsDriverName {
  if (!enabled) return 'disabled';
  const explicit = oneOf<ImsDriverName | 'auto'>(
    process.env.IMS_DRIVER,
    ['database', 'http', 'disabled', 'auto'],
    'auto',
  );
  if (explicit !== 'auto') return explicit;
  if (databaseUrl) return 'database';
  if (baseUrl) return 'http';
  return 'disabled';
}

export default function configuration(): AppConfig {
  const imsEnabled = bool(process.env.IMS_ENABLED, false);
  const imsDatabaseUrl = process.env.IMS_DATABASE_URL?.trim() || undefined;
  const imsBaseUrl = process.env.IMS_BASE_URL?.trim() || undefined;

  return {
    port: num(process.env.PORT ?? process.env.API_PORT, 4000),
    globalPrefix: process.env.API_GLOBAL_PREFIX ?? 'api',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
      accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
      refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
    },
    sessionIdleTimeoutMinutes: num(process.env.SESSION_IDLE_TIMEOUT_MINUTES, 60),
    otpTtlMinutes: num(process.env.OTP_TTL_MINUTES, 10),
    storage: {
      driver: (process.env.STORAGE_DRIVER as 'local' | 's3') ?? 'local',
      localDir: process.env.STORAGE_LOCAL_DIR ?? './storage',
      signedUrlTtlSeconds: num(process.env.STORAGE_SIGNED_URL_TTL_SECONDS, 300),
      s3: {
        endpoint: process.env.S3_ENDPOINT || undefined,
        region: process.env.S3_REGION ?? 'ap-south-1',
        bucket: process.env.S3_BUCKET ?? 'gridx',
        accessKeyId: process.env.S3_ACCESS_KEY_ID || undefined,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || undefined,
        forcePathStyle: bool(process.env.S3_FORCE_PATH_STYLE, true),
      },
    },
    notifications: {
      emailEnabled: bool(process.env.NOTIFY_EMAIL_ENABLED, false),
      smtp: {
        host: process.env.SMTP_HOST || undefined,
        port: num(process.env.SMTP_PORT, 587),
        user: process.env.SMTP_USER || undefined,
        password: process.env.SMTP_PASSWORD || undefined,
        from: process.env.SMTP_FROM ?? 'GRID-X <no-reply@oswar.example>',
      },
      whatsappEnabled: bool(process.env.NOTIFY_WHATSAPP_ENABLED, false),
      whatsapp: {
        apiUrl: process.env.WHATSAPP_API_URL || undefined,
        apiToken: process.env.WHATSAPP_API_TOKEN || undefined,
      },
    },
    ims: {
      enabled: imsEnabled,
      driver: resolveImsDriver(imsEnabled, imsDatabaseUrl, imsBaseUrl),
      baseUrl: imsBaseUrl,
      apiKey: process.env.IMS_API_KEY || undefined,
      orgId: process.env.IMS_ORG_ID?.trim() || undefined,
      email: process.env.IMS_AUTH_EMAIL?.trim() || undefined,
      password: process.env.IMS_AUTH_PASSWORD || undefined,
      timeoutMs: num(process.env.IMS_TIMEOUT_MS, 15000),
      database: {
        url: imsDatabaseUrl,
        schema: process.env.IMS_DATABASE_SCHEMA?.trim() || 'public',
        poolMax: num(process.env.IMS_DB_POOL_MAX, 5),
        connectionTimeoutMs: num(process.env.IMS_DB_CONNECTION_TIMEOUT_MS, 10000),
        statementTimeoutMs: num(process.env.IMS_DB_STATEMENT_TIMEOUT_MS, 15000),
        idleTimeoutMs: num(process.env.IMS_DB_IDLE_TIMEOUT_MS, 30000),
        ssl: oneOf<ImsSslMode>(
          process.env.IMS_DB_SSL,
          ['disable', 'require', 'no-verify'],
          'require',
        ),
        applicationName: process.env.IMS_DB_APPLICATION_NAME?.trim() || 'gridx-ims',
      },
      mapping: {
        profile: oneOf<ImsMappingProfileName>(
          process.env.IMS_MAPPING_PROFILE,
          ['oswar', 'prisma', 'snake'],
          // The OSWAR IMS is the IMS this integration is for, and its profile is checked against
          // the real schema. The other two are conventions to fall back on for a different IMS.
          'oswar',
        ),
        file: process.env.IMS_MAPPING_FILE || undefined,
        json: process.env.IMS_MAPPING_JSON || undefined,
      },
      write: {
        mode: oneOf<ImsWriteMode>(
          process.env.IMS_WRITE_MODE,
          ['outbox', 'http', 'none'],
          imsDatabaseUrl ? 'outbox' : imsBaseUrl ? 'http' : 'none',
        ),
        schema: process.env.IMS_OUTBOX_SCHEMA?.trim() || 'gridx',
        table: process.env.IMS_OUTBOX_TABLE?.trim() || 'ims_outbound_fact',
        autoCreate: bool(process.env.IMS_OUTBOX_AUTO_CREATE, true),
        postStock: bool(process.env.IMS_HTTP_POST_STOCK, false),
        warehouseId: process.env.IMS_ISSUE_WAREHOUSE_ID?.trim() || undefined,
      },
      sync: {
        inboundEnabled: bool(process.env.IMS_SYNC_INBOUND_ENABLED, Boolean(imsDatabaseUrl)),
        batchSize: num(process.env.IMS_SYNC_BATCH_SIZE, 500),
        // Only entities GRID-X persists are worth a scheduled sweep, and only the ones this IMS
        // actually publishes. It has no product master, so `products` is not in the default.
        entities: list(process.env.IMS_SYNC_ENTITIES, ['companies', 'items']),
      },
    },
    sentryDsn: process.env.SENTRY_DSN || undefined,
    webAppUrl: process.env.WEB_APP_URL ?? 'http://localhost:3000',
  };
}

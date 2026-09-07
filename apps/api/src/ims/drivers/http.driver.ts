import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import {
  IMS_ENTITY_SCHEMAS,
  type ImsFetchOptions,
  type ImsFetchResult,
  type ImsGateway,
  type ImsHealth,
  type ImsInboundEntity,
  type ImsOutboundEntity,
} from '../ims.contract';

/**
 * The REST transport, written against the OSWAR IMS as it actually is.
 *
 * Three facts about that API shape everything here.
 *
 * It issues no API keys. `POST /auth/login` with an email and password is the only way in, and it
 * returns a bearer token that expires (a day by default), so this driver holds a session and
 * renews it rather than sending a static secret. The credential is meant to be a dedicated
 * least-privilege IMS user, not a person's own login.
 *
 * Its list endpoints take no `since` and no page cursor: every read is the whole table. So reads
 * here are always full scans, and `watermark` is null — claiming otherwise would let the scheduler
 * advance a cursor past rows it never saw.
 *
 * Its tenant comes from the token, not the URL. That is the transport's main advantage over the
 * direct database link: it is impossible to read another organisation's data by accident. This
 * driver still checks the token's org against `IMS_ORG_ID` when one is set, so a credential
 * pointing at the wrong workspace fails on the first call instead of quietly importing a stranger's
 * catalogue.
 */
@Injectable()
export class HttpImsDriver implements ImsGateway {
  readonly name = 'http' as const;
  private readonly logger = new Logger(HttpImsDriver.name);
  private session: { token: string; expiresAt: number; orgId: string; orgSlug: string } | null =
    null;
  /** One in-flight login shared by concurrent callers, so a cold start does not stampede. */
  private pendingLogin: Promise<string> | null = null;

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  private get settings(): AppConfig['ims'] {
    return this.config.get('ims', { infer: true });
  }

  isConfigured(): boolean {
    const { enabled, baseUrl, apiKey, email, password } = this.settings;
    return Boolean(enabled && baseUrl && (apiKey || (email && password)));
  }

  async health(): Promise<ImsHealth> {
    const { baseUrl } = this.settings;
    if (!baseUrl) {
      return { driver: this.name, reachable: false, message: 'IMS_BASE_URL is not set' };
    }
    if (!this.isConfigured()) {
      return {
        driver: this.name,
        reachable: false,
        message: 'IMS_AUTH_EMAIL and IMS_AUTH_PASSWORD (or IMS_API_KEY) are not set',
      };
    }

    const startedAt = Date.now();
    try {
      // `/health` is public, so it proves the host is up but not that the credential works.
      // Authenticating as well is what makes a green light here mean the sync can actually run.
      const response = await this.request('GET', 'health', { authenticated: false });
      if (!response.ok) {
        return {
          driver: this.name,
          reachable: false,
          latencyMs: Date.now() - startedAt,
          message: `IMS responded ${response.status} to /health`,
        };
      }
      const session = await this.authenticate();
      return {
        driver: this.name,
        reachable: true,
        latencyMs: Date.now() - startedAt,
        serverVersion: `${baseUrl} (org ${session.orgSlug})`,
      };
    } catch (error) {
      return {
        driver: this.name,
        reachable: false,
        latencyMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async fetch(entity: ImsInboundEntity, options: ImsFetchOptions = {}): Promise<ImsFetchResult> {
    const endpoint = IMS_ENDPOINTS[entity];
    if (endpoint.unsupported) {
      return {
        records: [],
        unsupported: endpoint.unsupported,
        watermark: null,
        fullScan: false,
        source: `${entity} is not published by this IMS`,
      };
    }

    const response = await this.request('GET', endpoint.path);
    if (!response.ok) {
      throw new Error(`IMS responded ${response.status} to GET /${endpoint.path}`);
    }

    const body: unknown = await response.json();
    const rows = endpoint.normalise(body);

    const schema = IMS_ENTITY_SCHEMAS[entity];
    const parsed = rows.map((row) => schema.safeParse(row));
    const records = parsed.filter((r) => r.success).map((r) => (r as { data: unknown }).data);

    const dropped = rows.length - records.length;
    if (dropped > 0) {
      this.logger.warn(
        `IMS ${entity}: ${dropped} of ${rows.length} row(s) did not match the boundary contract`,
      );
    }

    // Filtering and limiting happen here rather than in the query, because the IMS accepts
    // neither. Doing it after the read at least keeps the caller's contract honest.
    const search = options.search?.trim().toLowerCase();
    const filtered = search
      ? records.filter((record) => JSON.stringify(record).toLowerCase().includes(search))
      : records;
    const limited = options.limit ? filtered.slice(0, options.limit) : filtered;

    return {
      records: limited,
      // Never a watermark: the IMS has no `since`, so every read is a full scan and advancing a
      // cursor would skip rows on the next sweep.
      watermark: null,
      fullScan: true,
      source: `${this.settings.baseUrl}/${endpoint.path}`,
    };
  }

  /**
   * Delivers one outbound fact.
   *
   * One of the seven facts in the boundary contract has somewhere to go in this IMS. Material
   * issued to a partner is a stock movement, and `OUTSOURCE` is already in the IMS's own
   * `TransactionType` enum — GRID-X is using the vocabulary the IMS designed for this, not bending
   * `ISSUE` to mean something new.
   *
   * The rest are reported as undeliverable, so they stay in the sync log (or the database outbox)
   * for the IMS team to drain rather than being quietly dropped. Job status, rejected quantities,
   * conversion cost, invoices and completion dates describe outsourcing, which this IMS has no
   * model for at all. `finished-components-received` is the interesting omission: a finished
   * component is not an IMS material — the IMS has no component master — and this IMS has no
   * unambiguous inbound type for job-work output (`RETURN_IN` means returned goods, `PURCHASE`
   * means bought, and `MANUFACTURING` is an *outbound* consumption type here). Which one OSWAR
   * wants is an accounting decision; GRID-X will not guess it into the ledger.
   *
   * Posting stock is off unless `IMS_HTTP_POST_STOCK` is on, and deliberately so: the IMS accepts
   * no idempotency key on `POST /transactions/bulk`, so a retry after a lost response would issue
   * the same material twice. GRID-X will not move another system's stock on a guess.
   */
  async deliver(
    entity: ImsOutboundEntity,
    recordRef: string,
    payload: Record<string, unknown>,
  ): Promise<string | null> {
    if (!this.isConfigured()) {
      return 'IMS REST transport is not configured; payload queued in the sync log';
    }

    const movement = STOCK_MOVEMENTS[entity as keyof typeof STOCK_MOVEMENTS];
    if (!movement) {
      return (
        `The OSWAR IMS has no endpoint for "${entity}" — it models inventory, not outsourcing. ` +
        'The fact is retained in the sync log for the IMS team to consume.'
      );
    }
    if (!this.settings.write.postStock) {
      return (
        `IMS_HTTP_POST_STOCK is off, so "${entity}" was not posted to the IMS ledger. ` +
        'The fact is retained in the sync log.'
      );
    }

    const warehouseId = this.settings.write.warehouseId;
    if (!warehouseId) {
      return 'IMS_ISSUE_WAREHOUSE_ID is not set, so there is no IMS warehouse to post the movement against';
    }

    const lines = toMovementLines(payload);
    if (lines.length === 0) {
      return (
        'No line on this fact carries an IMS material reference (Item.imsRef). Sync `items` from ' +
        'IMS first so GRID-X items know their IMS material id.'
      );
    }

    try {
      const response = await this.request('POST', 'transactions/bulk', {
        body: {
          warehouseId,
          type: movement.type,
          // Groups every line of this fact under one reference in the IMS ledger, so a stores user
          // can trace a movement back to the GRID-X job that caused it.
          batchRef: `gridx:${entity}:${recordRef}`,
          reference: String(payload.jobNumber ?? recordRef).slice(0, 100),
          remarks: movement.remarks(payload),
          lines,
        },
      });
      if (response.ok) return null;
      const detail = await safeText(response);
      return `IMS responded ${response.status} to POST /transactions/bulk${detail ? `: ${detail}` : ''}`;
    } catch (error) {
      return error instanceof Error ? error.message : 'IMS push failed';
    }
  }

  // -------------------------------------------------------------------------
  // Session
  // -------------------------------------------------------------------------

  /** Drops the cached session, so the next call logs in again. Used after a 401. */
  private invalidateSession(): void {
    this.session = null;
  }

  private async authenticate(): Promise<{ token: string; orgId: string; orgSlug: string }> {
    // A minute of headroom: a token that expires mid-flight reads as an auth failure the caller
    // cannot tell from a bad password.
    if (this.session && this.session.expiresAt > Date.now() + 60_000) return this.session;

    const { baseUrl, email, password, apiKey } = this.settings;
    if (!baseUrl) throw new Error('IMS_BASE_URL is not set');

    // A pre-issued token, for an IMS deployment that hands one out or a short-lived test.
    if (apiKey && !(email && password)) {
      this.session = {
        token: apiKey,
        expiresAt: expiryOf(apiKey) ?? Date.now() + 5 * 60_000,
        orgId: this.settings.orgId ?? 'unknown',
        orgSlug: 'unknown',
      };
      return this.session;
    }
    if (!email || !password) {
      throw new Error('IMS_AUTH_EMAIL and IMS_AUTH_PASSWORD are not set');
    }

    const login = (this.pendingLogin ??= this.login(email, password).finally(() => {
      this.pendingLogin = null;
    }));
    await login;
    if (!this.session) throw new Error('IMS login did not establish a session');
    return this.session;
  }

  private async login(email: string, password: string): Promise<string> {
    const response = await this.request('POST', 'auth/login', {
      authenticated: false,
      body: { email, password },
    });
    if (!response.ok) {
      const detail = await safeText(response);
      throw new Error(
        `IMS login failed with ${response.status}${detail ? `: ${detail}` : ''} — check IMS_AUTH_EMAIL and IMS_AUTH_PASSWORD`,
      );
    }

    const body = (await response.json()) as {
      accessToken?: string;
      org?: { id?: string; slug?: string };
    };
    const token = body.accessToken;
    if (!token) throw new Error('IMS login response carried no accessToken');

    const orgId = body.org?.id ?? '';
    const expected = this.settings.orgId;
    if (expected && orgId && expected !== orgId) {
      // Failing here is the whole point: the alternative is a sync that works perfectly and fills
      // GRID-X with another company's materials.
      throw new Error(
        `IMS credential belongs to organisation ${orgId}, but IMS_ORG_ID is ${expected}. ` +
          'Refusing to sync across organisations.',
      );
    }

    this.session = {
      token,
      expiresAt: expiryOf(token) ?? Date.now() + 30 * 60_000,
      orgId,
      orgSlug: body.org?.slug ?? orgId,
    };
    this.logger.log(`Authenticated with IMS as ${email} (org ${this.session.orgSlug})`);
    return token;
  }

  private async request(
    method: 'GET' | 'POST',
    path: string,
    options: { body?: unknown; authenticated?: boolean; retryOnUnauthorised?: boolean } = {},
  ): Promise<Response> {
    const { baseUrl, timeoutMs } = this.settings;
    if (!baseUrl) throw new Error('IMS_BASE_URL is not set');

    const authenticated = options.authenticated ?? true;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (authenticated) {
      const session = await this.authenticate();
      headers.Authorization = `Bearer ${session.token}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(`${baseUrl.replace(/\/$/, '')}/${path}`, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    // A 401 on an authenticated call means the token died early — the IMS revokes tokens on a
    // password change, not only on expiry. One re-login and one retry; never a loop.
    if (response.status === 401 && authenticated && options.retryOnUnauthorised !== false) {
      this.invalidateSession();
      return this.request(method, path, { ...options, retryOnUnauthorised: false });
    }
    return response;
  }
}

// ---------------------------------------------------------------------------
// Entity endpoints
// ---------------------------------------------------------------------------

interface ImsEndpoint {
  path: string;
  unsupported?: string;
  normalise: (body: unknown) => unknown[];
}

/** Every list endpoint on this IMS returns a bare JSON array. */
function asArray(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body as Record<string, unknown>[];
  const data = (body as { data?: unknown })?.data;
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/**
 * Canonical entity to IMS endpoint, plus the shape translation. This is the HTTP twin of the
 * `oswar` database mapping profile, and the two must agree: a job planner should see the same item
 * list whichever transport the deployment uses.
 */
const IMS_ENDPOINTS: Record<ImsInboundEntity, ImsEndpoint> = {
  // The IMS's organisation is its company record, and a token sees exactly one of them.
  companies: {
    path: 'organizations/me',
    normalise: (body) => {
      const org = body as { slug?: string; name?: string } | null;
      return org?.slug && org?.name ? [{ code: org.slug, name: org.name }] : [];
    },
  },
  items: {
    path: 'materials',
    normalise: (body) =>
      asArray(body).map((row) => ({
        code: row.code,
        name: row.name,
        uom: row.unitOfMeasure ?? 'KG',
        materialGrade: (row.category as { name?: string } | undefined)?.name,
        standardRate: row.unitPrice,
        imsRef: row.id,
      })),
  },
  warehouses: {
    path: 'warehouses',
    normalise: (body) =>
      asArray(body).map((row) => ({ code: row.code, name: row.name })),
  },
  suppliers: {
    path: 'suppliers',
    normalise: (body) =>
      asArray(body).map((row) => ({
        code: row.code,
        name: row.name,
        gstNumber: str(row.gstNumber),
        phone: str(row.phone),
        email: str(row.email),
      })),
  },
  // `stock-grid` is the one endpoint that reports quantity per warehouse; `/materials` only gives a
  // single org-wide figure, which cannot tell a planner where the material actually is.
  stock: {
    path: 'materials/stock-grid',
    normalise: (body) => {
      const grid = body as {
        warehouses?: Array<{ id: string; code: string; name: string }>;
        grid?: Array<{
          material?: { code?: string; name?: string; unitOfMeasure?: string };
          stocks?: Record<string, number>;
        }>;
      } | null;
      const warehouses = grid?.warehouses ?? [];
      const rows: unknown[] = [];
      for (const entry of grid?.grid ?? []) {
        for (const warehouse of warehouses) {
          const quantity = entry.stocks?.[warehouse.id];
          // A zero row is noise on a screen meant to answer "where is the material".
          if (quantity === undefined || quantity === 0) continue;
          rows.push({
            itemCode: entry.material?.code,
            itemName: entry.material?.name,
            warehouseCode: warehouse.code,
            warehouseName: warehouse.name,
            quantity,
            uom: entry.material?.unitOfMeasure,
          });
        }
      }
      return rows;
    },
  },
  'material-transactions': {
    path: 'transactions',
    normalise: (body) =>
      asArray(body).map((row) => ({
        reference: row.id,
        itemCode: (row.material as { code?: string } | undefined)?.code,
        warehouseCode: (row.warehouse as { code?: string } | undefined)?.code,
        transactionType: row.type,
        quantity: row.quantity,
        uom: (row.material as { unitOfMeasure?: string } | undefined)?.unitOfMeasure,
        occurredAt: row.createdAt,
      })),
  },
  // Members are Owner/Admin-only in the IMS, which is why the service credential needs ADMIN.
  users: {
    path: 'organizations/members',
    normalise: (body) =>
      asArray(body).map((row) => ({
        reference: row.id,
        name: str(row.name),
        email: str(row.email),
        phone: str(row.phone),
        role: str(row.role),
        isActive: row.isActive,
      })),
  },
  products: {
    path: '',
    unsupported:
      'The OSWAR IMS has no product master — its production module was removed. Products are ' +
      'maintained in GRID-X until an ERP that owns them is connected.',
    normalise: () => [],
  },
  'sales-orders': {
    path: '',
    unsupported:
      'The OSWAR IMS holds no sales orders. Raise GRID-X jobs from an internal or manual ' +
      'requirement until a system of record for customer orders is connected.',
    normalise: () => [],
  },
  'work-orders': {
    path: '',
    unsupported:
      'The OSWAR IMS holds no work orders — its production module was removed. GRID-X jobs are ' +
      'raised from an internal or manual requirement instead (Module 4).',
    normalise: () => [],
  },
  'purchase-orders': {
    path: '',
    unsupported:
      'The OSWAR IMS has no purchase-order master; it records only a free-text `po_reference` on ' +
      'each goods receipt, which is a receipt rather than an order and must not be read as one.',
    normalise: () => [],
  },
};

// ---------------------------------------------------------------------------
// Outbound stock movements
// ---------------------------------------------------------------------------

/**
 * The two outbound facts that are genuinely stock movements, and the IMS transaction type each one
 * is. `OUTSOURCE` and `RETURN_IN` already exist in the IMS's own `TransactionType` enum, so GRID-X
 * is using the vocabulary the IMS designed for this, not bending `ISSUE` to mean something new.
 */
const STOCK_MOVEMENTS = {
  'material-issued': {
    type: 'OUTSOURCE',
    remarks: (payload: Record<string, unknown>) =>
      `Issued to partner ${String(payload.partnerName ?? payload.partnerCode ?? '')} for GRID-X job ${String(payload.jobNumber ?? '')}`.slice(
        0,
        500,
      ),
  },
} as const;

interface MovementLine {
  materialId: string;
  quantity: number;
  remarks?: string;
}

/**
 * Pulls postable lines out of an outbound payload.
 *
 * Only lines carrying `itemImsRef` survive: that is the IMS's own material id, learned by syncing
 * `items`. A line without one cannot be posted, and inventing a material would be far worse than
 * reporting the gap.
 */
function toMovementLines(payload: Record<string, unknown>): MovementLine[] {
  const lines: MovementLine[] = [];
  const issues = Array.isArray(payload.issues) ? payload.issues : [];
  for (const issue of issues as Array<Record<string, unknown>>) {
    for (const item of (Array.isArray(issue.items) ? issue.items : []) as Array<
      Record<string, unknown>
    >) {
      const materialId = str(item.itemImsRef);
      const quantity = Number(item.quantity);
      if (!materialId || !Number.isFinite(quantity) || quantity <= 0) continue;
      lines.push({
        materialId,
        quantity,
        remarks: str(issue.challanNumber) && `Challan ${String(issue.challanNumber)}`.slice(0, 500),
      });
    }
  }
  return lines;
}

/** Reads `exp` out of a JWT without verifying it — this is our own token, used only for timing. */
function expiryOf(token: string): number | null {
  const segments = token.split('.');
  if (segments.length !== 3) return null;
  try {
    const claims = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8')) as {
      exp?: number;
    };
    return typeof claims.exp === 'number' ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Error bodies help an operator; a body that will not read must not mask the status code. */
async function safeText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return '';
  }
}

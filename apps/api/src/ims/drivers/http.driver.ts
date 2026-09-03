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
 * The original boundary: the IMS REST API.
 *
 * Kept as a first-class driver rather than deleted, because the two transports suit different
 * deployments — a direct database connection needs the two systems in the same network and a
 * credential the IMS DBA is willing to issue, and not every environment has both.
 */
@Injectable()
export class HttpImsDriver implements ImsGateway {
  readonly name = 'http' as const;
  private readonly logger = new Logger(HttpImsDriver.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  private get settings(): AppConfig['ims'] {
    return this.config.get('ims', { infer: true });
  }

  isConfigured(): boolean {
    return Boolean(this.settings.enabled && this.settings.baseUrl);
  }

  async health(): Promise<ImsHealth> {
    const { baseUrl } = this.settings;
    if (!this.isConfigured() || !baseUrl) {
      return { driver: this.name, reachable: false, message: 'IMS_BASE_URL is not set' };
    }

    const startedAt = Date.now();
    try {
      const response = await this.request('GET', 'health');
      return {
        driver: this.name,
        reachable: response.ok,
        latencyMs: Date.now() - startedAt,
        serverVersion: baseUrl,
        message: response.ok ? undefined : `IMS responded ${response.status}`,
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
    const query = new URLSearchParams();
    if (options.search) query.set('search', options.search);
    if (options.limit) query.set('limit', String(options.limit));
    // `since` is passed through; an IMS that ignores it simply returns everything, which the
    // upsert path handles because it is idempotent.
    if (options.since) query.set('since', options.since.toISOString());

    const suffix = query.size > 0 ? `?${query.toString()}` : '';
    const response = await this.request('GET', `${entity}${suffix}`);
    if (!response.ok) throw new Error(`IMS responded ${response.status}`);

    const body: unknown = await response.json();
    const rows = Array.isArray(body)
      ? body
      : body && typeof body === 'object' && Array.isArray((body as { data?: unknown[] }).data)
        ? (body as { data: unknown[] }).data
        : null;
    if (!rows) throw new Error('Unexpected IMS payload shape');

    const schema = IMS_ENTITY_SCHEMAS[entity];
    const records = rows
      .map((row) => schema.safeParse(row))
      .filter((parsed): parsed is { success: true; data: unknown } => parsed.success)
      .map((parsed) => parsed.data);

    const dropped = rows.length - records.length;
    if (dropped > 0) {
      this.logger.warn(`IMS ${entity}: ${dropped} row(s) did not match the boundary contract`);
    }

    return {
      records,
      watermark: null,
      fullScan: !options.since,
      source: `${this.settings.baseUrl}/${entity}`,
    };
  }

  async deliver(
    entity: ImsOutboundEntity,
    _recordRef: string,
    payload: Record<string, unknown>,
  ): Promise<string | null> {
    if (!this.isConfigured()) {
      return 'IMS HTTP endpoint is not configured; payload queued in the sync log';
    }
    try {
      const response = await this.request('POST', entity, payload);
      return response.ok ? null : `IMS responded ${response.status}`;
    } catch (error) {
      return error instanceof Error ? error.message : 'IMS push failed';
    }
  }

  private async request(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<Response> {
    const { baseUrl, apiKey, timeoutMs } = this.settings;
    if (!baseUrl) throw new Error('IMS_BASE_URL is not set');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${baseUrl.replace(/\/$/, '')}/${path}`, {
        method,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}

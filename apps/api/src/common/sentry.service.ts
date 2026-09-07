import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';

interface SentryTarget {
  storeUrl: string;
  publicKey: string;
}

export interface ErrorContext {
  method?: string;
  path?: string;
  userId?: string;
  statusCode?: number;
}

/**
 * Minimal Sentry reporter.
 *
 * The official SDK is not used deliberately: Render builds with
 * `pnpm install --frozen-lockfile`, so pulling in a new runtime dependency would
 * fail the deploy until the lockfile is regenerated. Sentry's store endpoint is a
 * plain HTTPS POST, which is all that error reporting needs here. Reporting is
 * fire-and-forget — a failing sink must never turn into a second failure on the
 * request path.
 */
@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new Logger(SentryService.name);
  private target: SentryTarget | null = null;
  private environment = 'development';

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const dsn = this.config.get<AppConfig['sentryDsn']>('sentryDsn');
    this.environment = process.env.NODE_ENV ?? 'development';
    if (!dsn) {
      this.logger.log('SENTRY_DSN is not set; error reporting is disabled');
      return;
    }
    this.target = this.parseDsn(dsn);
    if (this.target) this.logger.log('Sentry error reporting enabled');
  }

  get enabled(): boolean {
    return this.target !== null;
  }

  captureException(error: unknown, context: ErrorContext = {}): void {
    if (!this.target) return;
    void this.send(error, context).catch(() => {
      /* reporting must never mask the original error */
    });
  }

  /** DSN format: https://<publicKey>@<host>/<projectId> */
  private parseDsn(dsn: string): SentryTarget | null {
    try {
      const url = new URL(dsn);
      const projectId = url.pathname.replace(/^\//, '');
      if (!url.username || !projectId) throw new Error('missing key or project id');
      return {
        publicKey: url.username,
        storeUrl: `${url.protocol}//${url.host}/api/${projectId}/store/`,
      };
    } catch (error) {
      this.logger.warn(`SENTRY_DSN could not be parsed, reporting stays off: ${String(error)}`);
      return null;
    }
  }

  private async send(error: unknown, context: ErrorContext): Promise<void> {
    if (!this.target) return;
    const err = error instanceof Error ? error : new Error(String(error));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      await fetch(this.target.storeUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-sentry-auth': [
            'Sentry sentry_version=7',
            'sentry_client=gridx-api/1.0',
            `sentry_key=${this.target.publicKey}`,
          ].join(', '),
        },
        signal: controller.signal,
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          platform: 'node',
          level: 'error',
          logger: 'gridx-api',
          environment: this.environment,
          server_name: 'gridx-api',
          transaction: context.path,
          exception: {
            values: [
              {
                type: err.name,
                value: err.message,
                stacktrace: { frames: this.frames(err) },
              },
            ],
          },
          tags: {
            ...(context.method ? { method: context.method } : {}),
            ...(context.statusCode ? { status_code: String(context.statusCode) } : {}),
          },
          user: context.userId ? { id: context.userId } : undefined,
        }),
      });
    } finally {
      clearTimeout(timer);
    }
  }

  /** Sentry expects frames oldest-first; Node stacks are newest-first. */
  private frames(error: Error): Array<{ filename: string; function: string; lineno?: number }> {
    const lines = (error.stack ?? '').split('\n').slice(1, 31);
    const parsed = lines
      .map((line) => /at (.+?) \((.+?):(\d+):\d+\)/.exec(line.trim()) ?? /at (.+?):(\d+):\d+/.exec(line.trim()))
      .filter((match): match is RegExpExecArray => match !== null)
      .map((match) =>
        match.length >= 4
          ? { function: match[1], filename: match[2], lineno: Number(match[3]) }
          : { function: '<anonymous>', filename: match[1], lineno: Number(match[2]) },
      );
    return parsed.reverse();
  }
}

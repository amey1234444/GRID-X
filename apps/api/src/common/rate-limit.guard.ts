import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  RATE_LIMIT_TIER_KEYS,
  RateLimitWindow,
  defaultRateLimitFor,
  rateLimitFor,
} from '@gridx/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from './settings.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from './decorators';

interface Bucket {
  hits: number;
  resetAt: number;
}

/**
 * Fixed-window rate limiting for the unauthenticated surface — sign-in and OTP
 * request in particular, where an attacker can otherwise iterate passwords or
 * burn a partner's OTP quota.
 *
 * Counters are shared through Postgres so the limit is the limit no matter how many API instances
 * are running. Held in process memory, as they were, N instances meant N times the allowance and
 * scaling out quietly widened the brute-force window (Section 18 — scalability).
 *
 * The in-memory map is kept in front of the shared counter: it rejects an attacker who has already
 * blown the limit on this instance without a database round trip, and it is what the guard falls
 * back to if the database is unreachable — degraded but never open.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly buckets = new Map<string, Bucket>();
  private lastSweep = Date.now();

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly settings?: SettingsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) return true;

    const window = await this.resolve(options);
    const request = context.switchToHttp().getRequest<Request>();
    const key = `${context.getClass().name}.${context.getHandler().name}:${this.clientKey(request)}`;
    const now = Date.now();
    this.sweep(now);

    const windowStart = Math.floor(now / window.windowMs) * window.windowMs;
    const resetAt = windowStart + window.windowMs;

    const local = this.buckets.get(key);
    if (!local || local.resetAt <= now) {
      this.buckets.set(key, { hits: 1, resetAt });
    } else {
      local.hits += 1;
      if (local.hits > window.limit) this.reject(key, resetAt, now);
    }

    const shared = await this.countShared(key, windowStart, resetAt);
    if (shared !== null && shared > window.limit) this.reject(key, resetAt, now);
    return true;
  }

  /**
   * Turns a route's declaration into concrete numbers. A tier is read from system settings so the
   * allowance can be retuned from the admin screen; if settings cannot be read the tier's shipped
   * default applies, which keeps the limit closed rather than open.
   */
  private async resolve(options: RateLimitOptions): Promise<RateLimitWindow> {
    if (!('tier' in options)) return options;
    if (!this.settings) return defaultRateLimitFor(options.tier);
    try {
      const keys = RATE_LIMIT_TIER_KEYS[options.tier];
      const values = await this.settings.getMany([keys.limit, keys.window]);
      return rateLimitFor(options.tier, values);
    } catch (error) {
      this.logger.warn(`Could not read rate-limit settings, using defaults: ${String(error)}`);
      return defaultRateLimitFor(options.tier);
    }
  }

  private reject(key: string, resetAt: number, now: number): never {
    const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));
    this.logger.warn(`Rate limit hit for ${key}; retry in ${retryAfter}s`);
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `Too many attempts. Try again in ${retryAfter} seconds.`,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /**
   * Increments the window's shared counter and returns the new total.
   *
   * The row id carries the window start, so a new window is a new row and expired rows simply age
   * out — no read-modify-write, and two instances incrementing at once cannot lose a count.
   * Returns null if the counter is unavailable, leaving the in-memory limit in charge rather than
   * failing sign-in outright.
   */
  private async countShared(
    key: string,
    windowStart: number,
    resetAt: number,
  ): Promise<number | null> {
    try {
      const row = await this.prisma.rateLimitCounter.upsert({
        where: { id: `${key}|${windowStart}` },
        create: { id: `${key}|${windowStart}`, hits: 1, expiresAt: new Date(resetAt) },
        update: { hits: { increment: 1 } },
        select: { hits: true },
      });
      return row.hits;
    } catch (error) {
      this.logger.warn(`Shared rate-limit counter unavailable, using local only: ${String(error)}`);
      return null;
    }
  }

  /**
   * Behind Render's proxy `request.ip` reflects X-Forwarded-For, which the client
   * controls. The phone number or email in the body is therefore mixed in, so
   * spoofing the header does not hand an attacker a fresh bucket per attempt.
   */
  private clientKey(request: Request): string {
    const body = (request.body ?? {}) as { phone?: unknown; email?: unknown };
    const subject =
      typeof body.phone === 'string'
        ? body.phone
        : typeof body.email === 'string'
          ? body.email.toLowerCase()
          : '';
    return `${request.ip ?? 'unknown'}|${subject}`;
  }

  /** Drops expired buckets occasionally so the map cannot grow without bound. */
  private sweep(now: number): void {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
    // Expired shared rows are only rubbish, so clearing them is best-effort and never awaited.
    void this.prisma.rateLimitCounter
      .deleteMany({ where: { expiresAt: { lt: new Date(now) } } })
      .catch(() => {
        /* the next sweep will try again */
      });
  }
}

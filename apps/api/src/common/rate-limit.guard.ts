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
import { RATE_LIMIT_KEY, RateLimitOptions } from './decorators';

interface Bucket {
  hits: number;
  resetAt: number;
}

/**
 * Fixed-window rate limiting for the unauthenticated surface — sign-in and OTP
 * request in particular, where an attacker can otherwise iterate passwords or
 * burn a partner's OTP quota. Counters live in process memory: with more than one
 * API instance each holds its own window, which still bounds a single attacker's
 * throughput without adding a shared store to the deployment.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly buckets = new Map<string, Bucket>();
  private lastSweep = Date.now();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const key = `${context.getClass().name}.${context.getHandler().name}:${this.clientKey(request)}`;
    const now = Date.now();
    this.sweep(now);

    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { hits: 1, resetAt: now + options.windowMs });
      return true;
    }

    bucket.hits += 1;
    if (bucket.hits > options.limit) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      this.logger.warn(`Rate limit hit for ${key}; retry in ${retryAfter}s`);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many attempts. Try again in ${retryAfter} seconds.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
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
  }
}

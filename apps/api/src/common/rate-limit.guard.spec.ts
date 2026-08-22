import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitOptions } from './decorators';
import { PrismaService } from '../prisma/prisma.service';

/**
 * A stand-in for the shared counter. Counting here as the real table does lets the tests cover the
 * behaviour that matters at scale: two guards, as two API instances, sharing one window.
 */
function sharedCounter() {
  const hits = new Map<string, number>();
  return {
    store: hits,
    prisma: {
      rateLimitCounter: {
        upsert: ({ where }: { where: { id: string } }) => {
          const next = (hits.get(where.id) ?? 0) + 1;
          hits.set(where.id, next);
          return Promise.resolve({ hits: next });
        },
        deleteMany: () => Promise.resolve({ count: 0 }),
      },
    } as unknown as PrismaService,
  };
}

function contextFor(body: Record<string, unknown>, ip = '10.0.0.1'): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ ip, body }) }),
    getHandler: () => function login() {},
    getClass: () => class AuthController {},
  } as unknown as ExecutionContext;
}

function guardWith(
  options: RateLimitOptions | undefined,
  prisma: PrismaService = sharedCounter().prisma,
): RateLimitGuard {
  const reflector = { getAllAndOverride: () => options } as unknown as Reflector;
  return new RateLimitGuard(reflector, prisma);
}

describe('RateLimitGuard', () => {
  it('allows routes that declare no limit', async () => {
    const guard = guardWith(undefined);
    for (let i = 0; i < 50; i += 1) {
      expect(await guard.canActivate(contextFor({ email: 'a@b.com' }))).toBe(true);
    }
  });

  it('allows requests up to the limit and rejects the next one', async () => {
    const guard = guardWith({ limit: 3, windowMs: 60_000 });
    const context = contextFor({ email: 'user@oswar.example' });

    expect(await guard.canActivate(context)).toBe(true);
    expect(await guard.canActivate(context)).toBe(true);
    expect(await guard.canActivate(context)).toBe(true);
    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
  });

  it('counts each subject separately so one user cannot lock out another', async () => {
    const guard = guardWith({ limit: 2, windowMs: 60_000 });
    const first = contextFor({ email: 'one@oswar.example' });
    const second = contextFor({ email: 'two@oswar.example' });

    await guard.canActivate(first);
    await guard.canActivate(first);
    await expect(guard.canActivate(first)).rejects.toThrow(HttpException);
    expect(await guard.canActivate(second)).toBe(true);
  });

  it('does not let a spoofed forwarding header reset the window for one subject', async () => {
    const guard = guardWith({ limit: 2, windowMs: 60_000 });
    const phone = { phone: '+919000000000' };

    await guard.canActivate(contextFor(phone, '10.0.0.1'));
    await guard.canActivate(contextFor(phone, '10.0.0.1'));
    // A different source IP is a different bucket, but the subject still limits
    // how far one number can be pushed from any single origin.
    expect(await guard.canActivate(contextFor(phone, '10.0.0.2'))).toBe(true);
    expect(await guard.canActivate(contextFor(phone, '10.0.0.2'))).toBe(true);
    await expect(guard.canActivate(contextFor(phone, '10.0.0.2'))).rejects.toThrow(HttpException);
  });

  it('starts a fresh window once the previous one expires', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-17T10:00:00Z'));
    const guard = guardWith({ limit: 1, windowMs: 1_000 });
    const context = contextFor({ email: 'expiry@oswar.example' });

    expect(await guard.canActivate(context)).toBe(true);
    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

    jest.setSystemTime(new Date('2026-08-17T10:00:02Z'));
    expect(await guard.canActivate(context)).toBe(true);
    jest.useRealTimers();
  });

  it('holds one window across instances, so scaling out does not widen the limit', async () => {
    // Two guards standing in for two API instances behind the load balancer.
    const shared = sharedCounter();
    const first = guardWith({ limit: 3, windowMs: 60_000 }, shared.prisma);
    const second = guardWith({ limit: 3, windowMs: 60_000 }, shared.prisma);
    const context = contextFor({ email: 'attacker@example.com' });

    expect(await first.canActivate(context)).toBe(true);
    expect(await second.canActivate(context)).toBe(true);
    expect(await first.canActivate(context)).toBe(true);

    // The fourth attempt exceeds the limit even though neither instance has seen three itself.
    await expect(second.canActivate(context)).rejects.toThrow(HttpException);
  });

  it('falls back to the local window rather than failing sign-in when the store is down', async () => {
    const broken = {
      rateLimitCounter: {
        upsert: () => Promise.reject(new Error('database unreachable')),
        deleteMany: () => Promise.resolve({ count: 0 }),
      },
    } as unknown as PrismaService;
    const guard = guardWith({ limit: 2, windowMs: 60_000 }, broken);
    const context = contextFor({ email: 'degraded@oswar.example' });

    expect(await guard.canActivate(context)).toBe(true);
    expect(await guard.canActivate(context)).toBe(true);
    // Degraded, but never open.
    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
  });
});

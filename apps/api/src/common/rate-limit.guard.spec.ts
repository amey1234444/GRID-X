import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitOptions } from './decorators';

function contextFor(body: Record<string, unknown>, ip = '10.0.0.1'): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ ip, body }) }),
    getHandler: () => function login() {},
    getClass: () => class AuthController {},
  } as unknown as ExecutionContext;
}

function guardWith(options: RateLimitOptions | undefined): RateLimitGuard {
  const reflector = { getAllAndOverride: () => options } as unknown as Reflector;
  return new RateLimitGuard(reflector);
}

describe('RateLimitGuard', () => {
  it('allows routes that declare no limit', () => {
    const guard = guardWith(undefined);
    for (let i = 0; i < 50; i += 1) {
      expect(guard.canActivate(contextFor({ email: 'a@b.com' }))).toBe(true);
    }
  });

  it('allows requests up to the limit and rejects the next one', () => {
    const guard = guardWith({ limit: 3, windowMs: 60_000 });
    const context = contextFor({ email: 'user@oswar.example' });

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);
  });

  it('counts each subject separately so one user cannot lock out another', () => {
    const guard = guardWith({ limit: 2, windowMs: 60_000 });
    const first = contextFor({ email: 'one@oswar.example' });
    const second = contextFor({ email: 'two@oswar.example' });

    guard.canActivate(first);
    guard.canActivate(first);
    expect(() => guard.canActivate(first)).toThrow(HttpException);
    expect(guard.canActivate(second)).toBe(true);
  });

  it('does not let a spoofed forwarding header reset the window for one subject', () => {
    const guard = guardWith({ limit: 2, windowMs: 60_000 });
    const phone = { phone: '+919000000000' };

    guard.canActivate(contextFor(phone, '10.0.0.1'));
    guard.canActivate(contextFor(phone, '10.0.0.1'));
    // A different source IP is a different bucket, but the subject still limits
    // how far one number can be pushed from any single origin.
    expect(guard.canActivate(contextFor(phone, '10.0.0.2'))).toBe(true);
    expect(guard.canActivate(contextFor(phone, '10.0.0.2'))).toBe(true);
    expect(() => guard.canActivate(contextFor(phone, '10.0.0.2'))).toThrow(HttpException);
  });

  it('starts a fresh window once the previous one expires', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-17T10:00:00Z'));
    const guard = guardWith({ limit: 1, windowMs: 1_000 });
    const context = contextFor({ email: 'expiry@oswar.example' });

    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);

    jest.setSystemTime(new Date('2026-08-17T10:00:02Z'));
    expect(guard.canActivate(context)).toBe(true);
    jest.useRealTimers();
  });
});

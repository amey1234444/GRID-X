import {
  ExecutionContext,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { PermissionCode, RateLimitTier } from '@gridx/shared';
import { AuthedRequest, RequestUser } from './request-user';

export const IS_PUBLIC_KEY = 'gridx:isPublic';
export const PERMISSIONS_KEY = 'gridx:permissions';
export const RATE_LIMIT_KEY = 'gridx:rateLimit';
export const ALLOW_ENROLMENT_KEY = 'gridx:allowEnrolmentSession';

/**
 * A route's throttling rule, either as explicit numbers or — preferably — as one of the three
 * configurable tiers, so the allowance can be tuned from the admin screen instead of a redeploy.
 */
export type RateLimitOptions = { limit: number; windowMs: number } | { tier: RateLimitTier };

/** Marks a route as reachable without an access token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Marks a route reachable by a two-factor enrolment session (Section 18).
 *
 * A user whose role requires a second factor and has not enrolled signs in to a token that opens
 * only these routes — enrolment itself, and reading their own profile so the screen can greet
 * them. Everything else refuses the token, which is what makes the requirement enforceable rather
 * than advisory.
 */
export const AllowEnrolmentSession = () => SetMetadata(ALLOW_ENROLMENT_KEY, true);

/**
 * Caps how often one caller may hit a route.
 *
 * Prefer the tier form — `@RateLimit('login')` — which reads its numbers from system settings.
 * The explicit form stays for a route that genuinely needs its own allowance.
 */
export function RateLimit(tier: RateLimitTier): MethodDecorator & ClassDecorator;
export function RateLimit(limit: number, windowMs: number): MethodDecorator & ClassDecorator;
export function RateLimit(
  tierOrLimit: RateLimitTier | number,
  windowMs?: number,
): MethodDecorator & ClassDecorator {
  const options: RateLimitOptions =
    typeof tierOrLimit === 'number'
      ? { limit: tierOrLimit, windowMs: windowMs as number }
      : { tier: tierOrLimit };
  return SetMetadata(RATE_LIMIT_KEY, options);
}

/** Declares the permissions required by a route (Section 18 RBAC). */
export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!request.user) throw new UnauthorizedException('Not authenticated');
    return request.user;
  },
);

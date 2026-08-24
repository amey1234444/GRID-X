import {
  ExecutionContext,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { PermissionCode } from '@gridx/shared';
import { AuthedRequest, RequestUser } from './request-user';

export const IS_PUBLIC_KEY = 'gridx:isPublic';
export const PERMISSIONS_KEY = 'gridx:permissions';
export const RATE_LIMIT_KEY = 'gridx:rateLimit';
export const ALLOW_ENROLMENT_KEY = 'gridx:allowEnrolmentSession';

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

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

/** Caps how often one caller may hit a route — used on the credential endpoints. */
export const RateLimit = (limit: number, windowMs: number) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowMs } satisfies RateLimitOptions);

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

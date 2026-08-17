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

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

/** Marks a route as reachable without an access token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

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

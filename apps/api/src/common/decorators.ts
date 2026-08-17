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

/** Marks a route as reachable without an access token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

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

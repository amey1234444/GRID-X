import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionCode } from '@gridx/shared';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from '../common/decorators';
import { AuthedRequest } from '../common/request-user';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const user = request.user;
    if (!user) throw new ForbiddenException('Not authenticated');

    const missing = required.filter((permission) => !user.permissions.includes(permission));
    if (missing.length > 0) {
      throw new ForbiddenException(`Your role does not allow: ${missing.join(', ')}`);
    }
    return true;
  }
}

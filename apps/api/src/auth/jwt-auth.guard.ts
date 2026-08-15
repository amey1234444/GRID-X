import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PermissionCode, permissionsForRole } from '@gridx/shared';
import { IS_PUBLIC_KEY } from '../common/decorators';
import { AuthedRequest } from '../common/request-user';
import { PrismaService } from '../prisma/prisma.service';

export interface AccessTokenPayload {
  sub: string;
  typ: 'access';
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Missing access token');

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(header.slice(7), {
        secret: this.config.get<string>('jwt.accessSecret'),
      });
    } catch {
      throw new UnauthorizedException('Session expired, please sign in again');
    }
    if (payload.typ !== 'access') throw new UnauthorizedException('Invalid token type');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true, partner: { select: { id: true, isActive: true } }, companies: true },
    });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Account is not active');
    if (user.partner && !user.partner.isActive) {
      throw new UnauthorizedException('Partner account is suspended');
    }

    request.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      userType: user.userType,
      roleCode: user.role.code,
      permissions: permissionsForRole(user.role.code) as PermissionCode[],
      partnerId: user.partnerId,
      companyIds: user.companies.map((link) => link.companyId),
      defaultCompanyId:
        user.companies.find((link) => link.isDefault)?.companyId ??
        user.companies[0]?.companyId ??
        null,
    };
    return true;
  }
}

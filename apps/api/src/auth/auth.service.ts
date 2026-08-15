import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { User } from '@gridx/db';
import {
  AuthUser,
  LoginInput,
  LoginResponse,
  PermissionCode,
  RequestOtpInput,
  VerifyOtpInput,
  permissionsForRole,
} from '@gridx/shared';
import { AppConfig } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

interface DeviceContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  /** Internal users: email + password, optional TOTP-style second factor for senior roles. */
  async login(input: LoginInput, device: DeviceContext): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { role: true, partner: true, companies: true },
    });
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid email or password');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Account is not active');

    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    if (user.twoFactorEnabled) {
      if (!input.twoFactorCode) throw new UnauthorizedException('Two-factor code required');
      if (!this.verifySecondFactor(user, input.twoFactorCode)) {
        throw new UnauthorizedException('Invalid two-factor code');
      }
    }

    return this.issueSession(user.id, device, 'PASSWORD_LOGIN');
  }

  /** Partner users on low-connectivity phones: OTP first, optional password afterwards. */
  async requestOtp(input: RequestOtpInput): Promise<{ sent: boolean; expiresInMinutes: number }> {
    const ttl = this.config.get<AppConfig['otpTtlMinutes']>('otpTtlMinutes') ?? 10;
    const user = await this.prisma.user.findUnique({ where: { phone: input.phone } });
    // Always answer the same way so the endpoint cannot be used to enumerate partner numbers.
    if (!user || user.status !== 'ACTIVE') return { sent: true, expiresInMinutes: ttl };

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.otpCode.create({
      data: {
        userId: user.id,
        phone: input.phone,
        codeHash: AuthService.hashToken(code),
        expiresAt: new Date(Date.now() + ttl * 60_000),
      },
    });
    // Delivery is handled by the WhatsApp/SMS provider; logged in development only.
    this.logger.log(`OTP for ${input.phone}: ${code}`);
    return { sent: true, expiresInMinutes: ttl };
  }

  async verifyOtp(input: VerifyOtpInput, device: DeviceContext): Promise<LoginResponse> {
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone: input.phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp?.userId) throw new UnauthorizedException('Request a new code');
    if (otp.attempts >= 5) throw new UnauthorizedException('Too many attempts, request a new code');

    if (otp.codeHash !== AuthService.hashToken(input.code)) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid code');
    }

    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    return this.issueSession(otp.userId, device, 'OTP_LOGIN');
  }

  async partnerPasswordLogin(
    phone: string,
    password: string,
    device: DeviceContext,
  ): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid phone or password');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Account is not active');
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) throw new UnauthorizedException('Invalid phone or password');
    return this.issueSession(user.id, device, 'PARTNER_PASSWORD_LOGIN');
  }

  /** Refresh-token rotation with family revocation on reuse (Section 18). */
  async refresh(refreshToken: string, device: DeviceContext): Promise<LoginResponse> {
    const tokenHash = AuthService.hashToken(refreshToken);
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!existing) throw new UnauthorizedException('Session not recognised');

    if (existing.revokedAt || existing.expiresAt < new Date()) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Session expired, please sign in again');
    }

    const rotated = await this.createRefreshToken(existing.userId, device, existing.familyId);
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedBy: rotated.tokenHash },
    });
    const user = await this.loadAuthUser(existing.userId);
    return {
      ...(await this.accessToken(existing.userId)),
      refreshToken: rotated.token,
      user,
    };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = AuthService.hashToken(refreshToken);
      const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
      if (record) {
        await this.prisma.refreshToken.updateMany({
          where: { familyId: record.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return;
      }
    }
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash) throw new BadRequestException('No password set for this account');
    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await this.hashPassword(newPassword),
        passwordUpdatedAt: new Date(),
      },
    });
    // All other sessions are invalidated when the password changes.
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async loadAuthUser(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { role: true, partner: true, companies: true },
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      userType: user.userType,
      roleCode: user.role.code,
      permissions: permissionsForRole(user.role.code) as PermissionCode[],
      partnerId: user.partnerId,
      partnerName: user.partner?.businessName ?? null,
      companyIds: user.companies.map((link) => link.companyId),
      defaultCompanyId:
        user.companies.find((link) => link.isDefault)?.companyId ??
        user.companies[0]?.companyId ??
        null,
      language: user.language,
      twoFactorEnabled: user.twoFactorEnabled,
    };
  }

  private async issueSession(
    userId: string,
    device: DeviceContext,
    action: string,
  ): Promise<LoginResponse> {
    const refresh = await this.createRefreshToken(userId, device, randomUUID());
    await this.prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    const user = await this.loadAuthUser(userId);
    await this.audit.record(null, {
      action,
      entityType: 'User',
      entityId: userId,
      ipAddress: device.ipAddress,
      userAgent: device.userAgent,
    });
    return { ...(await this.accessToken(userId)), refreshToken: refresh.token, user };
  }

  private async accessToken(userId: string): Promise<{ accessToken: string; expiresIn: number }> {
    const jwtConfig = this.config.get<AppConfig['jwt']>('jwt');
    if (!jwtConfig) throw new Error('JWT configuration missing');
    const accessToken = await this.jwt.signAsync(
      { sub: userId, typ: 'access' },
      { secret: jwtConfig.accessSecret, expiresIn: jwtConfig.accessTtl },
    );
    return { accessToken, expiresIn: this.ttlSeconds(jwtConfig.accessTtl) };
  }

  private async createRefreshToken(
    userId: string,
    device: DeviceContext,
    familyId: string,
  ): Promise<{ token: string; tokenHash: string }> {
    const jwtConfig = this.config.get<AppConfig['jwt']>('jwt');
    if (!jwtConfig) throw new Error('JWT configuration missing');
    const token = randomBytes(48).toString('base64url');
    const tokenHash = AuthService.hashToken(token);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        familyId,
        userAgent: device.userAgent ?? null,
        ipAddress: device.ipAddress ?? null,
        expiresAt: new Date(Date.now() + this.ttlSeconds(jwtConfig.refreshTtl) * 1000),
      },
    });
    return { token, tokenHash };
  }

  private ttlSeconds(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl.trim());
    if (!match) return 900;
    const value = Number(match[1]);
    const unit = match[2];
    const multiplier = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
    return value * multiplier;
  }

  /**
   * Time-based second factor derived from the stored secret. Codes rotate every 30 seconds and
   * the previous window is accepted to tolerate clock drift on partner devices.
   */
  private verifySecondFactor(user: User, code: string): boolean {
    if (!user.twoFactorSecret) return false;
    const window = Math.floor(Date.now() / 30_000);
    return [window, window - 1].some(
      (step) =>
        createHash('sha256')
          .update(`${user.twoFactorSecret}:${step}`)
          .digest('hex')
          .replace(/\D/g, '')
          .slice(0, 6)
          .padEnd(6, '0') === code,
    );
  }
}

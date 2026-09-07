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
import { SettingsService } from '../common/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  generateRecoveryCodes,
  generateSecret,
  normaliseRecoveryCode,
  otpauthUri,
  verifyTotp,
} from './totp';

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
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
  ) {}

  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  /** Internal users: email + password, plus an RFC 6238 second factor for senior roles. */
  async login(input: LoginInput, device: DeviceContext): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { role: true, partner: true, companies: true },
    });
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid email or password');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Account is not active');

    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    // Two-factor only stands between the user and their account once enrolment is confirmed —
    // an account flagged for 2FA that never completed setup would otherwise be locked out.
    if (user.twoFactorEnabled && user.twoFactorConfirmedAt) {
      if (!input.twoFactorCode) throw new UnauthorizedException('Two-factor code required');
      await this.assertSecondFactor(user, input.twoFactorCode);
      return this.issueSession(user.id, device, 'PASSWORD_LOGIN');
    }

    // Section 18 — "two-factor authentication for admins". Being opt-in made that unenforceable:
    // a Group Admin could run on a password indefinitely, and an admin setting the flag on someone
    // changed nothing until that person chose to enrol.
    //
    // A senior role that has not enrolled gets in, but only as far as the enrolment screen. That
    // is the one shape of enforcement that cannot lock anybody out of their own account.
    if (await this.twoFactorRequiredFor(user.roleId)) {
      return this.issueEnrolmentSession(user.id, device);
    }

    return this.issueSession(user.id, device, 'PASSWORD_LOGIN');
  }

  /** Whether the roles configured in system settings oblige this user to hold a second factor. */
  private async twoFactorRequiredFor(roleId: string): Promise<boolean> {
    const [required, role] = await Promise.all([
      this.settings.get('security.twoFactorRequiredRoles'),
      this.prisma.role.findUnique({ where: { id: roleId }, select: { code: true } }),
    ]);
    return Boolean(role && required.includes(role.code));
  }

  // -------------------------------------------------------------------------
  // Two-factor authentication (Section 18)
  // -------------------------------------------------------------------------

  /**
   * Starts enrolment: issues a fresh secret and the otpauth URI an authenticator app scans.
   * Nothing is enforced until `confirmTwoFactor` proves the user can read a code from it, so a
   * half-finished setup can always be abandoned or restarted.
   */
  async beginTwoFactorEnrolment(
    userId: string,
  ): Promise<{ secret: string; otpauthUri: string; issuer: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.twoFactorEnabled && user.twoFactorConfirmedAt) {
      throw new BadRequestException(
        'Two-factor authentication is already active. Disable it before enrolling a new device.',
      );
    }

    const secret = generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret, twoFactorConfirmedAt: null },
    });

    const account = user.email ?? user.phone ?? user.name;
    return { secret, otpauthUri: otpauthUri(secret, account), issuer: 'GRID-X' };
  }

  /**
   * Completes enrolment against a code from the app, then hands back the recovery codes. They are
   * shown exactly once — only their hashes are kept — so the response is the user's only copy.
   */
  async confirmTwoFactorEnrolment(
    userId: string,
    code: string,
    device: DeviceContext = {},
  ): Promise<{ recoveryCodes: string[]; session: LoginResponse }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.twoFactorSecret) {
      throw new BadRequestException('Start two-factor enrolment before confirming it');
    }
    if (!verifyTotp(user.twoFactorSecret, code)) {
      throw new UnauthorizedException(
        'That code did not match. Check your device clock and try the current code.',
      );
    }

    const recoveryCodes = generateRecoveryCodes();
    const hashed = await Promise.all(
      recoveryCodes.map((recoveryCode) =>
        argon2.hash(normaliseRecoveryCode(recoveryCode), { type: argon2.argon2id }),
      ),
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorConfirmedAt: new Date(),
        twoFactorRecoveryCodes: hashed,
      },
    });
    await this.audit.record(null, {
      action: 'TWO_FACTOR_ENABLED',
      entityType: 'User',
      entityId: userId,
    });

    // Enrolling is the last step of signing in for a user who was sent here by the role
    // requirement, so a full session is issued now rather than making them log in twice.
    const session = await this.issueSession(userId, device, 'TWO_FACTOR_ENROLLED');
    return { recoveryCodes, session };
  }

  /** Turning 2FA off requires a current code or a recovery code, so a stolen session cannot. */
  async disableTwoFactor(userId: string, code: string): Promise<{ disabled: true }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.twoFactorEnabled) throw new BadRequestException('Two-factor is not enabled');
    await this.assertSecondFactor(user, code);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorConfirmedAt: null,
        twoFactorRecoveryCodes: [],
      },
    });
    await this.audit.record(null, {
      action: 'TWO_FACTOR_DISABLED',
      entityType: 'User',
      entityId: userId,
    });
    return { disabled: true };
  }

  /**
   * Accepts either a TOTP code or one unused recovery code. A recovery code is consumed on use,
   * so the same slip of paper cannot be replayed.
   */
  private async assertSecondFactor(user: User, code: string): Promise<void> {
    if (user.twoFactorSecret && verifyTotp(user.twoFactorSecret, code)) return;

    const candidate = normaliseRecoveryCode(code);
    for (const hash of user.twoFactorRecoveryCodes) {
      if (await argon2.verify(hash, candidate)) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { twoFactorRecoveryCodes: user.twoFactorRecoveryCodes.filter((h) => h !== hash) },
        });
        await this.audit.record(null, {
          action: 'TWO_FACTOR_RECOVERY_CODE_USED',
          entityType: 'User',
          entityId: user.id,
          after: { remaining: user.twoFactorRecoveryCodes.length - 1 },
        });
        return;
      }
    }
    throw new UnauthorizedException('Invalid two-factor code');
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

    const delivered = await this.notifications.sendDirectMessage(
      input.phone,
      `${code} is your GRID-X sign-in code. It expires in ${ttl} minutes. Never share it with anyone.`,
    );
    if (!delivered) {
      // No messaging provider configured — development and local testing only.
      // Production sets NOTIFY_WHATSAPP_ENABLED so codes never reach the logs.
      this.logger.warn(
        `WhatsApp/SMS channel is not configured; OTP for ${input.phone} is ${code}`,
      );
    }
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

  // -------------------------------------------------------------------------
  // Password recovery (Section 18)
  // -------------------------------------------------------------------------

  /**
   * Starts a reset.
   *
   * Partners sign in with an OTP, so a forgotten password costs them nothing. An internal user had
   * only a password and no way back from losing it short of someone editing the database.
   *
   * The response is identical whether or not the address is known, so this cannot be used to
   * enumerate staff.
   */
  async requestPasswordReset(
    email: string,
    device: DeviceContext,
  ): Promise<{ sent: true; expiresInMinutes: number }> {
    const ttlMinutes = await this.settings.get('security.passwordResetTokenTtlMinutes');
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, name: true, status: true },
    });

    if (user && user.status !== 'SUSPENDED' && user.email) {
      const { token } = await this.issueResetToken(user.id, ttlMinutes, null, device.ipAddress);
      await this.deliverResetLink(user.email, user.name, token, ttlMinutes);
      await this.audit.record(null, {
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'User',
        entityId: user.id,
        ipAddress: device.ipAddress,
        userAgent: device.userAgent,
      });
    }

    return { sent: true, expiresInMinutes: ttlMinutes };
  }

  /**
   * Issues a reset on someone else's behalf, for a user whose email no longer reaches them.
   *
   * Returns the link so an administrator can pass it on, and optionally a one-time password for
   * when there is no way to send a link at all. Neither is ever stored in the clear.
   */
  async issueAdminPasswordReset(
    actorId: string,
    userId: string,
    returnTemporaryPassword: boolean,
  ): Promise<{
    resetUrl: string | null;
    temporaryPassword: string | null;
    expiresInMinutes: number;
    emailed: boolean;
  }> {
    const ttlMinutes = await this.settings.get('security.passwordResetTokenTtlMinutes');
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (returnTemporaryPassword) {
      // A temporary password and a live link are two ways in, and only one should exist, so any
      // outstanding token is consumed here rather than left usable alongside it.
      const temporaryPassword = this.generateTemporaryPassword();
      const passwordHash = await this.hashPassword(temporaryPassword);
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: userId },
          data: { passwordHash, passwordUpdatedAt: new Date() },
        }),
        this.prisma.passwordResetToken.updateMany({
          where: { userId, consumedAt: null },
          data: { consumedAt: new Date() },
        }),
        this.prisma.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);
      await this.audit.record(null, {
        action: 'PASSWORD_RESET_ISSUED_BY_ADMIN',
        entityType: 'User',
        entityId: userId,
        after: { issuedBy: actorId, method: 'TEMPORARY_PASSWORD' },
      });
      return { resetUrl: null, temporaryPassword, expiresInMinutes: ttlMinutes, emailed: false };
    }

    const { token } = await this.issueResetToken(userId, ttlMinutes, actorId, null);
    const emailed = user.email
      ? await this.deliverResetLink(user.email, user.name, token, ttlMinutes)
      : false;

    await this.audit.record(null, {
      action: 'PASSWORD_RESET_ISSUED_BY_ADMIN',
      entityType: 'User',
      entityId: userId,
      after: { issuedBy: actorId, method: 'LINK', emailed },
    });
    return {
      resetUrl: this.resetUrl(token),
      temporaryPassword: null,
      expiresInMinutes: ttlMinutes,
      emailed,
    };
  }

  /**
   * Completes a reset. The token is single-use, and every existing session is revoked — a reset is
   * the moment when "someone else may be holding a session" is most likely to be true.
   */
  async resetPassword(token: string, newPassword: string): Promise<{ reset: true }> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: AuthService.hashToken(token) },
      include: { user: { select: { id: true, status: true } } },
    });

    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'This reset link is no longer valid. Request a new one and use it while it is fresh.',
      );
    }
    if (record.user.status === 'SUSPENDED') {
      throw new UnauthorizedException('This account is suspended. Ask an administrator.');
    }

    const passwordHash = await this.hashPassword(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          passwordUpdatedAt: new Date(),
          // Someone completing a reset has proved they hold the address they were invited on.
          status: record.user.status === 'INVITED' ? 'ACTIVE' : record.user.status,
        },
      }),
      this.prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.record(null, {
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: record.userId,
    });
    return { reset: true };
  }

  /** A fresh token, with any previous one consumed so only the newest link works. */
  private async issueResetToken(
    userId: string,
    ttlMinutes: number,
    issuedById: string | null,
    requestedIp?: string | null,
  ): Promise<{ token: string }> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({
        where: { userId, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId,
          tokenHash: AuthService.hashToken(token),
          issuedById,
          requestedIp: requestedIp ?? null,
          expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
        },
      }),
    ]);
    return { token };
  }

  private resetUrl(token: string): string {
    const base = (this.config.get<string>('webAppUrl') ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    return `${base}/reset-password?token=${token}`;
  }

  private async deliverResetLink(
    email: string,
    name: string,
    token: string,
    ttlMinutes: number,
  ): Promise<boolean> {
    const url = this.resetUrl(token);
    const delivered = await this.notifications.sendDirectEmail(
      email,
      'Reset your GRID-X password',
      [
        `Hello ${name},`,
        '',
        `Use the link below to set a new GRID-X password. It expires in ${ttlMinutes} minutes and works once.`,
        '',
        url,
        '',
        'If you did not ask for this, ignore this message — your password has not changed.',
      ].join('\n'),
    );
    if (!delivered) {
      // Development only: production configures SMTP, so a link never reaches the logs there.
      this.logger.warn(`Email is not configured; password reset link for ${email} is ${url}`);
    }
    return delivered;
  }

  /** Readable, unambiguous characters, because this gets read out over a phone. */
  private generateTemporaryPassword(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const body = Array.from({ length: 12 }, () => alphabet[randomInt(0, alphabet.length)]).join('');
    return `Gx-${body}`;
  }

  /**
   * Section 19 — a partner switching their own interface language.
   *
   * `User.language` drove the Hindi partner UI and could only be set by an administrator through
   * the user directory, which a partner worker cannot reach. A shop-floor user who needs Hindi had
   * to ask someone at OSWAR to change it for them.
   */
  async setLanguage(userId: string, language: 'EN' | 'HI'): Promise<{ language: 'EN' | 'HI' }> {
    await this.prisma.user.update({ where: { id: userId }, data: { language } });
    return { language };
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

  /**
   * A session that can reach only the two-factor enrolment routes.
   *
   * The user is authenticated — they gave the right password — but until they hold a second factor
   * their role says they must have, the token opens nothing else. No refresh token is issued: the
   * enrolment window is short by design, and completing it produces a full session.
   */
  private async issueEnrolmentSession(
    userId: string,
    device: DeviceContext,
  ): Promise<LoginResponse> {
    const jwtConfig = this.config.get<AppConfig['jwt']>('jwt');
    if (!jwtConfig) throw new Error('JWT configuration missing');

    const accessToken = await this.jwt.signAsync(
      { sub: userId, typ: 'enrol' },
      { secret: jwtConfig.accessSecret, expiresIn: '15m' },
    );
    const user = await this.loadAuthUser(userId);
    await this.audit.record(null, {
      action: 'PASSWORD_LOGIN_TWO_FACTOR_ENROLMENT_REQUIRED',
      entityType: 'User',
      entityId: userId,
      ipAddress: device.ipAddress,
      userAgent: device.userAgent,
    });

    return {
      accessToken,
      expiresIn: 900,
      refreshToken: '',
      user,
      twoFactorEnrolmentRequired: true,
    };
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

}

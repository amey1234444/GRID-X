import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@gridx/db';
import {
  CreateUserInput,
  Paginated,
  PaginationInput,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  RoleCode,
  createCompanySchema,
  updateUserSchema,
} from '@gridx/shared';
import { z } from 'zod';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from '../common/settings.service';
import { AuthService } from '../auth/auth.service';
import { RequestUser } from '../common/request-user';
import { paginate, paginationArgs } from '../common/pagination';
import {
  allowedCompanyIds,
  assertCanWriteToCompany,
  assertCompanyScope,
} from '../common/company-scope';

export interface UserFilters extends PaginationInput {
  roleCode?: string;
  status?: string;
  partnerId?: string;
}

export interface AuditFilters extends PaginationInput {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
}

/** Module 1 and Section 18 — user administration, role catalogue, companies and audit trail. */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
    private readonly auth: AuthService,
  ) {}

  /**
   * Who this actor may see in the user directory. A partner owner administers only their own
   * unit's users; an internal user sees only users who share one of their companies, plus the
   * partner users of partners in those companies (Section 4 and Section 18).
   */
  private userScope(actor: RequestUser): Prisma.UserWhereInput {
    if (actor.partnerId) return { partnerId: actor.partnerId };
    const ids = allowedCompanyIds(actor);
    if (!ids) return {};
    return {
      OR: [
        { companies: { some: { companyId: { in: ids } } } },
        { partner: { companyId: { in: ids } } },
      ],
    };
  }

  /**
   * Guards who an administrator may create or edit. A partner owner may only touch their own
   * unit's users; an internal administrator may only grant companies they hold themselves, so
   * company access cannot be widened by creating an account.
   */
  private async assertMayAdminister(
    actor: RequestUser,
    isPartnerRole: boolean,
    partnerId: string | null | undefined,
    companyIds: string[] | undefined,
  ): Promise<void> {
    if (actor.partnerId) {
      if (!isPartnerRole || partnerId !== actor.partnerId) {
        throw new ForbiddenException('You can only administer users of your own unit');
      }
      return;
    }
    if (partnerId) {
      const partner = await this.prisma.partner.findUniqueOrThrow({
        where: { id: partnerId },
        select: { companyId: true },
      });
      assertCompanyScope(actor, partner.companyId, 'partner');
    }
    for (const companyId of companyIds ?? []) {
      assertCanWriteToCompany(actor, companyId);
    }
  }

  async listUsers(actor: RequestUser, filters: UserFilters): Promise<Paginated<unknown>> {
    const where: Prisma.UserWhereInput = {
      ...this.userScope(actor),
      ...(filters.roleCode ? { role: { code: filters.roleCode as Prisma.EnumRoleCodeFilter } } : {}),
      ...(filters.status ? { status: filters.status as Prisma.EnumUserStatusFilter } : {}),
      ...(filters.partnerId ? { partnerId: filters.partnerId } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
              { phone: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          userType: true,
          status: true,
          designation: true,
          language: true,
          twoFactorEnabled: true,
          lastLoginAt: true,
          role: { select: { id: true, code: true, name: true } },
          partner: { select: { id: true, businessName: true } },
          companies: { select: { companyId: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(data, total, filters);
  }

  async createUser(actor: RequestUser, input: CreateUserInput) {
    if (!input.email && !input.phone) {
      throw new BadRequestException('An email or phone number is required');
    }
    const role = await this.prisma.role.findUniqueOrThrow({ where: { code: input.roleCode } });
    if (role.isPartnerRole && !input.partnerId) {
      throw new BadRequestException('Partner users must be linked to a partner');
    }
    if (!role.isPartnerRole && input.partnerId) {
      throw new BadRequestException('Internal users cannot be linked to a partner');
    }
    await this.assertMayAdminister(actor, role.isPartnerRole, input.partnerId, input.companyIds);

    const user = await this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        roleId: role.id,
        userType: role.isPartnerRole ? 'PARTNER' : 'INTERNAL',
        partnerId: input.partnerId,
        designation: input.designation,
        language: input.language,
        twoFactorEnabled: input.twoFactorEnabled,
        status: input.password ? 'ACTIVE' : 'INVITED',
        passwordHash: input.password
          ? await argon2.hash(input.password, { type: argon2.argon2id })
          : null,
        passwordUpdatedAt: input.password ? new Date() : null,
        companies: {
          create: input.companyIds.map((companyId) => ({ companyId })),
        },
      },
      select: { id: true, name: true, email: true, phone: true, status: true, roleId: true },
    });

    await this.audit.record(actor, {
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      after: { name: user.name, roleCode: input.roleCode, partnerId: input.partnerId },
    });
    return user;
  }

  async updateUser(actor: RequestUser, id: string, input: z.infer<typeof updateUserSchema>) {
    const before = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: { role: true },
    });
    const role = input.roleCode
      ? await this.prisma.role.findUniqueOrThrow({ where: { code: input.roleCode } })
      : null;

    // Checked against who the user is today and who they would become.
    await this.assertMayAdminister(actor, before.role.isPartnerRole, before.partnerId, undefined);
    await this.assertMayAdminister(
      actor,
      (role ?? before.role).isPartnerRole,
      before.partnerId,
      input.companyIds,
    );

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        designation: input.designation,
        language: input.language,
        twoFactorEnabled: input.twoFactorEnabled,
        status: input.status,
        ...(role ? { roleId: role.id, userType: role.isPartnerRole ? 'PARTNER' : 'INTERNAL' } : {}),
      },
      select: { id: true, name: true, status: true, roleId: true },
    });

    if (input.companyIds) {
      await this.prisma.userCompany.deleteMany({ where: { userId: id } });
      await this.prisma.userCompany.createMany({
        data: input.companyIds.map((companyId) => ({ userId: id, companyId })),
      });
    }

    await this.audit.record(actor, {
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: id,
      before: { status: before.status, roleCode: before.role.code, name: before.name },
      after: { status: user.status, roleCode: input.roleCode ?? before.role.code, name: user.name },
    });
    return user;
  }

  /** Users are never deleted — suspension keeps the audit trail intact (Section 18). */
  async suspendUser(actor: RequestUser, id: string, reason: string) {
    const before = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: { role: true },
    });
    await this.assertMayAdminister(actor, before.role.isPartnerRole, before.partnerId, undefined);
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
      select: { id: true, name: true, status: true },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.record(actor, {
      action: 'USER_SUSPENDED',
      entityType: 'User',
      entityId: id,
      after: { reason },
    });
    return user;
  }

  async listRoles() {
    const roles = await this.prisma.role.findMany({ orderBy: { name: 'asc' } });
    return roles.map((role) => ({
      ...role,
      label: ROLE_LABELS[role.code as RoleCode],
      description: role.description ?? ROLE_DESCRIPTIONS[role.code as RoleCode],
      permissions: ROLE_PERMISSIONS[role.code as RoleCode] ?? [],
    }));
  }

  /**
   * Renames a role or rewrites its description.
   *
   * The permission matrix itself stays in code on purpose: RoleCode is a fixed enum, every
   * environment must enforce the same grants, and a matrix editable at runtime is a matrix that can
   * be quietly widened. What an administrator can legitimately change is how the role reads to the
   * people assigning it, which is what this covers.
   */
  async updateRole(
    actor: RequestUser,
    code: string,
    input: { name?: string; description?: string },
  ) {
    const role = await this.prisma.role.findUniqueOrThrow({ where: { code: code as RoleCode } });
    const updated = await this.prisma.role.update({
      where: { id: role.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });
    await this.audit.record(actor, {
      action: 'ROLE_UPDATED',
      entityType: 'Role',
      entityId: role.id,
      before: { name: role.name, description: role.description },
      after: { name: updated.name, description: updated.description },
    });
    return {
      ...updated,
      label: ROLE_LABELS[updated.code as RoleCode],
      permissions: ROLE_PERMISSIONS[updated.code as RoleCode] ?? [],
    };
  }

  async listCompanies(actor: RequestUser) {
    const ids = allowedCompanyIds(actor);
    return this.prisma.company.findMany({
      where: { isActive: true, ...(ids ? { id: { in: ids } } : {}) },
      orderBy: { name: 'asc' },
    });
  }

  async createCompany(actor: RequestUser, input: z.infer<typeof createCompanySchema>) {
    const company = await this.prisma.company.create({ data: input });
    await this.audit.record(actor, {
      action: 'COMPANY_CREATED',
      entityType: 'Company',
      entityId: company.id,
      companyId: company.id,
      after: { code: company.code, name: company.name },
    });
    return company;
  }

  async listAuditLogs(actor: RequestUser, filters: AuditFilters): Promise<Paginated<unknown>> {
    const ids = allowedCompanyIds(actor);
    const where: Prisma.AuditLogWhereInput = {
      // Entries with no company are system-level and stay with the Group Admin.
      ...(ids ? { companyId: { in: ids } } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.action ? { action: { contains: filters.action, mode: 'insensitive' } } : {}),
      ...(filters.search
        ? {
            OR: [
              { action: { contains: filters.search, mode: 'insensitive' } },
              { entityType: { contains: filters.search, mode: 'insensitive' } },
              { actorLabel: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginate(data, total, filters);
  }

  /**
   * Section 7 — the settings catalogue: every setting the platform actually reads, with its
   * effective value. Settings used to be listed straight from the table, which meant the screen
   * showed keys nothing honoured and offered no clue what any of them changed.
   */
  async listSettings() {
    return this.settings.catalogue();
  }

  async upsertSetting(actor: RequestUser, key: string, value: unknown) {
    const before = await this.prisma.systemSetting.findUnique({ where: { key } });
    const setting = await this.settings.set(key, value);
    await this.audit.record(actor, {
      action: 'SETTING_UPDATED',
      entityType: 'SystemSetting',
      entityId: key,
      before: before ? { key, value: before.value as Prisma.InputJsonValue } : undefined,
      after: { key, value: setting.value as Prisma.InputJsonValue },
    });
    return setting;
  }

  /**
   * Section 18 — an administrator putting a locked-out user back in.
   *
   * `updateUser` deliberately never touches the password hash, so before this existed an internal
   * user who forgot their password had no way back: partners have OTP, staff had nothing.
   *
   * Sends a reset link by default. A temporary password is the fallback for a user whose mailbox
   * is the thing they have lost, and it is shown to the administrator exactly once.
   */
  async resetUserPassword(actor: RequestUser, id: string, useTemporaryPassword: boolean) {
    const target = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: { role: true },
    });
    await this.assertMayAdminister(actor, target.role.isPartnerRole, target.partnerId, undefined);

    if (target.role.isPartnerRole && !target.email) {
      throw new BadRequestException(
        `${target.name} signs in with a one-time code sent to their phone, so there is no password to reset.`,
      );
    }

    const result = await this.auth.issueAdminPasswordReset(actor.id, id, useTemporaryPassword);
    return {
      userId: id,
      name: target.name,
      email: target.email,
      ...result,
    };
  }
}

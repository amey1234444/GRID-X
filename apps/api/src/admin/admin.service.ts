import { BadRequestException, Injectable } from '@nestjs/common';
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
import { RequestUser } from '../common/request-user';
import { paginate, paginationArgs } from '../common/pagination';

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
  ) {}

  async listUsers(filters: UserFilters): Promise<Paginated<unknown>> {
    const where: Prisma.UserWhereInput = {
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

  async listCompanies() {
    return this.prisma.company.findMany({
      where: { isActive: true },
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

  async listAuditLogs(filters: AuditFilters): Promise<Paginated<unknown>> {
    const where: Prisma.AuditLogWhereInput = {
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

  async listSettings() {
    return this.prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
  }

  async upsertSetting(actor: RequestUser, key: string, value: Prisma.InputJsonValue) {
    const setting = await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    await this.audit.record(actor, {
      action: 'SETTING_UPDATED',
      entityType: 'SystemSetting',
      entityId: setting.id,
      after: { key, value },
    });
    return setting;
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  PERMISSIONS,
  ROLE_CODES,
  createCompanySchema,
  createUserSchema,
  paginationSchema,
  updateRoleSchema,
  updateUserSchema,
} from '@gridx/shared';
import { Prisma } from '@gridx/db';
import { z } from 'zod';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { zodBody } from '../common/zod-validation.pipe';
import { RequestUser } from '../common/request-user';
import { AdminService } from './admin.service';

const userQuerySchema = paginationSchema.extend({
  roleCode: z.enum(ROLE_CODES).optional(),
  status: z.enum(['INVITED', 'ACTIVE', 'SUSPENDED']).optional(),
  partnerId: z.string().cuid().optional(),
});

const auditQuerySchema = paginationSchema.extend({
  entityType: z.string().trim().optional(),
  entityId: z.string().trim().optional(),
  userId: z.string().cuid().optional(),
  action: z.string().trim().optional(),
});

const suspendUserSchema = z.object({ reason: z.string().trim().min(5) });
const jsonValueSchema: z.ZodType<Prisma.InputJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);
const settingSchema = z.object({ value: jsonValueSchema });

@ApiTags('Administration')
@Controller()
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  @RequirePermissions(PERMISSIONS.USER_READ)
  listUsers(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(userQuerySchema)) query: z.infer<typeof userQuerySchema>,
  ) {
    return this.admin.listUsers(user, query);
  }

  @Post('users')
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  createUser(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(createUserSchema)) body: z.infer<typeof createUserSchema>,
  ) {
    return this.admin.createUser(user, body);
  }

  @Patch('users/:id')
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  updateUser(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(updateUserSchema)) body: z.infer<typeof updateUserSchema>,
  ) {
    return this.admin.updateUser(user, id, body);
  }

  @Post('users/:id/suspend')
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  suspendUser(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(suspendUserSchema)) body: z.infer<typeof suspendUserSchema>,
  ) {
    return this.admin.suspendUser(user, id, body.reason);
  }

  @Get('roles')
  @RequirePermissions(PERMISSIONS.USER_READ)
  listRoles() {
    return this.admin.listRoles();
  }

  @Patch('roles/:code')
  @RequirePermissions(PERMISSIONS.ROLE_MANAGE)
  updateRole(
    @CurrentUser() user: RequestUser,
    @Param('code') code: string,
    @Body(zodBody(updateRoleSchema)) body: z.infer<typeof updateRoleSchema>,
  ) {
    return this.admin.updateRole(user, code, body);
  }

  @Get('companies')
  listCompanies(@CurrentUser() user: RequestUser) {
    return this.admin.listCompanies(user);
  }

  @Post('companies')
  @RequirePermissions(PERMISSIONS.COMPANY_MANAGE)
  createCompany(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(createCompanySchema)) body: z.infer<typeof createCompanySchema>,
  ) {
    return this.admin.createCompany(user, body);
  }

  @Get('audit-logs')
  @RequirePermissions(PERMISSIONS.AUDIT_LOG_READ)
  listAuditLogs(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(auditQuerySchema)) query: z.infer<typeof auditQuerySchema>,
  ) {
    return this.admin.listAuditLogs(user, query);
  }

  @Get('settings')
  @RequirePermissions(PERMISSIONS.SETTING_MANAGE)
  listSettings() {
    return this.admin.listSettings();
  }

  @Patch('settings/:key')
  @RequirePermissions(PERMISSIONS.SETTING_MANAGE)
  upsertSetting(
    @CurrentUser() user: RequestUser,
    @Param('key') key: string,
    @Body(zodBody(settingSchema)) body: z.infer<typeof settingSchema>,
  ) {
    return this.admin.upsertSetting(user, key, body.value);
  }
}

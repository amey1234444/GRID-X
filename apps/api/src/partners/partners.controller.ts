import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  PERMISSIONS,
  changePartnerStatusSchema,
  createPartnerSchema,
  paginationSchema,
  partnerAuditSchema,
  partnerCapabilitySchema,
  partnerDocumentSchema,
  partnerEmployeeSchema,
  partnerMachineSchema,
  suspendPartnerSchema,
  updatePartnerSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { RequestUser } from '../common/request-user';
import { zodBody } from '../common/zod-validation.pipe';
import { PartnersService } from './partners.service';

const listQuerySchema = paginationSchema.extend({
  approvalStatus: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  process: z.string().optional(),
  companyId: z.string().optional(),
});

const machineQuerySchema = paginationSchema.extend({
  partnerId: z.string().optional(),
  search: z.string().optional(),
});

const auditQuerySchema = paginationSchema.extend({
  partnerId: z.string().optional(),
  result: z.string().optional(),
});

@ApiTags('Partners')
@Controller('partners')
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PARTNER_READ)
  list(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(listQuerySchema)) query: z.infer<typeof listQuerySchema>,
  ) {
    return this.partners.list(user, {
      ...query,
      approvalStatus: query.approvalStatus as never,
    });
  }

  /** Section 7 screen 5 — declared before :id so \"capability-matrix\" is not read as a partner id. */
  @Get('capability-matrix')
  @RequirePermissions(PERMISSIONS.PARTNER_READ)
  capabilityMatrix(
    @CurrentUser() user: RequestUser,
    @Query('companyId') companyId?: string,
  ) {
    return this.partners.capabilityMatrix(user, companyId);
  }

  @Get('machines')
  @RequirePermissions(PERMISSIONS.PARTNER_READ)
  listMachines(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(machineQuerySchema)) query: z.infer<typeof machineQuerySchema>,
  ) {
    return this.partners.listMachines(user, query);
  }

  @Get('audits')
  @RequirePermissions(PERMISSIONS.PARTNER_READ)
  listAudits(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(auditQuerySchema)) query: z.infer<typeof auditQuerySchema>,
  ) {
    return this.partners.listAudits(user, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PARTNER_READ)
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.partners.findOne(user, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PARTNER_CREATE)
  create(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(createPartnerSchema)) body: z.infer<typeof createPartnerSchema>,
  ) {
    return this.partners.create(user, body);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PARTNER_UPDATE)
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(updatePartnerSchema)) body: z.infer<typeof updatePartnerSchema>,
  ) {
    return this.partners.update(user, id, body);
  }

  @Post(':id/status')
  @RequirePermissions(PERMISSIONS.PARTNER_APPROVE)
  changeStatus(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(changePartnerStatusSchema)) body: z.infer<typeof changePartnerStatusSchema>,
  ) {
    return this.partners.changeStatus(user, id, body.toStatus, body.reason);
  }

  @Post(':id/suspend')
  @RequirePermissions(PERMISSIONS.PARTNER_SUSPEND)
  suspend(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(suspendPartnerSchema)) body: z.infer<typeof suspendPartnerSchema>,
  ) {
    return this.partners.suspend(user, id, body.reason);
  }

  @Post(':id/capabilities')
  @RequirePermissions(PERMISSIONS.PARTNER_CAPABILITY_MANAGE)
  upsertCapability(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(partnerCapabilitySchema)) body: z.infer<typeof partnerCapabilitySchema>,
  ) {
    return this.partners.upsertCapability(user, id, body);
  }

  @Delete(':id/capabilities/:capabilityId')
  @RequirePermissions(PERMISSIONS.PARTNER_CAPABILITY_MANAGE)
  removeCapability(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('capabilityId') capabilityId: string,
  ) {
    return this.partners.removeCapability(user, id, capabilityId);
  }

  @Post(':id/machines')
  @RequirePermissions(PERMISSIONS.PARTNER_MACHINE_MANAGE)
  addMachine(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(partnerMachineSchema)) body: z.infer<typeof partnerMachineSchema>,
  ) {
    return this.partners.addMachine(user, id, body);
  }

  @Delete('machines/:machineId')
  @RequirePermissions(PERMISSIONS.PARTNER_MACHINE_MANAGE)
  removeMachine(@CurrentUser() user: RequestUser, @Param('machineId') machineId: string) {
    return this.partners.removeMachine(user, machineId);
  }

  @Post(':id/documents')
  @RequirePermissions(PERMISSIONS.PARTNER_DOCUMENT_MANAGE)
  addDocument(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(partnerDocumentSchema)) body: z.infer<typeof partnerDocumentSchema>,
  ) {
    return this.partners.saveDocument(user, id, body);
  }

  @Post('documents/:documentId/verify')
  @RequirePermissions(PERMISSIONS.PARTNER_DOCUMENT_MANAGE)
  verifyDocument(@CurrentUser() user: RequestUser, @Param('documentId') documentId: string) {
    return this.partners.verifyDocument(user, documentId);
  }

  @Post(':id/employees')
  @RequirePermissions(PERMISSIONS.PARTNER_READ)
  addEmployee(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(partnerEmployeeSchema)) body: z.infer<typeof partnerEmployeeSchema>,
  ) {
    return this.partners.addEmployee(user, id, body);
  }

  @Delete('employees/:employeeId')
  @RequirePermissions(PERMISSIONS.PARTNER_READ)
  removeEmployee(@CurrentUser() user: RequestUser, @Param('employeeId') employeeId: string) {
    return this.partners.removeEmployee(user, employeeId);
  }

  @Post(':id/audits')
  @RequirePermissions(PERMISSIONS.PARTNER_AUDIT)
  recordAudit(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(partnerAuditSchema)) body: z.infer<typeof partnerAuditSchema>,
  ) {
    return this.partners.recordAudit(user, id, body);
  }
}

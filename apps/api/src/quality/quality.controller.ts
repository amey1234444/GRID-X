import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  PERMISSIONS,
  advanceCorrectiveActionSchema,
  assignInspectionSchema,
  completeInspectionSchema,
  createCorrectiveActionSchema,
  createInspectionPlanSchema,
  createReworkSchema,
  decideDeviationSchema,
  paginationSchema,
  requestInspectionSchema,
  saveInspectionResultsSchema,
  updateReworkStatusSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { zodBody } from '../common/zod-validation.pipe';
import { RequestUser } from '../common/request-user';
import { QualityService } from './quality.service';

const inspectionQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  type: z.string().optional(),
  jobId: z.string().optional(),
  partnerId: z.string().optional(),
  inspectorId: z.string().optional(),
});

const ncQuerySchema = paginationSchema.extend({ jobId: z.string().optional() });
const reworkQuerySchema = paginationSchema.extend({ status: z.string().optional() });

@ApiTags('Quality')
@Controller('quality')
export class QualityController {
  constructor(private readonly quality: QualityService) {}

  @Get('plans')
  @RequirePermissions(PERMISSIONS.INSPECTION_READ)
  listPlans(@Query('componentId') componentId?: string) {
    return this.quality.listPlans(componentId);
  }

  @Post('plans')
  @RequirePermissions(PERMISSIONS.INSPECTION_PLAN_MANAGE)
  createPlan(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(createInspectionPlanSchema)) body: z.infer<typeof createInspectionPlanSchema>,
  ) {
    return this.quality.createPlan(user, body);
  }

  @Get('inspections')
  @RequirePermissions(PERMISSIONS.INSPECTION_READ)
  list(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(inspectionQuerySchema)) query: z.infer<typeof inspectionQuerySchema>,
  ) {
    return this.quality.list(user, query);
  }

  @Get('inspections/:id')
  @RequirePermissions(PERMISSIONS.INSPECTION_READ)
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.quality.findOne(user, id);
  }

  @Post('inspections')
  @RequirePermissions(PERMISSIONS.INSPECTION_REQUEST)
  request(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(requestInspectionSchema)) body: z.infer<typeof requestInspectionSchema>,
  ) {
    return this.quality.request(user, body);
  }

  @Post('inspections/:id/assign')
  @RequirePermissions(PERMISSIONS.INSPECTION_PLAN_MANAGE)
  assign(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(assignInspectionSchema)) body: z.infer<typeof assignInspectionSchema>,
  ) {
    return this.quality.assign(user, id, body);
  }

  @Post('inspections/:id/start')
  @RequirePermissions(PERMISSIONS.INSPECTION_PERFORM)
  start(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.quality.start(user, id);
  }

  @Post('inspections/:id/results')
  @RequirePermissions(PERMISSIONS.INSPECTION_PERFORM)
  saveResults(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(saveInspectionResultsSchema)) body: z.infer<typeof saveInspectionResultsSchema>,
  ) {
    return this.quality.saveResults(user, id, body);
  }

  @Post('inspections/:id/complete')
  @RequirePermissions(PERMISSIONS.INSPECTION_PERFORM)
  complete(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(completeInspectionSchema)) body: z.infer<typeof completeInspectionSchema>,
  ) {
    return this.quality.complete(user, id, body);
  }

  @Get('non-conformances')
  @RequirePermissions(PERMISSIONS.INSPECTION_READ)
  listNonConformances(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(ncQuerySchema)) query: z.infer<typeof ncQuerySchema>,
  ) {
    return this.quality.listNonConformances(user, query);
  }

  @Get('rework')
  @RequirePermissions(PERMISSIONS.INSPECTION_READ)
  listRework(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(reworkQuerySchema)) query: z.infer<typeof reworkQuerySchema>,
  ) {
    return this.quality.listRework(user, query);
  }

  @Post('rework')
  @RequirePermissions(PERMISSIONS.REWORK_MANAGE)
  createRework(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(createReworkSchema)) body: z.infer<typeof createReworkSchema>,
  ) {
    return this.quality.createRework(user, body);
  }

  @Patch('rework/:id')
  @RequirePermissions(PERMISSIONS.REWORK_MANAGE)
  updateRework(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(updateReworkStatusSchema)) body: z.infer<typeof updateReworkStatusSchema>,
  ) {
    return this.quality.updateReworkStatus(user, id, body);
  }

  @Post('corrective-actions')
  @RequirePermissions(PERMISSIONS.CORRECTIVE_ACTION_MANAGE)
  createCorrectiveAction(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(createCorrectiveActionSchema)) body: z.infer<typeof createCorrectiveActionSchema>,
  ) {
    return this.quality.createCorrectiveAction(user, body);
  }

  @Patch('corrective-actions/:id')
  @RequirePermissions(PERMISSIONS.CORRECTIVE_ACTION_MANAGE)
  advanceCorrectiveAction(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(advanceCorrectiveActionSchema))
    body: z.infer<typeof advanceCorrectiveActionSchema>,
  ) {
    return this.quality.advanceCorrectiveAction(user, id, body);
  }

  @Patch('deviations/:id')
  @RequirePermissions(PERMISSIONS.CORRECTIVE_ACTION_MANAGE)
  decideDeviation(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(decideDeviationSchema)) body: z.infer<typeof decideDeviationSchema>,
  ) {
    return this.quality.decideDeviation(user, id, body);
  }
}

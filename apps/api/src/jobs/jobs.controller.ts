import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  PERMISSIONS,
  allocateJobSchema,
  answerClarificationSchema,
  clarificationSchema,
  closeJobSchema,
  createJobSchema,
  paginationSchema,
  reportDelaySchema,
  respondToJobSchema,
  updateJobSchema,
  updateMilestoneSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { RequestUser } from '../common/request-user';
import { zodBody } from '../common/zod-validation.pipe';
import { JobsService } from './jobs.service';

const jobQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  partnerId: z.string().optional(),
  componentId: z.string().optional(),
  priority: z.string().optional(),
  companyId: z.string().optional(),
  overdue: z.coerce.boolean().optional(),
});

const cancelSchema = z.object({ reason: z.string().min(5) });

const delayQuerySchema = paginationSchema.extend({
  companyId: z.string().optional(),
  partnerId: z.string().optional(),
  reason: z.string().optional(),
  responsibility: z.string().optional(),
  openOnly: z.coerce.boolean().optional(),
});

const clarificationQuerySchema = paginationSchema.extend({
  companyId: z.string().optional(),
  partnerId: z.string().optional(),
  status: z.string().optional(),
});

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.JOB_READ)
  list(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(jobQuerySchema)) query: z.infer<typeof jobQuerySchema>,
  ) {
    return this.jobs.list(user, { ...query, status: query.status as never });
  }

  /**
   * Section 12's \"get delayed jobs\". Declared before :id so the router does not read \"delays\"
   * as a job identifier.
   */
  @Get('delays')
  @RequirePermissions(PERMISSIONS.JOB_READ)
  listDelays(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(delayQuerySchema)) query: z.infer<typeof delayQuerySchema>,
  ) {
    return this.jobs.listDelays(user, {
      ...query,
      reason: query.reason as never,
      responsibility: query.responsibility as never,
    });
  }

  @Post('delays/:delayId/resolve')
  @RequirePermissions(PERMISSIONS.JOB_UPDATE)
  resolveDelay(@CurrentUser() user: RequestUser, @Param('delayId') delayId: string) {
    return this.jobs.resolveDelay(user, delayId);
  }

  @Get('clarifications')
  @RequirePermissions(PERMISSIONS.JOB_READ)
  listClarifications(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(clarificationQuerySchema)) query: z.infer<typeof clarificationQuerySchema>,
  ) {
    return this.jobs.listClarifications(user, { ...query, status: query.status as never });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.JOB_READ)
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.jobs.findOne(user, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.JOB_CREATE)
  create(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(createJobSchema)) body: z.infer<typeof createJobSchema>,
  ) {
    return this.jobs.create(user, body);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.JOB_UPDATE)
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(updateJobSchema)) body: z.infer<typeof updateJobSchema>,
  ) {
    return this.jobs.update(user, id, body);
  }

  @Get(':id/recommendations')
  @RequirePermissions(PERMISSIONS.JOB_ALLOCATE)
  recommendations(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.jobs.recommendations(id, user);
  }

  @Post(':id/allocate')
  @RequirePermissions(PERMISSIONS.JOB_ALLOCATE)
  allocate(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(allocateJobSchema)) body: z.infer<typeof allocateJobSchema>,
  ) {
    return this.jobs.allocate(user, id, body);
  }

  @Post(':id/respond')
  @RequirePermissions(PERMISSIONS.JOB_RESPOND)
  respond(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(respondToJobSchema)) body: z.infer<typeof respondToJobSchema>,
  ) {
    return this.jobs.respond(user, id, body);
  }

  @Post(':id/milestones')
  @RequirePermissions(PERMISSIONS.JOB_MILESTONE_UPDATE)
  milestone(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(updateMilestoneSchema)) body: z.infer<typeof updateMilestoneSchema>,
  ) {
    return this.jobs.updateMilestone(user, id, body);
  }

  @Post(':id/delays')
  @RequirePermissions(PERMISSIONS.JOB_MILESTONE_UPDATE)
  delay(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(reportDelaySchema)) body: z.infer<typeof reportDelaySchema>,
  ) {
    return this.jobs.reportDelay(user, id, body);
  }

  @Post(':id/clarifications')
  @RequirePermissions(PERMISSIONS.JOB_CLARIFICATION_RAISE)
  clarify(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(clarificationSchema)) body: z.infer<typeof clarificationSchema>,
  ) {
    return this.jobs.raiseClarification(user, id, body);
  }

  @Post('clarifications/:clarificationId/answer')
  @RequirePermissions(PERMISSIONS.JOB_CLARIFICATION_ANSWER)
  answer(
    @CurrentUser() user: RequestUser,
    @Param('clarificationId') clarificationId: string,
    @Body(zodBody(answerClarificationSchema)) body: z.infer<typeof answerClarificationSchema>,
  ) {
    return this.jobs.answerClarification(user, clarificationId, body);
  }

  @Post(':id/close')
  @RequirePermissions(PERMISSIONS.JOB_CLOSE)
  close(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(closeJobSchema)) body: z.infer<typeof closeJobSchema>,
  ) {
    return this.jobs.close(user, id, body);
  }

  @Post(':id/cancel')
  @RequirePermissions(PERMISSIONS.JOB_UPDATE)
  cancel(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(cancelSchema)) body: z.infer<typeof cancelSchema>,
  ) {
    return this.jobs.cancel(user, id, body.reason);
  }
}

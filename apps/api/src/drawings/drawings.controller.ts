import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  PERMISSIONS,
  acknowledgeRevisionSchema,
  createDrawingSchema,
  createRevisionSchema,
  engineeringChangeSchema,
  grantDrawingAccessSchema,
  paginationSchema,
  releaseRevisionSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { AuthedRequest, RequestUser } from '../common/request-user';
import { zodBody } from '../common/zod-validation.pipe';
import { DrawingsService } from './drawings.service';

const drawingQuerySchema = paginationSchema.extend({
  componentId: z.string().optional(),
  status: z.string().optional(),
});

const obsoleteSchema = z.object({ reason: z.string().min(5) });
const ecDecisionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'IMPLEMENTED']),
  note: z.string().optional(),
});

@ApiTags('Drawings')
@Controller('drawings')
export class DrawingsController {
  constructor(private readonly drawings: DrawingsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.DRAWING_READ)
  list(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(drawingQuerySchema)) query: z.infer<typeof drawingQuerySchema>,
  ) {
    return this.drawings.list(user, query);
  }

  @Get('engineering-changes')
  @RequirePermissions(PERMISSIONS.DRAWING_READ)
  listChanges(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(paginationSchema)) query: z.infer<typeof paginationSchema>,
  ) {
    return this.drawings.listEngineeringChanges(user, query);
  }

  @Post('engineering-changes')
  @RequirePermissions(PERMISSIONS.DRAWING_MANAGE)
  createChange(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(engineeringChangeSchema)) body: z.infer<typeof engineeringChangeSchema>,
  ) {
    return this.drawings.createEngineeringChange(user, body);
  }

  @Post('engineering-changes/:id/decision')
  @RequirePermissions(PERMISSIONS.DRAWING_APPROVE)
  decideChange(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(ecDecisionSchema)) body: z.infer<typeof ecDecisionSchema>,
  ) {
    return this.drawings.decideEngineeringChange(user, id, body.status, body.note);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.DRAWING_READ)
  getDrawing(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.drawings.getDrawing(user, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.DRAWING_MANAGE)
  createDrawing(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(createDrawingSchema)) body: z.infer<typeof createDrawingSchema>,
  ) {
    return this.drawings.createDrawing(user, body);
  }

  @Post(':id/revisions')
  @RequirePermissions(PERMISSIONS.DRAWING_MANAGE)
  createRevision(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(createRevisionSchema)) body: z.infer<typeof createRevisionSchema>,
  ) {
    return this.drawings.createRevision(user, id, body);
  }

  @Post('revisions/:revisionId/submit')
  @RequirePermissions(PERMISSIONS.DRAWING_MANAGE)
  submitRevision(@CurrentUser() user: RequestUser, @Param('revisionId') revisionId: string) {
    return this.drawings.submitRevisionForReview(user, revisionId);
  }

  @Post('revisions/:revisionId/approve')
  @RequirePermissions(PERMISSIONS.DRAWING_APPROVE)
  approveRevision(@CurrentUser() user: RequestUser, @Param('revisionId') revisionId: string) {
    return this.drawings.approveRevision(user, revisionId);
  }

  @Post('revisions/:revisionId/release')
  @RequirePermissions(PERMISSIONS.DRAWING_RELEASE)
  releaseRevision(
    @CurrentUser() user: RequestUser,
    @Param('revisionId') revisionId: string,
    @Body(zodBody(releaseRevisionSchema)) body: z.infer<typeof releaseRevisionSchema>,
  ) {
    return this.drawings.releaseRevision(user, revisionId, body);
  }

  @Post('revisions/:revisionId/obsolete')
  @RequirePermissions(PERMISSIONS.DRAWING_RELEASE)
  obsoleteRevision(
    @CurrentUser() user: RequestUser,
    @Param('revisionId') revisionId: string,
    @Body(zodBody(obsoleteSchema)) body: z.infer<typeof obsoleteSchema>,
  ) {
    return this.drawings.obsoleteRevision(user, revisionId, body.reason);
  }

  @Post('revisions/:revisionId/access')
  @RequirePermissions(PERMISSIONS.DRAWING_ACCESS_MANAGE)
  grantAccess(
    @CurrentUser() user: RequestUser,
    @Param('revisionId') revisionId: string,
    @Body(zodBody(grantDrawingAccessSchema)) body: z.infer<typeof grantDrawingAccessSchema>,
  ) {
    return this.drawings.grantAccess(user, revisionId, body);
  }

  @Post('access/:accessId/revoke')
  @RequirePermissions(PERMISSIONS.DRAWING_ACCESS_MANAGE)
  revokeAccess(@CurrentUser() user: RequestUser, @Param('accessId') accessId: string) {
    return this.drawings.revokeAccess(user, accessId);
  }

  @Get('revisions/:revisionId/view')
  @RequirePermissions(PERMISSIONS.DRAWING_READ)
  viewRevision(
    @CurrentUser() user: RequestUser,
    @Param('revisionId') revisionId: string,
    @Req() request: AuthedRequest,
    @Query('action') action?: string,
  ) {
    const resolved = action === 'DOWNLOAD' ? 'DOWNLOADED' : 'VIEWED';
    return this.drawings.viewRevision(user, revisionId, resolved, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  @Post('revisions/:revisionId/acknowledge')
  @RequirePermissions(PERMISSIONS.DRAWING_ACKNOWLEDGE)
  acknowledge(
    @CurrentUser() user: RequestUser,
    @Param('revisionId') revisionId: string,
    @Body(zodBody(acknowledgeRevisionSchema)) body: z.infer<typeof acknowledgeRevisionSchema>,
  ) {
    return this.drawings.acknowledge(user, revisionId, body);
  }

  @Get('revisions/:revisionId/access-log')
  @RequirePermissions(PERMISSIONS.DRAWING_AUDIT_READ)
  accessLog(@CurrentUser() user: RequestUser, @Param('revisionId') revisionId: string) {
    return this.drawings.accessLog(user, revisionId);
  }
}

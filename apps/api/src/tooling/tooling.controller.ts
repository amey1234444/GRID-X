import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  PERMISSIONS,
  calibrationSchema,
  createToolSchema,
  issueToolSchema,
  paginationSchema,
  returnToolSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { zodBody } from '../common/zod-validation.pipe';
import { RequestUser } from '../common/request-user';
import { ToolingService } from './tooling.service';

const toolQuerySchema = paginationSchema.extend({
  category: z.string().optional(),
  partnerId: z.string().optional(),
  calibrationDue: z.coerce.boolean().optional(),
});

@ApiTags('Tooling')
@Controller('tooling')
export class ToolingController {
  constructor(private readonly tooling: ToolingService) {}

  @Get('tools')
  @RequirePermissions(PERMISSIONS.TOOL_READ)
  list(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(toolQuerySchema)) query: z.infer<typeof toolQuerySchema>,
  ) {
    return this.tooling.list(user, query);
  }

  @Post('tools')
  @RequirePermissions(PERMISSIONS.TOOL_MANAGE)
  create(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(createToolSchema)) body: z.infer<typeof createToolSchema>,
  ) {
    return this.tooling.create(user, body);
  }

  @Post('tools/:id/issue')
  @RequirePermissions(PERMISSIONS.TOOL_MANAGE)
  issue(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(issueToolSchema)) body: z.infer<typeof issueToolSchema>,
  ) {
    return this.tooling.issue(user, id, body);
  }

  @Post('issues/:id/return')
  @RequirePermissions(PERMISSIONS.TOOL_MANAGE)
  returnTool(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(returnToolSchema)) body: z.infer<typeof returnToolSchema>,
  ) {
    return this.tooling.returnTool(user, id, body);
  }

  @Post('tools/:id/calibrations')
  @RequirePermissions(PERMISSIONS.TOOL_MANAGE)
  calibrate(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(calibrationSchema)) body: z.infer<typeof calibrationSchema>,
  ) {
    return this.tooling.recordCalibration(user, id, body);
  }
}

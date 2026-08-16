import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gridx/shared';
import { z } from 'zod';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { zodBody } from '../common/zod-validation.pipe';
import { RequestUser } from '../common/request-user';
import {
  IMS_INBOUND_ENTITIES,
  IMS_OUTBOUND_ENTITIES,
  ImsService,
} from './ims.service';

const pullSchema = z.object({
  entity: z.enum(IMS_INBOUND_ENTITIES),
  records: z.array(z.unknown()).optional(),
});

const pushSchema = z.object({
  entity: z.enum(IMS_OUTBOUND_ENTITIES),
  recordRef: z.string().cuid(),
});

const logQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

@ApiTags('IMS integration')
@Controller('ims')
export class ImsController {
  constructor(private readonly ims: ImsService) {}

  @Get('status')
  @RequirePermissions(PERMISSIONS.IMS_SYNC)
  status() {
    return this.ims.status();
  }

  @Get('entities')
  @RequirePermissions(PERMISSIONS.IMS_SYNC)
  entities() {
    return { inbound: IMS_INBOUND_ENTITIES, outbound: IMS_OUTBOUND_ENTITIES };
  }

  @Get('logs')
  @RequirePermissions(PERMISSIONS.IMS_SYNC)
  logs(@Query(zodBody(logQuerySchema)) query: z.infer<typeof logQuerySchema>) {
    return this.ims.listLogs(query.limit);
  }

  @Post('pull')
  @RequirePermissions(PERMISSIONS.IMS_SYNC)
  pull(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(pullSchema)) body: z.infer<typeof pullSchema>,
  ) {
    return this.ims.pull(user, body.entity, body.records);
  }

  @Post('push')
  @RequirePermissions(PERMISSIONS.IMS_SYNC)
  push(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(pushSchema)) body: z.infer<typeof pushSchema>,
  ) {
    return this.ims.push(user, body.entity, body.recordRef);
  }
}

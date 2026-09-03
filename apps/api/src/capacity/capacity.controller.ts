import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PERMISSIONS, PROCESS_TYPES, capacityDeclarationSchema } from '@gridx/shared';
import { z } from 'zod';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { zodBody } from '../common/zod-validation.pipe';
import { RequestUser } from '../common/request-user';
import { CapacityService } from './capacity.service';

const windowSchema = z.object({
  from: z.coerce.date().default(() => new Date()),
  to: z.coerce
    .date()
    .default(() => new Date(Date.now() + 1000 * 60 * 60 * 24 * 56)),
  partnerId: z.string().optional(),
  processCode: z.enum(PROCESS_TYPES).optional(),
  /** Module 5 management output — capacity by location. */
  city: z.string().trim().optional(),
});

@ApiTags('Capacity')
@Controller('capacity')
export class CapacityController {
  constructor(private readonly capacity: CapacityService) {}

  @Get('declarations')
  @RequirePermissions(PERMISSIONS.CAPACITY_READ)
  declarations(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(windowSchema)) query: z.infer<typeof windowSchema>,
  ) {
    return this.capacity.declarations(user, query);
  }

  @Post('declarations')
  @RequirePermissions(PERMISSIONS.CAPACITY_DECLARE)
  declare(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(capacityDeclarationSchema)) body: z.infer<typeof capacityDeclarationSchema>,
  ) {
    return this.capacity.declare(user, body);
  }

  /**
   * Module 5 — the management view: network totals, capacity by process and by location, and who
   * is overloaded or idle. The heatmap answers this one row at a time; this answers it as a whole.
   */
  @Get('summary')
  @RequirePermissions(PERMISSIONS.CAPACITY_READ)
  summary(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(windowSchema)) query: z.infer<typeof windowSchema>,
  ) {
    return this.capacity.networkSummary(user, query);
  }

  @Get('heatmap')
  @RequirePermissions(PERMISSIONS.CAPACITY_READ)
  heatmap(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(windowSchema)) query: z.infer<typeof windowSchema>,
  ) {
    return this.capacity.heatmap(user, query);
  }
}

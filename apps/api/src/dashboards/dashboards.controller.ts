import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gridx/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { RequestUser } from '../common/request-user';
import { DashboardsService } from './dashboards.service';

@ApiTags('Dashboards')
@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboards: DashboardsService) {}

  @Get('management')
  @RequirePermissions(PERMISSIONS.DASHBOARD_MANAGEMENT)
  management(@CurrentUser() user: RequestUser) {
    return this.dashboards.management(user);
  }

  @Get('operations')
  @RequirePermissions(PERMISSIONS.DASHBOARD_OPERATIONS)
  operations(@CurrentUser() user: RequestUser) {
    return this.dashboards.operations(user);
  }

  @Get('quality')
  @RequirePermissions(PERMISSIONS.DASHBOARD_QUALITY)
  quality(@CurrentUser() user: RequestUser) {
    return this.dashboards.quality(user);
  }

  @Get('finance')
  @RequirePermissions(PERMISSIONS.DASHBOARD_FINANCE)
  finance(@CurrentUser() user: RequestUser) {
    return this.dashboards.finance(user);
  }

  @Get('partner')
  @RequirePermissions(PERMISSIONS.DASHBOARD_PARTNER)
  partner(@CurrentUser() user: RequestUser, @Query('partnerId') partnerId?: string) {
    return this.dashboards.partner(user, partnerId);
  }
}

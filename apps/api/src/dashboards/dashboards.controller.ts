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
  management() {
    return this.dashboards.management();
  }

  @Get('operations')
  @RequirePermissions(PERMISSIONS.DASHBOARD_OPERATIONS)
  operations() {
    return this.dashboards.operations();
  }

  @Get('quality')
  @RequirePermissions(PERMISSIONS.DASHBOARD_QUALITY)
  quality() {
    return this.dashboards.quality();
  }

  @Get('finance')
  @RequirePermissions(PERMISSIONS.DASHBOARD_FINANCE)
  finance() {
    return this.dashboards.finance();
  }

  @Get('partner')
  @RequirePermissions(PERMISSIONS.DASHBOARD_PARTNER)
  partner(@CurrentUser() user: RequestUser, @Query('partnerId') partnerId?: string) {
    return this.dashboards.partner(user, partnerId);
  }
}

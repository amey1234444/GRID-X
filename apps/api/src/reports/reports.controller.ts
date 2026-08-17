import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gridx/shared';
import { z } from 'zod';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { zodBody } from '../common/zod-validation.pipe';
import { RequestUser } from '../common/request-user';
import { ReportsService } from './reports.service';

const reportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  partnerId: z.string().cuid().optional(),
  componentId: z.string().cuid().optional(),
});

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.REPORT_READ)
  catalogue() {
    return this.reports.catalogue();
  }

  @Get(':key')
  @RequirePermissions(PERMISSIONS.REPORT_READ)
  run(
    @CurrentUser() user: RequestUser,
    @Param('key') key: string,
    @Query(zodBody(reportQuerySchema)) query: z.infer<typeof reportQuerySchema>,
  ) {
    return this.reports.run(user, key, query);
  }

  @Get(':key/export')
  @RequirePermissions(PERMISSIONS.REPORT_READ)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async export(
    @CurrentUser() user: RequestUser,
    @Param('key') key: string,
    @Query(zodBody(reportQuerySchema)) query: z.infer<typeof reportQuerySchema>,
  ): Promise<string> {
    const result = await this.reports.run(user, key, query);
    return this.reports.toCsv(result);
  }
}

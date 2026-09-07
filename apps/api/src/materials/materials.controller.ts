import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  PERMISSIONS,
  acknowledgeMaterialSchema,
  completeReconciliationSchema,
  createMaterialIssueSchema,
  materialTransactionQuerySchema,
  paginationSchema,
  recordMaterialTransactionSchema,
  recordScrapSchema,
  updateConsumptionSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { zodBody } from '../common/zod-validation.pipe';
import { RequestUser } from '../common/request-user';
import { MaterialsService } from './materials.service';

const issueQuerySchema = paginationSchema.extend({
  jobId: z.string().optional(),
  partnerId: z.string().optional(),
  status: z.string().optional(),
});

const scrapQuerySchema = paginationSchema.extend({
  partnerId: z.string().optional(),
  jobId: z.string().optional(),
});

@ApiTags('Materials')
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materials: MaterialsService) {}

  /**
   * Module 6 step 2 — what the job's bill of material says stores should issue. The issue form is
   * prefilled from this instead of being typed from scratch.
   */
  @Get('jobs/:jobId/requirement')
  @RequirePermissions(PERMISSIONS.MATERIAL_READ)
  requirement(@CurrentUser() user: RequestUser, @Param('jobId') jobId: string) {
    return this.materials.requirementFor(user, jobId);
  }

  /** Module 6 — the material transaction ledger. */
  @Get('transactions')
  @RequirePermissions(PERMISSIONS.MATERIAL_READ)
  listTransactions(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(materialTransactionQuerySchema))
    query: z.infer<typeof materialTransactionQuerySchema>,
  ) {
    return this.materials.listTransactions(user, query);
  }

  /**
   * Records a movement the documented flows do not produce: rejected material going back,
   * replacement material coming out, unused material returned, shortage or excess found.
   */
  @Post('transactions')
  @RequirePermissions(PERMISSIONS.MATERIAL_TRANSACTION_RECORD)
  recordTransaction(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(recordMaterialTransactionSchema))
    body: z.infer<typeof recordMaterialTransactionSchema>,
  ) {
    return this.materials.recordTransaction(user, body);
  }

  @Get('issues')
  @RequirePermissions(PERMISSIONS.MATERIAL_READ)
  list(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(issueQuerySchema)) query: z.infer<typeof issueQuerySchema>,
  ) {
    return this.materials.list(user, query);
  }

  @Get('partner-stock')
  @RequirePermissions(PERMISSIONS.MATERIAL_READ)
  partnerStock(
    @CurrentUser() user: RequestUser,
    @Query('partnerId') partnerId?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.materials.partnerStock(user, { partnerId, companyId });
  }

  @Get('scrap')
  @RequirePermissions(PERMISSIONS.MATERIAL_READ)
  listScrap(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(scrapQuerySchema)) query: z.infer<typeof scrapQuerySchema>,
  ) {
    return this.materials.listScrap(user, query);
  }

  @Get('issues/:id')
  @RequirePermissions(PERMISSIONS.MATERIAL_READ)
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.materials.findOne(user, id);
  }

  @Post('issues')
  @RequirePermissions(PERMISSIONS.MATERIAL_ISSUE)
  create(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(createMaterialIssueSchema)) body: z.infer<typeof createMaterialIssueSchema>,
  ) {
    return this.materials.create(user, body);
  }

  @Post('issues/:id/acknowledge')
  @RequirePermissions(PERMISSIONS.MATERIAL_ACKNOWLEDGE)
  acknowledge(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(acknowledgeMaterialSchema)) body: z.infer<typeof acknowledgeMaterialSchema>,
  ) {
    return this.materials.acknowledge(user, id, body);
  }

  @Post('jobs/:jobId/consumption')
  @RequirePermissions(PERMISSIONS.MATERIAL_CONSUMPTION_UPDATE)
  consumption(
    @CurrentUser() user: RequestUser,
    @Param('jobId') jobId: string,
    @Body(zodBody(updateConsumptionSchema)) body: z.infer<typeof updateConsumptionSchema>,
  ) {
    return this.materials.recordConsumption(user, jobId, body);
  }

  @Post('jobs/:jobId/scrap')
  @RequirePermissions(PERMISSIONS.MATERIAL_CONSUMPTION_UPDATE)
  scrap(
    @CurrentUser() user: RequestUser,
    @Param('jobId') jobId: string,
    @Body(zodBody(recordScrapSchema)) body: z.infer<typeof recordScrapSchema>,
  ) {
    return this.materials.recordScrap(user, jobId, body);
  }

  @Post('jobs/:jobId/reconcile')
  @RequirePermissions(PERMISSIONS.MATERIAL_RECONCILE)
  reconcile(
    @CurrentUser() user: RequestUser,
    @Param('jobId') jobId: string,
    @Body(zodBody(completeReconciliationSchema)) body: z.infer<typeof completeReconciliationSchema>,
  ) {
    return this.materials.reconcile(user, jobId, body);
  }

  @Get('jobs/:jobId/reconciliation')
  @RequirePermissions(PERMISSIONS.MATERIAL_READ)
  reconciliation(@CurrentUser() user: RequestUser, @Param('jobId') jobId: string) {
    return this.materials.reconciliationSummary(user, jobId);
  }
}

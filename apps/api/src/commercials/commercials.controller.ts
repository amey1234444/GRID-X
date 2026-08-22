import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  PERMISSIONS,
  createRateSchema,
  deductionSchema,
  holdInvoiceSchema,
  incentiveRuleSchema,
  invoiceActionSchema,
  paginationSchema,
  recordPaymentSchema,
  scheduleInvoiceSchema,
  submitInvoiceSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { zodBody } from '../common/zod-validation.pipe';
import { RequestUser } from '../common/request-user';
import { CommercialsService } from './commercials.service';

const invoiceQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  partnerId: z.string().optional(),
});

const submitInvoiceBodySchema = submitInvoiceSchema.extend({ partnerId: z.string().optional() });

const approvalQuerySchema = paginationSchema.extend({
  stage: z.string().optional(),
  partnerId: z.string().optional(),
  approved: z.coerce.boolean().optional(),
});

@ApiTags('Commercials')
@Controller('commercials')
export class CommercialsController {
  constructor(private readonly commercials: CommercialsService) {}

  @Get('rates')
  @RequirePermissions(PERMISSIONS.RATE_READ)
  listRates(
    @CurrentUser() user: RequestUser,
    @Query('partnerId') partnerId?: string,
    @Query('componentId') componentId?: string,
  ) {
    return this.commercials.listRates(user, partnerId, componentId);
  }

  @Post('rates')
  @RequirePermissions(PERMISSIONS.RATE_MANAGE)
  createRate(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(createRateSchema)) body: z.infer<typeof createRateSchema>,
  ) {
    return this.commercials.createRate(user, body);
  }

  @Get('invoices')
  @RequirePermissions(PERMISSIONS.INVOICE_READ)
  listInvoices(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(invoiceQuerySchema)) query: z.infer<typeof invoiceQuerySchema>,
  ) {
    return this.commercials.listInvoices(user, query);
  }

  @Get('invoices/invoiceable-jobs')
  @RequirePermissions(PERMISSIONS.INVOICE_READ)
  invoiceableJobs(@CurrentUser() user: RequestUser, @Query('partnerId') partnerId?: string) {
    return this.commercials.invoiceableJobs(user, partnerId);
  }

  @Get('invoices/:id')
  @RequirePermissions(PERMISSIONS.INVOICE_READ)
  findInvoice(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.commercials.findInvoice(user, id);
  }

  @Post('invoices')
  @RequirePermissions(PERMISSIONS.INVOICE_SUBMIT)
  submitInvoice(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(submitInvoiceBodySchema)) body: z.infer<typeof submitInvoiceBodySchema>,
  ) {
    return this.commercials.submitInvoice(user, body, body.partnerId);
  }

  @Post('invoices/:id/verify-quantity')
  @RequirePermissions(PERMISSIONS.INVOICE_VERIFY_QUANTITY)
  verifyQuantity(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(invoiceActionSchema)) body: z.infer<typeof invoiceActionSchema>,
  ) {
    return this.commercials.approveStage(user, id, 'QUANTITY', body);
  }

  @Post('invoices/:id/verify-quality')
  @RequirePermissions(PERMISSIONS.INVOICE_VERIFY_QUALITY)
  verifyQuality(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(invoiceActionSchema)) body: z.infer<typeof invoiceActionSchema>,
  ) {
    return this.commercials.approveStage(user, id, 'QUALITY', body);
  }

  @Post('invoices/:id/verify-material')
  @RequirePermissions(PERMISSIONS.INVOICE_VERIFY_QUANTITY)
  verifyMaterial(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(invoiceActionSchema)) body: z.infer<typeof invoiceActionSchema>,
  ) {
    return this.commercials.approveStage(user, id, 'MATERIAL', body);
  }

  @Post('invoices/:id/approve')
  @RequirePermissions(PERMISSIONS.INVOICE_APPROVE)
  approve(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(invoiceActionSchema)) body: z.infer<typeof invoiceActionSchema>,
  ) {
    return this.commercials.approveStage(user, id, 'FINANCE', body);
  }

  @Post('invoices/:id/hold')
  @RequirePermissions(PERMISSIONS.INVOICE_APPROVE)
  hold(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(holdInvoiceSchema)) body: z.infer<typeof holdInvoiceSchema>,
  ) {
    return this.commercials.hold(user, id, body);
  }

  @Post('invoices/:id/schedule')
  @RequirePermissions(PERMISSIONS.INVOICE_APPROVE)
  schedule(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(scheduleInvoiceSchema)) body: z.infer<typeof scheduleInvoiceSchema>,
  ) {
    return this.commercials.schedule(user, id, body);
  }

  @Post('invoices/:id/payments')
  @RequirePermissions(PERMISSIONS.PAYMENT_RECORD)
  recordPayment(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(recordPaymentSchema)) body: z.infer<typeof recordPaymentSchema>,
  ) {
    return this.commercials.recordPayment(user, id, body);
  }

  @Post('adjustments')
  @RequirePermissions(PERMISSIONS.INVOICE_APPROVE)
  createDeduction(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(deductionSchema)) body: z.infer<typeof deductionSchema>,
  ) {
    return this.commercials.createDeduction(user, body);
  }

  @Get('approvals')
  @RequirePermissions(PERMISSIONS.INVOICE_READ)
  listApprovals(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(approvalQuerySchema)) query: z.infer<typeof approvalQuerySchema>,
  ) {
    return this.commercials.listApprovals(user, query);
  }

  @Get('incentive-rules')
  @RequirePermissions(PERMISSIONS.RATE_READ)
  listIncentiveRules(@Query('partnerId') partnerId?: string) {
    return this.commercials.listIncentiveRules(partnerId);
  }

  @Post('incentive-rules')
  @RequirePermissions(PERMISSIONS.RATE_MANAGE)
  createIncentiveRule(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(incentiveRuleSchema)) body: z.infer<typeof incentiveRuleSchema>,
  ) {
    return this.commercials.createIncentiveRule(user, body);
  }
}

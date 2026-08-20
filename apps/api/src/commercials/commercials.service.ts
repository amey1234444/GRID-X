import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@gridx/db';
import {
  INVOICE_STATUS_TRANSITIONS,
  Paginated,
  PaginationInput,
  PaymentAdjustment,
  SubmitInvoiceInput,
  calculatePayment,
  createRateSchema,
  deductionSchema,
  holdInvoiceSchema,
  incentiveRuleSchema,
  invoiceActionSchema,
  recordPaymentSchema,
  scheduleInvoiceSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SequenceService } from '../audit/sequence.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ImsService } from '../ims/ims.service';
import { RequestUser } from '../common/request-user';
import { paginate, paginationArgs } from '../common/pagination';
import { assertTransition } from '../common/workflow';
import {
  assertCanWriteToCompany,
  assertCompanyScope,
  companyWhere,
} from '../common/company-scope';

export interface InvoiceFilters extends PaginationInput {
  status?: string;
  partnerId?: string;
}

/**
 * Module 11 — rates, partner invoices and the four-stage payment approval chain.
 * Payment is always accepted quantity × conversion rate, adjusted by incentives and deductions.
 */
@Injectable()
export class CommercialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
    private readonly notifications: NotificationsService,
    private readonly ims: ImsService,
  ) {}

  // -------------------------------------------------------------------------
  // Rates
  // -------------------------------------------------------------------------

  async listRates(actor: RequestUser, partnerId?: string, componentId?: string) {
    return this.prisma.partnerRate.findMany({
      where: {
        ...companyWhere(actor),
        ...(actor.partnerId ? { partnerId: actor.partnerId } : {}),
        ...(partnerId ? { partnerId } : {}),
        ...(componentId ? { componentId } : {}),
        isActive: true,
      },
      orderBy: { effectiveFrom: 'desc' },
      include: {
        partner: { select: { id: true, businessName: true } },
        component: { select: { id: true, componentCode: true, name: true } },
      },
    });
  }

  /** Rate revisions keep history: the previous rate is stored on the new record. */
  async createRate(actor: RequestUser, input: z.infer<typeof createRateSchema>) {
    assertCanWriteToCompany(actor, input.companyId);
    const current = await this.prisma.partnerRate.findFirst({
      where: { partnerId: input.partnerId, componentId: input.componentId, isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (current) {
      await this.prisma.partnerRate.update({
        where: { id: current.id },
        data: { isActive: false, effectiveTo: input.effectiveFrom },
      });
    }
    const rate = await this.prisma.partnerRate.create({
      data: {
        companyId: input.companyId,
        partnerId: input.partnerId,
        componentId: input.componentId,
        conversionRate: input.conversionRate,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo,
        minimumBatch: input.minimumBatch,
        revisionNote: input.revisionNote,
        previousRate: current?.conversionRate,
        approvedBy: actor.id,
      },
    });
    await this.audit.record(actor, {
      action: 'PARTNER_RATE_SET',
      entityType: 'PartnerRate',
      entityId: rate.id,
      companyId: input.companyId,
      before: current ? { conversionRate: current.conversionRate } : undefined,
      after: { conversionRate: rate.conversionRate, effectiveFrom: rate.effectiveFrom },
    });
    return rate;
  }

  // -------------------------------------------------------------------------
  // Invoices
  // -------------------------------------------------------------------------

  async listInvoices(actor: RequestUser, filters: InvoiceFilters): Promise<Paginated<unknown>> {
    const where: Prisma.PartnerInvoiceWhereInput = {
      ...(actor.partnerId ? { partnerId: actor.partnerId } : {}),
      ...(filters.partnerId && !actor.partnerId ? { partnerId: filters.partnerId } : {}),
      ...(filters.status ? { status: filters.status as Prisma.EnumInvoiceStatusFilter } : {}),
      ...(filters.search
        ? {
            OR: [
              { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
              { partnerInvoiceNo: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.partnerInvoice.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: { invoiceDate: 'desc' },
        include: {
          partner: { select: { id: true, businessName: true, city: true } },
          items: { include: { job: { select: { id: true, jobNumber: true } } } },
          approvals: true,
          payments: true,
        },
      }),
      this.prisma.partnerInvoice.count({ where }),
    ]);
    return paginate(data, total, filters);
  }

  async findInvoice(actor: RequestUser, id: string) {
    const invoice = await this.prisma.partnerInvoice.findUniqueOrThrow({
      where: { id },
      include: {
        partner: true,
        items: { include: { job: { include: { component: true } } } },
        approvals: { include: { approver: { select: { id: true, name: true } } } },
        payments: true,
        deductions: true,
      },
    });
    if (actor.partnerId && invoice.partnerId !== actor.partnerId) {
      throw new ForbiddenException('This invoice belongs to another partner');
    }
    assertCompanyScope(actor, invoice.companyId, 'invoice');
    return invoice;
  }

  /** Jobs that are quality accepted or received and not yet invoiced. */
  async invoiceableJobs(actor: RequestUser, partnerId?: string) {
    const scopedPartnerId = actor.partnerId ?? partnerId;
    if (!scopedPartnerId) throw new BadRequestException('partnerId is required');
    const jobs = await this.prisma.gridJob.findMany({
      where: {
        ...companyWhere(actor),
        partnerId: scopedPartnerId,
        status: { in: ['QUALITY_ACCEPTED', 'DISPATCHED', 'RECEIVED', 'CLOSED'] },
        acceptedQuantity: { gt: 0 },
        invoiceItems: { none: {} },
      },
      include: { component: { select: { componentCode: true, name: true } } },
      orderBy: { dueDate: 'asc' },
    });
    return jobs.map((job) => ({
      jobId: job.id,
      jobNumber: job.jobNumber,
      componentCode: job.component.componentCode,
      componentName: job.component.name,
      acceptedQuantity: job.acceptedQuantity,
      conversionRate: job.rate,
      amount: Math.round(job.acceptedQuantity * job.rate * 100) / 100,
    }));
  }

  async submitInvoice(actor: RequestUser, input: SubmitInvoiceInput, partnerIdOverride?: string) {
    const partnerId = actor.partnerId ?? partnerIdOverride;
    if (!partnerId) throw new BadRequestException('partnerId is required');

    const jobs = await this.prisma.gridJob.findMany({
      where: { ...companyWhere(actor), id: { in: input.jobIds }, partnerId },
      include: { reworkOrders: true },
    });
    if (jobs.length !== input.jobIds.length) {
      throw new BadRequestException('Some jobs are not available for invoicing');
    }
    const notAccepted = jobs.filter((job) => job.acceptedQuantity <= 0);
    if (notAccepted.length > 0) {
      throw new BadRequestException(
        `Quality acceptance is pending for ${notAccepted.map((job) => job.jobNumber).join(', ')}`,
      );
    }
    const alreadyInvoiced = await this.prisma.partnerInvoiceItem.findFirst({
      where: { jobId: { in: input.jobIds } },
    });
    if (alreadyInvoiced) throw new BadRequestException('One of these jobs is already invoiced');

    const adjustments = await this.pendingAdjustments(partnerId);
    const calculation = calculatePayment(
      jobs.map((job) => ({
        jobId: job.id,
        jobNumber: job.jobNumber,
        acceptedQuantity: job.acceptedQuantity,
        conversionRate: job.rate,
        amount: 0,
      })),
      adjustments,
      input.taxPercent,
    );

    const invoiceNumber = await this.sequence.next('INVOICE');
    const invoice = await this.prisma.partnerInvoice.create({
      data: {
        invoiceNumber,
        partnerInvoiceNo: input.partnerInvoiceNo,
        companyId: jobs[0].companyId,
        partnerId,
        status: 'RAISED',
        periodFrom: input.periodFrom,
        periodTo: input.periodTo,
        basicAmount: calculation.basicAmount,
        incentiveAmount: calculation.incentiveAmount,
        deductionAmount: calculation.deductionAmount,
        taxAmount: calculation.taxAmount,
        netAmount: calculation.netAmount,
        fileId: input.fileId,
        submittedById: actor.id,
        items: {
          create: calculation.lines.map((line) => ({
            jobId: line.jobId,
            acceptedQuantity: line.acceptedQuantity,
            conversionRate: line.conversionRate,
            amount: line.amount,
            description: line.jobNumber,
          })),
        },
      },
      include: { items: true },
    });

    await this.prisma.partnerDeduction.updateMany({
      where: { partnerId, invoiceId: null },
      data: { invoiceId: invoice.id },
    });

    await this.notifications.notify({
      event: 'INVOICE_SUBMITTED',
      title: `Invoice ${invoiceNumber} submitted`,
      body: `${jobs.length} job(s), net ₹${calculation.netAmount.toLocaleString('en-IN')}.`,
      link: `/control/finance/${invoice.id}`,
      entityType: 'PartnerInvoice',
      entityId: invoice.id,
      roleCodes: ['FINANCE_USER', 'OPERATIONS_HEAD'],
    });
    await this.audit.record(actor, {
      action: 'INVOICE_SUBMITTED',
      entityType: 'PartnerInvoice',
      entityId: invoice.id,
      companyId: invoice.companyId,
      after: { invoiceNumber, netAmount: calculation.netAmount, jobs: input.jobIds },
    });
    return invoice;
  }

  /** Stage approvals: QUANTITY → QUALITY → MATERIAL → FINANCE. */
  async approveStage(
    actor: RequestUser,
    id: string,
    stage: 'QUANTITY' | 'QUALITY' | 'MATERIAL' | 'FINANCE',
    input: z.infer<typeof invoiceActionSchema>,
  ) {
    await this.findInvoice(actor, id);
    const invoice = await this.prisma.partnerInvoice.findUniqueOrThrow({
      where: { id },
      include: { items: true },
    });
    const targetStatus: InvoiceStatus = input.approved
      ? stage === 'QUANTITY'
        ? 'QUANTITY_VERIFIED'
        : stage === 'QUALITY'
          ? 'QUALITY_VERIFIED'
          : stage === 'MATERIAL'
            ? 'MATERIAL_RECONCILED'
            : 'FINANCE_APPROVED'
      : 'HELD';

    assertTransition('Invoice', invoice.status, targetStatus, INVOICE_STATUS_TRANSITIONS);

    if (input.approved && stage === 'MATERIAL') {
      const jobIds = invoice.items.map((item) => item.jobId);
      const unbalanced = await this.prisma.materialReconciliation.findFirst({
        where: { jobId: { in: jobIds }, status: { not: 'BALANCED' } },
      });
      const oswarSupplied = await this.prisma.gridJob.findFirst({
        where: { id: { in: jobIds }, materialResponsibility: 'OSWAR_SUPPLIED' },
      });
      if (oswarSupplied) {
        const reconciliations = await this.prisma.materialReconciliation.count({
          where: { jobId: { in: jobIds } },
        });
        if (reconciliations === 0 || unbalanced) {
          throw new BadRequestException('Material must be reconciled before this stage is approved');
        }
      }
    }

    await this.prisma.paymentApproval.create({
      data: { invoiceId: id, stage, approved: input.approved, approverId: actor.id, remarks: input.remarks },
    });

    const stampedAt = new Date();
    const updated = await this.prisma.partnerInvoice.update({
      where: { id },
      data: {
        status: targetStatus,
        ...(input.approved && stage === 'QUANTITY' ? { quantityVerifiedAt: stampedAt } : {}),
        ...(input.approved && stage === 'QUALITY' ? { qualityVerifiedAt: stampedAt } : {}),
        ...(input.approved && stage === 'MATERIAL' ? { materialReconciledAt: stampedAt } : {}),
        ...(input.approved && stage === 'FINANCE' ? { financeApprovedAt: stampedAt } : {}),
        ...(input.approved ? {} : { holdReason: input.remarks ?? 'Stage not approved' }),
      },
    });

    await this.notifications.notify({
      event: input.approved && stage === 'FINANCE' ? 'INVOICE_APPROVED' : 'INVOICE_HELD',
      title: `Invoice ${invoice.invoiceNumber} ${input.approved ? `${stage.toLowerCase()} verified` : 'held'}`,
      body: input.remarks ?? `Stage ${stage} ${input.approved ? 'approved' : 'held'}.`,
      link: `/partner/invoices/${id}`,
      entityType: 'PartnerInvoice',
      entityId: id,
      partnerId: invoice.partnerId,
    });

    // §10 — the approved invoice and the conversion cost behind it belong in IMS.
    if (input.approved && stage === 'FINANCE') {
      await this.ims.pushInBackground('partner-invoices', id);
      await this.ims.pushInBackground('conversion-cost', id);
    }
    await this.audit.record(actor, {
      action: `INVOICE_${stage}_${input.approved ? 'APPROVED' : 'HELD'}`,
      entityType: 'PartnerInvoice',
      entityId: id,
      before: { status: invoice.status },
      after: { status: targetStatus, remarks: input.remarks },
    });
    return updated;
  }

  async hold(actor: RequestUser, id: string, input: z.infer<typeof holdInvoiceSchema>) {
    await this.findInvoice(actor, id);
    const invoice = await this.prisma.partnerInvoice.findUniqueOrThrow({ where: { id } });
    assertTransition('Invoice', invoice.status, 'HELD', INVOICE_STATUS_TRANSITIONS);
    const updated = await this.prisma.partnerInvoice.update({
      where: { id },
      data: { status: 'HELD', holdReason: input.holdReason },
    });
    await this.notifications.notify({
      event: 'INVOICE_HELD',
      title: `Invoice ${invoice.invoiceNumber} held`,
      body: input.holdReason,
      link: `/partner/invoices/${id}`,
      entityType: 'PartnerInvoice',
      entityId: id,
      partnerId: invoice.partnerId,
    });
    await this.audit.record(actor, {
      action: 'INVOICE_HELD',
      entityType: 'PartnerInvoice',
      entityId: id,
      after: { holdReason: input.holdReason },
    });
    return updated;
  }

  async schedule(actor: RequestUser, id: string, input: z.infer<typeof scheduleInvoiceSchema>) {
    await this.findInvoice(actor, id);
    const invoice = await this.prisma.partnerInvoice.findUniqueOrThrow({ where: { id } });
    assertTransition('Invoice', invoice.status, 'PAYMENT_SCHEDULED', INVOICE_STATUS_TRANSITIONS);
    const updated = await this.prisma.partnerInvoice.update({
      where: { id },
      data: { status: 'PAYMENT_SCHEDULED', paymentScheduledFor: input.paymentScheduledFor },
    });
    await this.audit.record(actor, {
      action: 'INVOICE_PAYMENT_SCHEDULED',
      entityType: 'PartnerInvoice',
      entityId: id,
      after: { paymentScheduledFor: input.paymentScheduledFor },
    });
    return updated;
  }

  async recordPayment(actor: RequestUser, id: string, input: z.infer<typeof recordPaymentSchema>) {
    await this.findInvoice(actor, id);
    const invoice = await this.prisma.partnerInvoice.findUniqueOrThrow({
      where: { id },
      include: { payments: true },
    });
    assertTransition('Invoice', invoice.status, 'PAID', INVOICE_STATUS_TRANSITIONS);
    const alreadyPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
    if (alreadyPaid + input.amount > invoice.netAmount + 0.01) {
      throw new BadRequestException('Payment exceeds the approved invoice value');
    }

    const payment = await this.prisma.paymentRecord.create({
      data: {
        invoiceId: id,
        amount: input.amount,
        mode: input.mode,
        referenceNo: input.referenceNo,
        paidAt: input.paidAt ?? new Date(),
        recordedById: actor.id,
        remarks: input.remarks,
      },
    });
    const fullyPaid = alreadyPaid + input.amount >= invoice.netAmount - 0.01;
    if (fullyPaid) {
      await this.prisma.partnerInvoice.update({
        where: { id },
        data: { status: 'PAID', paidAt: payment.paidAt },
      });
    }
    await this.notifications.notify({
      event: 'PAYMENT_RELEASED',
      title: `Payment released for ${invoice.invoiceNumber}`,
      body: `₹${input.amount.toLocaleString('en-IN')} via ${input.mode}${
        input.referenceNo ? ` (${input.referenceNo})` : ''
      }.`,
      link: `/partner/invoices/${id}`,
      entityType: 'PartnerInvoice',
      entityId: id,
      partnerId: invoice.partnerId,
      channels: ['IN_APP', 'WHATSAPP'],
    });
    await this.audit.record(actor, {
      action: 'PAYMENT_RECORDED',
      entityType: 'PartnerInvoice',
      entityId: id,
      after: { amount: input.amount, mode: input.mode, fullyPaid },
    });
    return payment;
  }

  // -------------------------------------------------------------------------
  // Adjustments
  // -------------------------------------------------------------------------

  async createDeduction(actor: RequestUser, input: z.infer<typeof deductionSchema>) {
    const partner = await this.prisma.partner.findUniqueOrThrow({
      where: { id: input.partnerId },
      select: { companyId: true },
    });
    assertCompanyScope(actor, partner.companyId, 'partner');
    const deduction = await this.prisma.partnerDeduction.create({
      data: {
        partnerId: input.partnerId,
        invoiceId: input.invoiceId,
        type: input.type,
        reason: input.reason,
        amount: input.amount,
        approvedBy: actor.id,
        approvedAt: new Date(),
      },
    });
    await this.audit.record(actor, {
      action: 'PARTNER_ADJUSTMENT_CREATED',
      entityType: 'PartnerDeduction',
      entityId: deduction.id,
      after: { type: input.type, amount: input.amount, reason: input.reason },
    });
    return deduction;
  }

  async listIncentiveRules(partnerId?: string) {
    return this.prisma.partnerIncentiveRule.findMany({
      where: { isActive: true, ...(partnerId ? { OR: [{ partnerId }, { partnerId: null }] } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createIncentiveRule(actor: RequestUser, input: z.infer<typeof incentiveRuleSchema>) {
    const rule = await this.prisma.partnerIncentiveRule.create({ data: input });
    await this.audit.record(actor, {
      action: 'INCENTIVE_RULE_CREATED',
      entityType: 'PartnerIncentiveRule',
      entityId: rule.id,
      after: { name: rule.name, type: rule.type },
    });
    return rule;
  }

  private async pendingAdjustments(partnerId: string): Promise<PaymentAdjustment[]> {
    const deductions = await this.prisma.partnerDeduction.findMany({
      where: { partnerId, invoiceId: null },
    });
    return deductions.map((deduction) => ({
      type: deduction.type,
      label: deduction.reason,
      amount: deduction.amount,
    }));
  }
}

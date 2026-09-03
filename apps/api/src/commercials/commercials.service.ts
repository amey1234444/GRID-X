import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@gridx/db';
import {
  INVOICE_STATUS_TRANSITIONS,
  Paginated,
  PaginationInput,
  PaymentAdjustment,
  SubmitInvoiceInput,
  calculatePayment,
  earnedIncentives,
  performanceForJobs,
  type EarnedIncentive,
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

/**
 * Module 11 — a job may be invoiced once quality has accepted it and it is on its way back or
 * settled. Shared by the picker that lists invoiceable jobs and the guard on submission, so the
 * screen and the endpoint cannot disagree about what is billable.
 */
export const INVOICEABLE_JOB_STATUSES = [
  'QUALITY_ACCEPTED',
  'DISPATCHED',
  'RECEIVED',
  'CLOSED',
] as const;

export interface InvoiceFilters extends PaginationInput {
  status?: string;
  partnerId?: string;
}

export interface RateSummary {
  /** Rate cards currently in force across the filtered set. */
  active: number;
  /** Mean conversion rate across the filtered set; null when nothing matches. */
  averageRate: number | null;
}

export interface RateFilters extends PaginationInput {
  partnerId?: string;
  componentId?: string;
  search?: string;
  /** Omitted means the full revision history — active cards and superseded ones. */
  isActive?: boolean;
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

  /**
   * Rate cards, newest revision first. Returns a page envelope like every other
   * list endpoint — the screen reads `data`/`total`, so a bare array breaks it.
   *
   * The full revision history is returned by default: the screen renders both
   * ACTIVE and SUPERSEDED cards, so filtering to active here would leave it
   * unable to show a rate's history at all. Pass `isActive` to narrow it.
   */
  async listRates(
    actor: RequestUser,
    filters: RateFilters,
  ): Promise<Paginated<unknown> & { summary: RateSummary }> {
    const where: Prisma.PartnerRateWhereInput = {
      ...companyWhere(actor),
      // A partner user only ever sees their own rate card.
      ...(actor.partnerId ? { partnerId: actor.partnerId } : {}),
      ...(filters.partnerId && !actor.partnerId ? { partnerId: filters.partnerId } : {}),
      ...(filters.componentId ? { componentId: filters.componentId } : {}),
      ...(filters.isActive === undefined ? {} : { isActive: filters.isActive }),
      ...(filters.search
        ? {
            OR: [
              { partner: { businessName: { contains: filters.search, mode: 'insensitive' } } },
              { component: { componentCode: { contains: filters.search, mode: 'insensitive' } } },
              { component: { name: { contains: filters.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total, activeCount, aggregate] = await Promise.all([
      this.prisma.partnerRate.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
        include: {
          partner: { select: { id: true, businessName: true } },
          component: { select: { id: true, componentCode: true, name: true } },
        },
      }),
      this.prisma.partnerRate.count({ where }),
      this.prisma.partnerRate.count({ where: { ...where, isActive: true } }),
      this.prisma.partnerRate.aggregate({ where, _avg: { conversionRate: true } }),
    ]);

    // Summarised over the whole filtered set, not just the page — otherwise the
    // headline figures would change every time someone paged through.
    return {
      ...paginate(data, total, filters),
      summary: { active: activeCount, averageRate: aggregate._avg.conversionRate },
    };
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
        status: { in: [...INVOICEABLE_JOB_STATUSES] },
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

    // The job must have reached quality acceptance, not merely have some accepted quantity on it.
    // A partially accepted job sitting in REWORK has an accepted quantity that is still moving —
    // invoicing it bills for a figure that is not final. The `include: { reworkOrders: true }`
    // above was the trace of a guard that was intended here and never written; the picker on the
    // invoice screen filtered correctly, so only a direct API call reached this.
    const notReady = jobs.filter(
      (job) => !INVOICEABLE_JOB_STATUSES.includes(job.status as (typeof INVOICEABLE_JOB_STATUSES)[number]),
    );
    if (notReady.length > 0) {
      throw new BadRequestException(
        `Not ready to invoice: ${notReady
          .map((job) => `${job.jobNumber} (${job.status.toLowerCase().replace(/_/g, ' ')})`)
          .join(', ')}. Invoice once quality has accepted the work.`,
      );
    }

    const openRework = jobs.filter((job) =>
      job.reworkOrders.some(
        (order) => order.status !== 'COMPLETED' && order.status !== 'SCRAPPED',
      ),
    );
    if (openRework.length > 0) {
      throw new BadRequestException(
        `Rework is still open on ${openRework.map((job) => job.jobNumber).join(', ')}. ` +
          'Close the rework so the accepted quantity and any deduction are final.',
      );
    }
    const alreadyInvoiced = await this.prisma.partnerInvoiceItem.findFirst({
      where: { jobId: { in: input.jobIds } },
    });
    if (alreadyInvoiced) throw new BadRequestException('One of these jobs is already invoiced');

    const lines = jobs.map((job) => ({
      jobId: job.id,
      jobNumber: job.jobNumber,
      acceptedQuantity: job.acceptedQuantity,
      conversionRate: job.rate,
      amount: 0,
    }));

    // Incentives are earned against the basic amount, so that has to be known before the rules can
    // be judged; calculatePayment is then run once more with the full adjustment set.
    const basicAmount = calculatePayment(lines, [], 0).basicAmount;
    const earned = await this.earnedIncentivesFor(partnerId, jobs, basicAmount);
    const adjustments = [...(await this.pendingAdjustments(partnerId)), ...earned];

    const calculation = calculatePayment(lines, adjustments, input.taxPercent);

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

    // The adjustment ledger carries incentives as well as deductions, so an earned incentive is
    // recorded line by line rather than disappearing into a single total on the invoice. They are
    // written already attached to this invoice so the sweep above cannot pick them up twice.
    if (earned.length > 0) {
      await this.prisma.partnerDeduction.createMany({
        data: earned.map((incentive) => ({
          partnerId,
          invoiceId: invoice.id,
          type: incentive.type,
          reason: incentive.label,
          amount: incentive.amount,
          approvedAt: new Date(),
        })),
      });
    }

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

  /**
   * Commercial - Approvals (Section 24). The invoice approval trail.
   *
   * Every stage sign-off was written to PaymentApproval and never read back, so the record of who
   * verified quantity, quality, material and finance existed but could not be inspected — which is
   * exactly the audit question this table is for.
   */
  async listApprovals(
    actor: RequestUser,
    filters: PaginationInput & { stage?: string; partnerId?: string; approved?: boolean },
  ) {
    const where: Prisma.PaymentApprovalWhereInput = {
      invoice: {
        ...companyWhere(actor),
        ...(actor.partnerId ? { partnerId: actor.partnerId } : {}),
        ...(filters.partnerId && !actor.partnerId ? { partnerId: filters.partnerId } : {}),
      },
      ...(filters.stage ? { stage: filters.stage } : {}),
      ...(filters.approved === undefined ? {} : { approved: filters.approved }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.paymentApproval.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: { createdAt: 'desc' },
        include: {
          approver: { select: { name: true } },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              netAmount: true,
              partner: { select: { id: true, businessName: true } },
            },
          },
        },
      }),
      this.prisma.paymentApproval.count({ where }),
    ]);

    const data = rows.map((row) => ({
      id: row.id,
      stage: row.stage,
      approved: row.approved,
      remarks: row.remarks,
      approverName: row.approver?.name ?? null,
      createdAt: row.createdAt,
      invoiceId: row.invoice.id,
      invoiceNumber: row.invoice.invoiceNumber,
      invoiceStatus: row.invoice.status,
      netAmount: row.invoice.netAmount,
      partnerName: row.invoice.partner?.businessName ?? null,
    }));

    return paginate(data, total, filters);
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

  /**
   * Module 11 pays \"accepted quantity x conversion rate + quality incentive + on-time delivery
   * incentive\", so an invoice that only ever subtracts is short. Rules configured against this
   * partner win over the network-wide default of the same type, which is how procurement expresses
   * a negotiated rate for one partner.
   */
  private async earnedIncentivesFor(
    partnerId: string,
    jobs: {
      acceptedQuantity: number;
      rejectedQuantity: number;
      dueDate: Date | null;
      completedAt: Date | null;
    }[],
    basicAmount: number,
  ): Promise<EarnedIncentive[]> {
    const rules = await this.prisma.partnerIncentiveRule.findMany({
      where: { isActive: true, OR: [{ partnerId }, { partnerId: null }] },
      orderBy: { partnerId: 'desc' },
    });

    const mostSpecific = new Map<string, (typeof rules)[number]>();
    for (const rule of rules) {
      if (!mostSpecific.has(rule.type)) mostSpecific.set(rule.type, rule);
    }

    return earnedIncentives(
      [...mostSpecific.values()],
      performanceForJobs(jobs),
      basicAmount,
    );
  }
}

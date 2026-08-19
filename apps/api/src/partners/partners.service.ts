import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Partner, Prisma } from '@gridx/db';
import {
  ALLOCATABLE_PARTNER_STATUSES,
  CreatePartnerInput,
  PARTNER_APPROVAL_TRANSITIONS,
  Paginated,
  PaginationInput,
  PartnerApprovalStatus,
  PartnerCapabilityInput,
  partnerAuditSchema,
  partnerDocumentSchema,
  partnerEmployeeSchema,
  partnerMachineSchema,
  updatePartnerSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SequenceService } from '../audit/sequence.service';
import { RequestUser } from '../common/request-user';
import { paginate, paginationArgs } from '../common/pagination';
import { assertTransition } from '../common/workflow';
import {
  assertCanWriteToCompany,
  assertCompanyScope,
  companyWhere,
  isCompanyScoped,
} from '../common/company-scope';

export interface PartnerListFilters extends PaginationInput {
  approvalStatus?: PartnerApprovalStatus;
  category?: string;
  city?: string;
  process?: string;
  companyId?: string;
}

@Injectable()
export class PartnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
  ) {}

  /**
   * Partner users may only ever read their own partner record (Section 18 isolation); internal
   * users only ever see partners belonging to a company they are linked to (Section 4).
   */
  private async assertScope(actor: RequestUser, partnerId: string): Promise<void> {
    if (actor.userType === 'PARTNER') {
      if (actor.partnerId !== partnerId) {
        throw new ForbiddenException('You can only access your own partner data');
      }
      return;
    }
    if (!isCompanyScoped(actor)) return;
    const partner = await this.prisma.partner.findUniqueOrThrow({
      where: { id: partnerId },
      select: { companyId: true },
    });
    assertCompanyScope(actor, partner.companyId, 'partner');
  }

  async list(actor: RequestUser, filters: PartnerListFilters): Promise<Paginated<Partner>> {
    const where: Prisma.PartnerWhereInput = {
      ...companyWhere(actor, filters.companyId),
      ...(actor.userType === 'PARTNER' ? { id: actor.partnerId ?? '' } : {}),
      ...(filters.approvalStatus ? { approvalStatus: filters.approvalStatus } : {}),
      ...(filters.category ? { category: filters.category as Partner['category'] } : {}),
      ...(filters.city ? { city: { contains: filters.city, mode: 'insensitive' } } : {}),
      ...(filters.process
        ? { capabilities: { some: { process: filters.process as never, isApproved: true } } }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { businessName: { contains: filters.search, mode: 'insensitive' } },
              { partnerCode: { contains: filters.search, mode: 'insensitive' } },
              { ownerName: { contains: filters.search, mode: 'insensitive' } },
              { city: { contains: filters.search, mode: 'insensitive' } },
              { phone: { contains: filters.search } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.partner.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: { [filters.sortBy ?? 'createdAt']: filters.sortDir },
        include: {
          capabilities: { where: { isApproved: true }, select: { process: true } },
          _count: { select: { jobs: true } },
        },
      }),
      this.prisma.partner.count({ where }),
    ]);
    return paginate(data, total, filters);
  }

  async findOne(actor: RequestUser, id: string) {
    await this.assertScope(actor, id);
    const partner = await this.prisma.partner.findUniqueOrThrow({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        capabilities: { orderBy: { process: 'asc' } },
        machines: { orderBy: { createdAt: 'desc' } },
        documents: { orderBy: { type: 'asc' } },
        employees: { orderBy: { name: 'asc' } },
        audits: { orderBy: { auditDate: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'desc' }, include: { changedBy: true } },
        approvedComponents: { include: { component: true } },
        scores: { orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }], take: 12 },
        rates: { where: { isActive: true }, include: { component: true } },
        users: { select: { id: true, name: true, phone: true, email: true, status: true } },
        _count: {
          select: { jobs: true, invoices: true, nonConformances: true },
        },
      },
    });

    const openJobs = await this.prisma.gridJob.count({
      where: { partnerId: id, status: { notIn: ['CLOSED', 'CANCELLED'] } },
    });
    return { ...partner, openJobs, canAllocate: this.canAllocate(partner) };
  }

  canAllocate(partner: Pick<Partner, 'approvalStatus' | 'isActive'>): boolean {
    return (
      partner.isActive &&
      (ALLOCATABLE_PARTNER_STATUSES as readonly string[]).includes(partner.approvalStatus)
    );
  }

  async create(actor: RequestUser, input: CreatePartnerInput): Promise<Partner> {
    assertCanWriteToCompany(actor, input.companyId);
    const partnerCode = await this.sequence.next('PARTNER');
    const partner = await this.prisma.partner.create({
      data: {
        partnerCode,
        companyId: input.companyId,
        businessName: input.businessName,
        ownerName: input.ownerName,
        phone: input.phone,
        altPhone: input.altPhone,
        email: input.email,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        latitude: input.latitude,
        longitude: input.longitude,
        distanceKm: input.distanceKm,
        udyamNumber: input.udyamNumber,
        gstNumber: input.gstNumber,
        panNumber: input.panNumber,
        bankName: input.bankName,
        bankAccountName: input.bankAccountName,
        bankAccountNo: input.bankAccountNo,
        bankIfsc: input.bankIfsc,
        level: input.level,
        paymentTermsDays: input.paymentTermsDays,
        maxCapacityHours: input.maxCapacityHours,
        maxOpenJobs: input.maxOpenJobs,
        notes: input.notes,
        createdById: actor.id,
        statusHistory: { create: { toStatus: 'DRAFT', reason: 'Partner registered' } },
      },
    });
    await this.audit.record(actor, {
      action: 'PARTNER_CREATED',
      entityType: 'Partner',
      entityId: partner.id,
      companyId: partner.companyId,
      after: { partnerCode, businessName: partner.businessName },
    });
    return partner;
  }

  async update(
    actor: RequestUser,
    id: string,
    input: z.infer<typeof updatePartnerSchema>,
  ): Promise<Partner> {
    await this.assertScope(actor, id);
    const before = await this.prisma.partner.findUniqueOrThrow({ where: { id } });
    const partner = await this.prisma.partner.update({ where: { id }, data: input });
    await this.audit.record(actor, {
      action: 'PARTNER_UPDATED',
      entityType: 'Partner',
      entityId: id,
      companyId: partner.companyId,
      before: { businessName: before.businessName, level: before.level },
      after: { businessName: partner.businessName, level: partner.level },
    });
    return partner;
  }

  /** Module 1 approval workflow: draft → document review → audit → trial → approved → certified. */
  async changeStatus(
    actor: RequestUser,
    id: string,
    toStatus: PartnerApprovalStatus,
    reason?: string,
  ): Promise<Partner> {
    await this.assertScope(actor, id);
    const partner = await this.prisma.partner.findUniqueOrThrow({
      where: { id },
      include: { documents: true, capabilities: true, audits: true },
    });
    assertTransition('Partner', partner.approvalStatus, toStatus, PARTNER_APPROVAL_TRANSITIONS);

    if (toStatus === 'CAPABILITY_AUDIT') {
      const verified = partner.documents.filter((document) => document.verified);
      if (verified.length === 0) {
        throw new BadRequestException('Verify at least one compliance document before the audit');
      }
    }
    if (toStatus === 'TRIAL_APPROVED' || toStatus === 'APPROVED') {
      const audited = partner.audits.some((audit) => audit.status === 'PASSED');
      if (!audited) throw new BadRequestException('A passed capability audit is required');
      if (partner.capabilities.filter((capability) => capability.isApproved).length === 0) {
        throw new BadRequestException('Approve at least one process capability');
      }
    }

    const updated = await this.prisma.partner.update({
      where: { id },
      data: {
        approvalStatus: toStatus,
        isActive: toStatus !== 'SUSPENDED',
        suspendedReason: toStatus === 'SUSPENDED' ? (reason ?? 'Suspended') : null,
        statusHistory: {
          create: {
            fromStatus: partner.approvalStatus,
            toStatus,
            reason,
            changedById: actor.id,
          },
        },
      },
    });
    await this.audit.record(actor, {
      action: 'PARTNER_STATUS_CHANGED',
      entityType: 'Partner',
      entityId: id,
      companyId: partner.companyId,
      before: { approvalStatus: partner.approvalStatus },
      after: { approvalStatus: toStatus, reason: reason ?? null },
    });
    return updated;
  }

  async suspend(actor: RequestUser, id: string, reason: string): Promise<Partner> {
    return this.changeStatus(actor, id, 'SUSPENDED', reason);
  }

  async upsertCapability(actor: RequestUser, id: string, input: PartnerCapabilityInput) {
    await this.assertScope(actor, id);
    const capability = await this.prisma.partnerCapability.upsert({
      where: { partnerId_process: { partnerId: id, process: input.process } },
      create: { partnerId: id, ...input },
      update: input,
    });
    await this.refreshCapacityCeiling(id);
    await this.audit.record(actor, {
      action: 'PARTNER_CAPABILITY_SAVED',
      entityType: 'PartnerCapability',
      entityId: capability.id,
      after: { process: input.process, isApproved: input.isApproved },
    });
    return capability;
  }

  async removeCapability(actor: RequestUser, id: string, capabilityId: string) {
    await this.assertScope(actor, id);
    await this.prisma.partnerCapability.delete({ where: { id: capabilityId } });
    await this.refreshCapacityCeiling(id);
    await this.audit.record(actor, {
      action: 'PARTNER_CAPABILITY_REMOVED',
      entityType: 'PartnerCapability',
      entityId: capabilityId,
    });
    return { success: true };
  }

  async addMachine(actor: RequestUser, id: string, input: z.infer<typeof partnerMachineSchema>) {
    await this.assertScope(actor, id);
    const machine = await this.prisma.partnerMachine.create({ data: { partnerId: id, ...input } });
    await this.audit.record(actor, {
      action: 'PARTNER_MACHINE_ADDED',
      entityType: 'PartnerMachine',
      entityId: machine.id,
      after: { machineType: machine.machineType },
    });
    return machine;
  }

  async removeMachine(actor: RequestUser, machineId: string) {
    const machine = await this.prisma.partnerMachine.findUniqueOrThrow({
      where: { id: machineId },
      select: { partnerId: true },
    });
    await this.assertScope(actor, machine.partnerId);
    await this.prisma.partnerMachine.delete({ where: { id: machineId } });
    await this.audit.record(actor, {
      action: 'PARTNER_MACHINE_REMOVED',
      entityType: 'PartnerMachine',
      entityId: machineId,
    });
    return { success: true };
  }

  async saveDocument(actor: RequestUser, id: string, input: z.infer<typeof partnerDocumentSchema>) {
    await this.assertScope(actor, id);
    const document = await this.prisma.partnerDocument.create({
      data: { partnerId: id, ...input },
    });
    await this.audit.record(actor, {
      action: 'PARTNER_DOCUMENT_UPLOADED',
      entityType: 'PartnerDocument',
      entityId: document.id,
      after: { type: document.type },
    });
    return document;
  }

  async verifyDocument(actor: RequestUser, documentId: string) {
    const existing = await this.prisma.partnerDocument.findUniqueOrThrow({
      where: { id: documentId },
      select: { partnerId: true },
    });
    await this.assertScope(actor, existing.partnerId);
    const document = await this.prisma.partnerDocument.update({
      where: { id: documentId },
      data: { verified: true, verifiedAt: new Date() },
    });
    await this.audit.record(actor, {
      action: 'PARTNER_DOCUMENT_VERIFIED',
      entityType: 'PartnerDocument',
      entityId: documentId,
    });
    return document;
  }

  async addEmployee(actor: RequestUser, id: string, input: z.infer<typeof partnerEmployeeSchema>) {
    await this.assertScope(actor, id);
    return this.prisma.partnerEmployee.create({ data: { partnerId: id, ...input } });
  }

  async removeEmployee(actor: RequestUser, employeeId: string) {
    const employee = await this.prisma.partnerEmployee.findUniqueOrThrow({
      where: { id: employeeId },
      select: { partnerId: true },
    });
    await this.assertScope(actor, employee.partnerId);
    await this.prisma.partnerEmployee.delete({ where: { id: employeeId } });
    return { success: true };
  }

  async recordAudit(actor: RequestUser, id: string, input: z.infer<typeof partnerAuditSchema>) {
    await this.assertScope(actor, id);
    const audit = await this.prisma.partnerAudit.create({
      data: { partnerId: id, auditorId: actor.id, ...input },
    });
    await this.prisma.partner.update({
      where: { id },
      data: { auditStatus: input.status },
    });
    await this.audit.record(actor, {
      action: 'PARTNER_AUDIT_RECORDED',
      entityType: 'PartnerAudit',
      entityId: audit.id,
      after: { status: audit.status, score: audit.score },
    });
    return audit;
  }

  /** Keeps the partner capacity ceiling in step with the declared process capacities. */
  private async refreshCapacityCeiling(partnerId: string): Promise<void> {
    const aggregate = await this.prisma.partnerCapability.aggregate({
      where: { partnerId, isCapable: true },
      _sum: { monthlyCapacityHours: true },
    });
    await this.prisma.partner.update({
      where: { id: partnerId },
      data: { maxCapacityHours: aggregate._sum.monthlyCapacityHours ?? 0 },
    });
  }
}

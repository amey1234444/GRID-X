import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Partner, Prisma } from '@gridx/db';
import {
  ALLOCATABLE_PARTNER_STATUSES,
  PROCESS_TYPES,
  type ProcessType,
  isUsableCoordinate,
  roadDistanceKm,
  CreatePartnerInput,
  PARTNER_APPROVAL_TRANSITIONS,
  Paginated,
  PaginationInput,
  PartnerApprovalStatus,
  PartnerCapabilityInput,
  partnerAuditSchema,
  partnerDocumentSchema,
  partnerEmployeeSchema,
  partnerLocationSchema,
  partnerMachineSchema,
  updatePartnerSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SequenceService } from '../audit/sequence.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestUser } from '../common/request-user';
import { paginate, paginationArgs } from '../common/pagination';
import { assertTransition } from '../common/workflow';
import {
  assertCanWriteToCompany,
  assertCompanyScope,
  companyWhere,
  isCompanyScoped,
} from '../common/company-scope';

/** `DOCUMENT_REVIEW` reads badly in a message; "Document review" does not. */
function humaniseStatus(status: string): string {
  const words = status.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

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
    private readonly notifications: NotificationsService,
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
        // Module 1 — the units this partner works out of, primary first.
        locations: { orderBy: [{ isPrimary: 'desc' }, { label: 'asc' }] },
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

  /**
   * Section 7 screen 5 — the capability matrix.
   *
   * Capabilities were only ever visible one partner at a time, on that partner's own page. The
   * question a planner actually asks is the other way round: who in the network can do this
   * process, and how thin is the cover if one of them drops out. That is a concentration risk you
   * cannot see by opening partners one by one.
   */
  async capabilityMatrix(
    actor: RequestUser,
    companyId?: string,
  ): Promise<{
    processes: ProcessType[];
    partners: {
      id: string;
      partnerCode: string;
      businessName: string;
      city: string;
      category: string;
      approvalStatus: string;
      allocatable: boolean;
      capabilities: Record<string, { approved: boolean; capacityHours: number }>;
    }[];
    coverage: { process: ProcessType; approvedPartners: number; allocatablePartners: number }[];
  }> {
    const partners = await this.prisma.partner.findMany({
      where: {
        ...companyWhere(actor, companyId),
        ...(actor.userType === 'PARTNER' ? { id: actor.partnerId ?? '' } : {}),
        isActive: true,
      },
      orderBy: { businessName: 'asc' },
      select: {
        id: true,
        partnerCode: true,
        businessName: true,
        city: true,
        category: true,
        approvalStatus: true,
        isActive: true,
        capabilities: {
          where: { isCapable: true },
          select: { process: true, isApproved: true, monthlyCapacityHours: true },
        },
      },
    });

    const rows = partners.map((partner) => {
      const capabilities: Record<string, { approved: boolean; capacityHours: number }> = {};
      for (const capability of partner.capabilities) {
        capabilities[capability.process] = {
          approved: capability.isApproved,
          capacityHours: capability.monthlyCapacityHours,
        };
      }
      return {
        id: partner.id,
        partnerCode: partner.partnerCode,
        businessName: partner.businessName,
        city: partner.city,
        category: partner.category,
        approvalStatus: partner.approvalStatus,
        allocatable: this.canAllocate(partner),
        capabilities,
      };
    });

    // Coverage counts only partners who could actually take work today: an approved capability at
    // a partner who is suspended is not cover.
    const coverage = PROCESS_TYPES.map((process) => ({
      process,
      approvedPartners: rows.filter((row) => row.capabilities[process]?.approved).length,
      allocatablePartners: rows.filter(
        (row) => row.allocatable && row.capabilities[process]?.approved,
      ).length,
    }));

    return { processes: [...PROCESS_TYPES], partners: rows, coverage };
  }

  /**
   * Partners - Machines (Section 24). The network's machine register.
   *
   * Machines were only visible on the owning partner's page, which answers "what does this partner
   * have" but never "who in the network has a 200-tonne press" — the question a planner asks when
   * placing work.
   */
  async listMachines(
    actor: RequestUser,
    filters: PaginationInput & { partnerId?: string; search?: string },
  ) {
    const where: Prisma.PartnerMachineWhereInput = {
      partner: {
        ...companyWhere(actor),
        ...(actor.userType === 'PARTNER' ? { id: actor.partnerId ?? '' } : {}),
        ...(filters.partnerId && actor.userType !== 'PARTNER' ? { id: filters.partnerId } : {}),
      },
      ...(filters.search
        ? {
            OR: [
              { machineType: { contains: filters.search, mode: 'insensitive' } },
              { make: { contains: filters.search, mode: 'insensitive' } },
              { model: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.partnerMachine.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: [{ machineType: 'asc' }, { make: 'asc' }],
        include: {
          partner: { select: { id: true, businessName: true, city: true } },
        },
      }),
      this.prisma.partnerMachine.count({ where }),
    ]);

    const data = rows.map((row) => ({
      id: row.id,
      partnerId: row.partner.id,
      partnerName: row.partner.businessName,
      city: row.partner.city,
      machineType: row.machineType,
      make: row.make,
      model: row.model,
      size: row.size,
      capacity: row.capacity,
      accuracy: row.accuracy,
      condition: row.condition,
      ownership: row.ownership,
      quantity: row.quantity,
      lastServicedAt: row.lastServicedAt,
    }));

    return paginate(data, total, filters);
  }

  /** Partners - Audits (Section 24). Every partner audit in one queue, newest first. */
  async listAudits(
    actor: RequestUser,
    filters: PaginationInput & { partnerId?: string; result?: string },
  ) {
    const where: Prisma.PartnerAuditWhereInput = {
      partner: {
        ...companyWhere(actor),
        ...(actor.userType === 'PARTNER' ? { id: actor.partnerId ?? '' } : {}),
        ...(filters.partnerId && actor.userType !== 'PARTNER' ? { id: filters.partnerId } : {}),
      },
      ...(filters.result ? { status: filters.result as Prisma.EnumPartnerAuditStatusFilter } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.partnerAudit.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: { auditDate: 'desc' },
        include: {
          partner: { select: { id: true, businessName: true, city: true } },
          auditor: { select: { name: true } },
        },
      }),
      this.prisma.partnerAudit.count({ where }),
    ]);

    const data = rows.map((row) => ({
      id: row.id,
      partnerId: row.partner.id,
      partnerName: row.partner.businessName,
      city: row.partner.city,
      auditDate: row.auditDate,
      auditType: row.auditType,
      score: row.score,
      status: row.status,
      findings: row.findings,
      auditorName: row.auditor?.name ?? null,
      nextAuditDate: row.nextAuditDate,
    }));

    return paginate(data, total, filters);
  }

  canAllocate(partner: Pick<Partner, 'approvalStatus' | 'isActive'>): boolean {
    return (
      partner.isActive &&
      (ALLOCATABLE_PARTNER_STATUSES as readonly string[]).includes(partner.approvalStatus)
    );
  }

  /**
   * Module 4 ranks partners partly on distance, and distance used to be whatever someone typed —
   * error-prone, and open to being understated to make a partner rank better. When both the plant
   * and the partner have coordinates it is computed from them; a hand-entered figure is kept only
   * where that is not possible.
   */
  private async resolveDistanceKm(
    companyId: string,
    input: { latitude?: number | null; longitude?: number | null; distanceKm?: number | null },
  ): Promise<number | null | undefined> {
    if (!isUsableCoordinate(input.latitude, input.longitude)) return input.distanceKm;

    const plant = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { latitude: true, longitude: true },
    });
    const computed = roadDistanceKm(plant, {
      latitude: input.latitude ?? undefined,
      longitude: input.longitude ?? undefined,
    });
    return computed ?? input.distanceKm;
  }

  async create(actor: RequestUser, input: CreatePartnerInput): Promise<Partner> {
    assertCanWriteToCompany(actor, input.companyId);
    const partnerCode = await this.sequence.next('PARTNER');
    const distanceKm = await this.resolveDistanceKm(input.companyId, input);
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
        distanceKm,
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

    // Moving a partner's coordinates moves their distance with them.
    const movedOrRescored =
      input.latitude !== undefined || input.longitude !== undefined || input.distanceKm !== undefined;
    const distanceKm = movedOrRescored
      ? await this.resolveDistanceKm(before.companyId, {
          latitude: input.latitude ?? before.latitude,
          longitude: input.longitude ?? before.longitude,
          distanceKm: input.distanceKm ?? before.distanceKm,
        })
      : undefined;

    const partner = await this.prisma.partner.update({
      where: { id },
      data: { ...input, ...(distanceKm === undefined ? {} : { distanceKm }) },
    });
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
    // Section 13 — the partner learns where they stand, and the network owners learn that the
    // pool of allocatable partners has changed.
    await this.notifications.notify({
      event: 'PARTNER_STATUS_CHANGED',
      title:
        toStatus === 'SUSPENDED'
          ? 'Your GRID-X account has been suspended'
          : `Your GRID-X status is now ${humaniseStatus(toStatus)}`,
      body:
        reason ??
        (toStatus === 'SUSPENDED'
          ? 'No new jobs can be allocated to you until this is resolved.'
          : 'Your partner record has moved to the next stage of approval.'),
      link: '/partner',
      entityType: 'Partner',
      entityId: id,
      partnerId: id,
      channels: ['IN_APP', 'WHATSAPP'],
    });
    await this.notifications.notify({
      event: 'PARTNER_STATUS_CHANGED',
      title: `${partner.businessName} is now ${humaniseStatus(toStatus)}`,
      body: `Moved from ${humaniseStatus(partner.approvalStatus)}.${reason ? ` ${reason}` : ''}`,
      link: `/app/partners/${id}`,
      entityType: 'Partner',
      entityId: id,
      roleCodes: ['GRIDX_HEAD', 'PROCUREMENT_USER', 'OPERATIONS_HEAD'],
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

  /**
   * Module 1 — additional units for a partner who works out of more than one address.
   *
   * `PartnerLocation` was in the schema with a primary flag and coordinates and had no write path
   * at all, so a partner with two workshops could only ever be recorded as the one address on
   * their master record — and material was then despatched to whichever of them was typed in.
   */
  async addLocation(actor: RequestUser, id: string, input: z.infer<typeof partnerLocationSchema>) {
    await this.assertScope(actor, id);

    // Exactly one primary: it is the address material goes to when a job does not say otherwise.
    const existing = await this.prisma.partnerLocation.count({ where: { partnerId: id } });
    const isPrimary = input.isPrimary || existing === 0;

    const location = await this.prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.partnerLocation.updateMany({
          where: { partnerId: id, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      return tx.partnerLocation.create({ data: { partnerId: id, ...input, isPrimary } });
    });

    await this.audit.record(actor, {
      action: 'PARTNER_LOCATION_ADDED',
      entityType: 'PartnerLocation',
      entityId: location.id,
      after: { partnerId: id, label: location.label, city: location.city, isPrimary },
    });
    return location;
  }

  async listLocations(actor: RequestUser, id: string) {
    await this.assertScope(actor, id);
    return this.prisma.partnerLocation.findMany({
      where: { partnerId: id },
      orderBy: [{ isPrimary: 'desc' }, { label: 'asc' }],
    });
  }

  async removeLocation(actor: RequestUser, locationId: string) {
    const location = await this.prisma.partnerLocation.findUniqueOrThrow({
      where: { id: locationId },
      select: { partnerId: true, isPrimary: true, label: true },
    });
    await this.assertScope(actor, location.partnerId);

    const remaining = await this.prisma.partnerLocation.count({
      where: { partnerId: location.partnerId },
    });
    if (location.isPrimary && remaining > 1) {
      throw new BadRequestException(
        'Make another location primary before removing this one, so deliveries still have an address.',
      );
    }

    await this.prisma.partnerLocation.delete({ where: { id: locationId } });
    await this.audit.record(actor, {
      action: 'PARTNER_LOCATION_REMOVED',
      entityType: 'PartnerLocation',
      entityId: locationId,
      before: { partnerId: location.partnerId, label: location.label },
    });
    return { success: true };
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

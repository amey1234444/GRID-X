import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@gridx/db';
import {
  CreateComponentInput,
  Paginated,
  PaginationInput,
  approvePartnerComponentSchema,
  componentItemSchema,
  componentProcessSchema,
  createItemSchema,
  createProductSchema,
  updateComponentSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '../common/request-user';
import { paginate, paginationArgs } from '../common/pagination';
import {
  assertCanWriteToCompany,
  assertCompanyScope,
  companyWhere,
} from '../common/company-scope';

export interface ComponentFilters extends PaginationInput {
  companyId?: string;
  criticality?: string;
  primaryProcess?: string;
  productId?: string;
}

/** Module 2 — component and process master, plus the raw material items mirrored from the IMS. */
@Injectable()
export class MastersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Every component write is checked against the actor's companies (Section 4). */
  private async assertComponentScope(actor: RequestUser, componentId: string): Promise<void> {
    const component = await this.prisma.component.findUniqueOrThrow({
      where: { id: componentId },
      select: { companyId: true },
    });
    assertCompanyScope(actor, component.companyId, 'component');
  }

  async listComponents(
    actor: RequestUser,
    filters: ComponentFilters,
  ): Promise<Paginated<unknown>> {
    const where: Prisma.ComponentWhereInput = {
      ...companyWhere(actor, filters.companyId),
      ...(filters.criticality ? { criticality: filters.criticality as never } : {}),
      ...(filters.primaryProcess ? { primaryProcess: filters.primaryProcess as never } : {}),
      ...(filters.productId ? { productId: filters.productId } : {}),
      ...(filters.search
        ? {
            OR: [
              { componentCode: { contains: filters.search, mode: 'insensitive' } },
              { name: { contains: filters.search, mode: 'insensitive' } },
              { drawingNumber: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.component.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: { [filters.sortBy ?? 'componentCode']: filters.sortDir },
        include: {
          product: { select: { id: true, name: true } },
          _count: { select: { approvedPartners: true, jobs: true, drawings: true } },
        },
      }),
      this.prisma.component.count({ where }),
    ]);
    return paginate(data, total, filters);
  }

  async getComponent(actor: RequestUser, id: string) {
    const component = await this.prisma.component.findUniqueOrThrow({
      where: { id },
      include: {
        product: true,
        processes: { include: { process: true }, orderBy: { sequence: 'asc' } },
        items: { include: { item: true } },
        criticalityHistory: { orderBy: { effectiveFrom: 'desc' } },
        approvedPartners: {
          include: {
            partner: {
              select: {
                id: true,
                partnerCode: true,
                businessName: true,
                city: true,
                category: true,
                currentScore: true,
                approvalStatus: true,
              },
            },
          },
        },
        drawings: {
          include: { currentRevision: true },
        },
        inspectionPlans: { include: { characteristics: true } },
        rates: { where: { isActive: true }, include: { partner: true } },
      },
    });
    assertCompanyScope(actor, component.companyId, 'component');
    return component;
  }

  async createComponent(actor: RequestUser, input: CreateComponentInput) {
    assertCanWriteToCompany(actor, input.companyId);
    const component = await this.prisma.component.create({
      data: {
        ...input,
        criticalityHistory: {
          create: { criticality: input.criticality, reason: 'Initial classification' },
        },
      },
    });
    await this.audit.record(actor, {
      action: 'COMPONENT_CREATED',
      entityType: 'Component',
      entityId: component.id,
      companyId: component.companyId,
      after: { componentCode: component.componentCode, criticality: component.criticality },
    });
    return component;
  }

  async updateComponent(
    actor: RequestUser,
    id: string,
    input: z.infer<typeof updateComponentSchema>,
  ) {
    await this.assertComponentScope(actor, id);
    const before = await this.prisma.component.findUniqueOrThrow({ where: { id } });
    const component = await this.prisma.component.update({ where: { id }, data: input });
    if (input.criticality && input.criticality !== before.criticality) {
      await this.prisma.componentCriticality.create({
        data: {
          componentId: id,
          criticality: input.criticality,
          reason: 'Reclassified',
          approvedBy: actor.id,
        },
      });
    }
    await this.audit.record(actor, {
      action: 'COMPONENT_UPDATED',
      entityType: 'Component',
      entityId: id,
      companyId: component.companyId,
      before: { criticality: before.criticality, name: before.name },
      after: { criticality: component.criticality, name: component.name },
    });
    return component;
  }

  async setComponentProcess(
    actor: RequestUser,
    componentId: string,
    input: z.infer<typeof componentProcessSchema>,
  ) {
    await this.assertComponentScope(actor, componentId);
    const process = await this.prisma.process.findUniqueOrThrow({
      where: { code: input.processCode },
    });
    const record = await this.prisma.componentProcess.upsert({
      where: {
        componentId_processId_sequence: {
          componentId,
          processId: process.id,
          sequence: input.sequence,
        },
      },
      create: {
        componentId,
        processId: process.id,
        sequence: input.sequence,
        cycleTimeMinutes: input.cycleTimeMinutes,
        isOutsourced: input.isOutsourced,
        remarks: input.remarks,
      },
      update: {
        cycleTimeMinutes: input.cycleTimeMinutes,
        isOutsourced: input.isOutsourced,
        remarks: input.remarks,
      },
    });
    await this.audit.record(actor, {
      action: 'COMPONENT_PROCESS_SAVED',
      entityType: 'ComponentProcess',
      entityId: record.id,
    });
    return record;
  }

  async removeComponentProcess(actor: RequestUser, id: string) {
    const row = await this.prisma.componentProcess.findUniqueOrThrow({
      where: { id },
      select: { componentId: true },
    });
    await this.assertComponentScope(actor, row.componentId);
    await this.prisma.componentProcess.delete({ where: { id } });
    await this.audit.record(actor, {
      action: 'COMPONENT_PROCESS_REMOVED',
      entityType: 'ComponentProcess',
      entityId: id,
    });
    return { success: true };
  }

  async setComponentItem(
    actor: RequestUser,
    componentId: string,
    input: z.infer<typeof componentItemSchema>,
  ) {
    await this.assertComponentScope(actor, componentId);
    const record = await this.prisma.componentItem.upsert({
      where: { componentId_itemId: { componentId, itemId: input.itemId } },
      create: { componentId, ...input },
      update: { quantityPerUnit: input.quantityPerUnit, uom: input.uom },
    });
    await this.audit.record(actor, {
      action: 'COMPONENT_BOM_SAVED',
      entityType: 'ComponentItem',
      entityId: record.id,
    });
    return record;
  }

  async removeComponentItem(actor: RequestUser, id: string) {
    const row = await this.prisma.componentItem.findUniqueOrThrow({
      where: { id },
      select: { componentId: true },
    });
    await this.assertComponentScope(actor, row.componentId);
    await this.prisma.componentItem.delete({ where: { id } });
    return { success: true };
  }

  /** Approved partner list per component — required before a job can be allocated. */
  async approvePartnerForComponent(
    actor: RequestUser,
    componentId: string,
    input: z.infer<typeof approvePartnerComponentSchema>,
  ) {
    const partner = await this.prisma.partner.findUniqueOrThrow({
      where: { id: input.partnerId },
      include: { capabilities: true },
    });
    const component = await this.prisma.component.findUniqueOrThrow({ where: { id: componentId } });
    assertCompanyScope(actor, component.companyId, 'component');
    assertCompanyScope(actor, partner.companyId, 'partner');
    const capable = partner.capabilities.some(
      (capability) => capability.process === component.primaryProcess && capability.isApproved,
    );
    if (!capable) {
      throw new BadRequestException(
        `${partner.businessName} has no approved ${component.primaryProcess} capability`,
      );
    }

    const record = await this.prisma.approvedPartnerComponent.upsert({
      where: { componentId_partnerId: { componentId, partnerId: input.partnerId } },
      create: {
        componentId,
        partnerId: input.partnerId,
        approvedBy: actor.id,
        firstArticleDone: input.firstArticleDone,
        firstArticleDate: input.firstArticleDone ? new Date() : null,
        remarks: input.remarks,
      },
      update: {
        isActive: true,
        firstArticleDone: input.firstArticleDone,
        firstArticleDate: input.firstArticleDone ? new Date() : null,
        remarks: input.remarks,
      },
    });
    await this.audit.record(actor, {
      action: 'COMPONENT_PARTNER_APPROVED',
      entityType: 'ApprovedPartnerComponent',
      entityId: record.id,
      after: { componentId, partnerId: input.partnerId },
    });
    return record;
  }

  async revokePartnerForComponent(actor: RequestUser, id: string) {
    const existing = await this.prisma.approvedPartnerComponent.findUniqueOrThrow({
      where: { id },
      select: { componentId: true },
    });
    await this.assertComponentScope(actor, existing.componentId);
    const record = await this.prisma.approvedPartnerComponent.update({
      where: { id },
      data: { isActive: false },
    });
    await this.audit.record(actor, {
      action: 'COMPONENT_PARTNER_REVOKED',
      entityType: 'ApprovedPartnerComponent',
      entityId: id,
    });
    return record;
  }

  // ---- Items -------------------------------------------------------------

  async listItems(filters: PaginationInput) {
    const where: Prisma.ItemWhereInput = filters.search
      ? {
          OR: [
            { code: { contains: filters.search, mode: 'insensitive' } },
            { name: { contains: filters.search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.item.findMany({ where, ...paginationArgs(filters), orderBy: { code: 'asc' } }),
      this.prisma.item.count({ where }),
    ]);
    return paginate(data, total, filters);
  }

  async createItem(actor: RequestUser, input: z.infer<typeof createItemSchema>) {
    const item = await this.prisma.item.create({ data: input });
    await this.audit.record(actor, {
      action: 'ITEM_CREATED',
      entityType: 'Item',
      entityId: item.id,
      after: { code: item.code },
    });
    return item;
  }

  // ---- Products and processes -------------------------------------------

  async listProducts(actor: RequestUser, companyId?: string) {
    return this.prisma.product.findMany({
      where: { ...companyWhere(actor, companyId), isActive: true },
      orderBy: { code: 'asc' },
      include: { _count: { select: { components: true } } },
    });
  }

  async createProduct(actor: RequestUser, input: z.infer<typeof createProductSchema>) {
    assertCanWriteToCompany(actor, input.companyId);
    const product = await this.prisma.product.create({ data: input });
    await this.audit.record(actor, {
      action: 'PRODUCT_CREATED',
      entityType: 'Product',
      entityId: product.id,
      companyId: product.companyId,
    });
    return product;
  }

  async listProcesses() {
    return this.prisma.process.findMany({ orderBy: { name: 'asc' } });
  }

  async updateProcessRate(actor: RequestUser, id: string, standardRatePerHour: number) {
    const process = await this.prisma.process.update({
      where: { id },
      data: { standardRatePerHour },
    });
    await this.audit.record(actor, {
      action: 'PROCESS_RATE_UPDATED',
      entityType: 'Process',
      entityId: id,
      after: { standardRatePerHour },
    });
    return process;
  }
}

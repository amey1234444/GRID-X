import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@gridx/db';
import {
  Paginated,
  PaginationInput,
  createShipmentSchema,
  createVehicleSchema,
  proofOfDeliverySchema,
  updateShipmentStatusSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SequenceService } from '../audit/sequence.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestUser } from '../common/request-user';
import { paginate, paginationArgs } from '../common/pagination';
import { JobsService } from '../jobs/jobs.service';

export interface ShipmentFilters extends PaginationInput {
  status?: string;
  direction?: string;
  partnerId?: string;
}

/** Module 10 — pickups, deliveries and proof of delivery across the partner network. */
@Injectable()
export class LogisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
    private readonly notifications: NotificationsService,
    private readonly jobs: JobsService,
  ) {}

  async list(actor: RequestUser, filters: ShipmentFilters): Promise<Paginated<unknown>> {
    const partnerScope: Prisma.ShipmentWhereInput = actor.partnerId
      ? { OR: [{ fromPartnerId: actor.partnerId }, { toPartnerId: actor.partnerId }] }
      : filters.partnerId
        ? { OR: [{ fromPartnerId: filters.partnerId }, { toPartnerId: filters.partnerId }] }
        : {};
    const where: Prisma.ShipmentWhereInput = {
      ...partnerScope,
      ...(filters.status ? { status: filters.status as Prisma.EnumShipmentStatusFilter } : {}),
      ...(filters.direction
        ? { direction: filters.direction as Prisma.EnumShipmentDirectionFilter }
        : {}),
      ...(filters.search
        ? { shipmentNumber: { contains: filters.search, mode: 'insensitive' } }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: { plannedPickupAt: 'desc' },
        include: {
          fromPartner: { select: { id: true, businessName: true, city: true } },
          toPartner: { select: { id: true, businessName: true, city: true } },
          vehicle: true,
          items: true,
          proofOfDelivery: true,
        },
      }),
      this.prisma.shipment.count({ where }),
    ]);
    return paginate(data, total, filters);
  }

  async findOne(actor: RequestUser, id: string) {
    const shipment = await this.prisma.shipment.findUniqueOrThrow({
      where: { id },
      include: {
        fromPartner: { select: { id: true, businessName: true, city: true, phone: true } },
        toPartner: { select: { id: true, businessName: true, city: true, phone: true } },
        vehicle: true,
        items: { include: { job: { select: { id: true, jobNumber: true } } } },
        proofOfDelivery: true,
      },
    });
    if (
      actor.partnerId &&
      shipment.fromPartnerId !== actor.partnerId &&
      shipment.toPartnerId !== actor.partnerId
    ) {
      throw new ForbiddenException('This shipment belongs to another partner');
    }
    return shipment;
  }

  async create(actor: RequestUser, input: z.infer<typeof createShipmentSchema>) {
    const shipmentNumber = await this.sequence.next('SHIPMENT');
    const shipment = await this.prisma.shipment.create({
      data: {
        shipmentNumber,
        companyId: input.companyId,
        direction: input.direction,
        fromPartnerId: input.fromPartnerId,
        toPartnerId: input.toPartnerId,
        pickupLocation: input.pickupLocation,
        deliveryLocation: input.deliveryLocation,
        materialType: input.materialType,
        weightKg: input.weightKg,
        vehicleId: input.vehicleId,
        driverName: input.driverName,
        driverPhone: input.driverPhone,
        plannedPickupAt: input.plannedPickupAt,
        expectedDeliveryAt: input.expectedDeliveryAt,
        transportCost: input.transportCost,
        remarks: input.remarks,
        createdById: actor.id,
        items: { create: input.items },
      },
      include: { items: true },
    });
    await this.audit.record(actor, {
      action: 'SHIPMENT_CREATED',
      entityType: 'Shipment',
      entityId: shipment.id,
      companyId: input.companyId,
      after: { shipmentNumber, direction: input.direction, weightKg: input.weightKg },
    });
    return shipment;
  }

  /** Status changes drive job dispatch/receipt so the network view always matches reality. */
  async updateStatus(
    actor: RequestUser,
    id: string,
    input: z.infer<typeof updateShipmentStatusSchema>,
  ) {
    const shipment = await this.prisma.shipment.update({
      where: { id },
      data: {
        status: input.status,
        actualPickupAt:
          input.actualPickupAt ?? (input.status === 'PICKED_UP' ? new Date() : undefined),
        actualDeliveryAt:
          input.actualDeliveryAt ?? (input.status === 'DELIVERED' ? new Date() : undefined),
        remarks: input.remarks,
      },
      include: { items: true },
    });

    const jobIds = shipment.items
      .map((item) => item.jobId)
      .filter((jobId): jobId is string => Boolean(jobId));
    if (jobIds.length > 0 && shipment.direction === 'PARTNER_TO_OSWAR') {
      for (const jobId of jobIds) {
        const job = await this.prisma.gridJob.findUnique({ where: { id: jobId } });
        if (!job) continue;
        if (input.status === 'PICKED_UP' && job.status === 'QUALITY_ACCEPTED') {
          await this.jobs.transition(actor, jobId, 'DISPATCHED', `Shipment ${shipment.shipmentNumber}`);
        }
        if (input.status === 'DELIVERED' && job.status === 'DISPATCHED') {
          await this.jobs.transition(actor, jobId, 'RECEIVED', `Shipment ${shipment.shipmentNumber}`);
        }
      }
    }

    await this.notifications.notify({
      event: input.status === 'DELIVERED' ? 'SHIPMENT_RECEIVED' : 'SHIPMENT_DISPATCHED',
      title: `Shipment ${shipment.shipmentNumber} ${input.status.replace(/_/g, ' ').toLowerCase()}`,
      body: `${shipment.pickupLocation} → ${shipment.deliveryLocation}`,
      link: `/control/logistics/${id}`,
      entityType: 'Shipment',
      entityId: id,
      roleCodes: ['LOGISTICS_COORDINATOR', 'OPERATIONS_HEAD'],
      partnerId: shipment.fromPartnerId ?? shipment.toPartnerId ?? undefined,
    });
    await this.audit.record(actor, {
      action: 'SHIPMENT_STATUS_UPDATED',
      entityType: 'Shipment',
      entityId: id,
      after: { status: input.status },
    });
    return shipment;
  }

  async recordProofOfDelivery(
    actor: RequestUser,
    id: string,
    input: z.infer<typeof proofOfDeliverySchema>,
  ) {
    const pod = await this.prisma.proofOfDelivery.upsert({
      where: { shipmentId: id },
      create: {
        shipmentId: id,
        receivedBy: input.receivedBy,
        receivedAt: input.receivedAt ?? new Date(),
        signatureFileId: input.signatureFileId,
        photoFileId: input.photoFileId,
        remarks: input.remarks,
      },
      update: {
        receivedBy: input.receivedBy,
        receivedAt: input.receivedAt ?? new Date(),
        signatureFileId: input.signatureFileId,
        photoFileId: input.photoFileId,
        remarks: input.remarks,
      },
    });
    await this.prisma.shipment.update({
      where: { id },
      data: { status: 'DELIVERED', actualDeliveryAt: input.receivedAt ?? new Date() },
    });
    await this.audit.record(actor, {
      action: 'PROOF_OF_DELIVERY_RECORDED',
      entityType: 'Shipment',
      entityId: id,
      after: { receivedBy: input.receivedBy },
    });
    return pod;
  }

  async listVehicles() {
    return this.prisma.vehicle.findMany({ where: { isActive: true }, orderBy: { registrationNo: 'asc' } });
  }

  async createVehicle(actor: RequestUser, input: z.infer<typeof createVehicleSchema>) {
    const vehicle = await this.prisma.vehicle.create({ data: input });
    await this.audit.record(actor, {
      action: 'VEHICLE_CREATED',
      entityType: 'Vehicle',
      entityId: vehicle.id,
      after: { registrationNo: vehicle.registrationNo },
    });
    return vehicle;
  }
}

import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@gridx/db';
import {
  DRAWING_STATUS_TRANSITIONS,
  DrawingSummary,
  Paginated,
  PaginationInput,
  acknowledgeRevisionSchema,
  createDrawingSchema,
  createRevisionSchema,
  engineeringChangeSchema,
  grantDrawingAccessSchema,
  releaseRevisionSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SequenceService } from '../audit/sequence.service';
import { RequestUser } from '../common/request-user';
import { paginate, paginationArgs } from '../common/pagination';
import { assertTransition } from '../common/workflow';
import { StorageService } from '../files/storage.service';

export interface DrawingAccessContext {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Module 3 — controlled drawing distribution. Partners never browse drawings freely: access is
 * granted per revision, every view is logged, and superseded revisions are watermarked as obsolete.
 */
@Injectable()
export class DrawingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
    private readonly storage: StorageService,
  ) {}

  async list(
    actor: RequestUser,
    filters: PaginationInput & { componentId?: string; status?: string },
  ): Promise<Paginated<DrawingSummary>> {
    const where: Prisma.DrawingWhereInput = {
      ...(filters.componentId ? { componentId: filters.componentId } : {}),
      ...(filters.search
        ? {
            OR: [
              { drawingNumber: { contains: filters.search, mode: 'insensitive' } },
              { title: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(actor.userType === 'PARTNER'
        ? {
            revisions: {
              some: {
                status: 'RELEASED',
                access: { some: { partnerId: actor.partnerId ?? '', revokedAt: null } },
              },
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.drawing.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: { drawingNumber: 'asc' },
        include: {
          component: { select: { componentCode: true, name: true } },
          currentRevision: { include: { _count: { select: { acknowledgements: true } } } },
          _count: { select: { revisions: true } },
        },
      }),
      this.prisma.drawing.count({ where }),
    ]);

    const partnerCount = await this.prisma.partner.count({ where: { isActive: true } });
    const data: DrawingSummary[] = rows.map((drawing) => ({
      id: drawing.id,
      drawingNumber: drawing.drawingNumber,
      title: drawing.title,
      componentCode: drawing.component?.componentCode ?? null,
      currentRevisionCode: drawing.currentRevision?.revisionCode ?? null,
      status: drawing.currentRevision?.status ?? null,
      revisionCount: drawing._count.revisions,
      releasedAt: drawing.currentRevision?.releasedAt?.toISOString() ?? null,
      pendingAcknowledgements: drawing.currentRevision
        ? Math.max(0, partnerCount - drawing.currentRevision._count.acknowledgements)
        : 0,
    }));
    return paginate(data, total, filters);
  }

  async getDrawing(actor: RequestUser, id: string) {
    const drawing = await this.prisma.drawing.findUniqueOrThrow({
      where: { id },
      include: {
        component: true,
        currentRevision: true,
        revisions: {
          orderBy: { createdAt: 'desc' },
          include: {
            file: true,
            createdBy: { select: { id: true, name: true } },
            approvedBy: { select: { id: true, name: true } },
            access: { include: { partner: { select: { id: true, businessName: true } } } },
            acknowledgements: {
              include: { partner: { select: { id: true, businessName: true } } },
            },
          },
        },
      },
    });

    if (actor.userType === 'PARTNER') {
      const visible = drawing.revisions.filter(
        (revision) =>
          revision.status === 'RELEASED' &&
          revision.access.some(
            (access) => access.partnerId === actor.partnerId && access.revokedAt === null,
          ),
      );
      if (visible.length === 0) throw new ForbiddenException('No released revision shared with you');
      return { ...drawing, revisions: visible };
    }
    return drawing;
  }

  async createDrawing(actor: RequestUser, input: z.infer<typeof createDrawingSchema>) {
    const drawing = await this.prisma.drawing.create({ data: input });
    await this.audit.record(actor, {
      action: 'DRAWING_CREATED',
      entityType: 'Drawing',
      entityId: drawing.id,
      after: { drawingNumber: drawing.drawingNumber },
    });
    return drawing;
  }

  async createRevision(
    actor: RequestUser,
    drawingId: string,
    input: z.infer<typeof createRevisionSchema>,
  ) {
    const existing = await this.prisma.drawingRevision.findFirst({
      where: { drawingId, revisionCode: input.revisionCode },
    });
    if (existing) throw new BadRequestException('That revision code already exists');

    const highest = await this.prisma.drawingRevision.aggregate({
      where: { drawingId },
      _max: { revisionNo: true },
    });
    const revision = await this.prisma.drawingRevision.create({
      data: {
        drawingId,
        revisionCode: input.revisionCode,
        revisionNo: (highest._max.revisionNo ?? 0) + 1,
        fileId: input.fileId,
        changeNote: input.changeNote,
        issueDate: input.issueDate,
        expiryDate: input.expiryDate,
        createdById: actor.id,
      },
    });
    await this.audit.record(actor, {
      action: 'DRAWING_REVISION_CREATED',
      entityType: 'DrawingRevision',
      entityId: revision.id,
      after: { drawingId, revisionCode: revision.revisionCode },
    });
    return revision;
  }

  async submitRevisionForReview(actor: RequestUser, revisionId: string) {
    const revision = await this.prisma.drawingRevision.findUniqueOrThrow({
      where: { id: revisionId },
    });
    assertTransition(
      'Drawing revision',
      revision.status,
      'UNDER_REVIEW',
      DRAWING_STATUS_TRANSITIONS,
    );
    const updated = await this.prisma.drawingRevision.update({
      where: { id: revisionId },
      data: { status: 'UNDER_REVIEW' },
    });
    await this.audit.record(actor, {
      action: 'DRAWING_REVISION_SUBMITTED',
      entityType: 'DrawingRevision',
      entityId: revisionId,
    });
    return updated;
  }

  async approveRevision(actor: RequestUser, revisionId: string) {
    const revision = await this.prisma.drawingRevision.findUniqueOrThrow({
      where: { id: revisionId },
    });
    assertTransition('Drawing revision', revision.status, 'APPROVED', DRAWING_STATUS_TRANSITIONS);
    const updated = await this.prisma.drawingRevision.update({
      where: { id: revisionId },
      data: { status: 'APPROVED', approvedById: actor.id, approvedAt: new Date() },
    });
    await this.audit.record(actor, {
      action: 'DRAWING_REVISION_APPROVED',
      entityType: 'DrawingRevision',
      entityId: revisionId,
    });
    return updated;
  }

  /** Releasing a revision supersedes the previous one so no uncontrolled drawing stays in use. */
  async releaseRevision(
    actor: RequestUser,
    revisionId: string,
    input: z.infer<typeof releaseRevisionSchema>,
  ) {
    const revision = await this.prisma.drawingRevision.findUniqueOrThrow({
      where: { id: revisionId },
      include: { drawing: true },
    });
    assertTransition('Drawing revision', revision.status, 'RELEASED', DRAWING_STATUS_TRANSITIONS);

    const released = await this.prisma.$transaction(async (tx) => {
      await tx.drawingRevision.updateMany({
        where: {
          drawingId: revision.drawingId,
          id: { not: revisionId },
          status: 'RELEASED',
        },
        data: { status: 'SUPERSEDED', supersededAt: new Date() },
      });
      const updated = await tx.drawingRevision.update({
        where: { id: revisionId },
        data: {
          status: 'RELEASED',
          releasedAt: new Date(),
          issueDate: input.issueDate ?? new Date(),
          expiryDate: input.expiryDate,
        },
      });
      await tx.drawing.update({
        where: { id: revision.drawingId },
        data: { currentRevisionId: revisionId },
      });
      return updated;
    });

    await this.audit.record(actor, {
      action: 'DRAWING_REVISION_RELEASED',
      entityType: 'DrawingRevision',
      entityId: revisionId,
      after: { drawingNumber: revision.drawing.drawingNumber, revision: revision.revisionCode },
    });
    return released;
  }

  /** Archiving withdraws a revision from the shop floor and revokes every partner's access. */
  async obsoleteRevision(actor: RequestUser, revisionId: string, reason: string) {
    const revision = await this.prisma.drawingRevision.findUniqueOrThrow({
      where: { id: revisionId },
    });
    assertTransition('Drawing revision', revision.status, 'ARCHIVED', DRAWING_STATUS_TRANSITIONS);
    const updated = await this.prisma.drawingRevision.update({
      where: { id: revisionId },
      data: { status: 'ARCHIVED', supersededAt: revision.supersededAt ?? new Date() },
    });
    await this.prisma.drawingAccess.updateMany({
      where: { revisionId, revokedAt: null },
      data: { revokedAt: new Date(), revokedBy: actor.id },
    });
    await this.audit.record(actor, {
      action: 'DRAWING_REVISION_OBSOLETED',
      entityType: 'DrawingRevision',
      entityId: revisionId,
      after: { reason },
    });
    return updated;
  }

  async grantAccess(
    actor: RequestUser,
    revisionId: string,
    input: z.infer<typeof grantDrawingAccessSchema>,
  ) {
    const revision = await this.prisma.drawingRevision.findUniqueOrThrow({
      where: { id: revisionId },
    });
    if (revision.status !== 'RELEASED') {
      throw new BadRequestException('Only released revisions can be shared with partners');
    }
    const existing = await this.prisma.drawingAccess.findFirst({
      where: { revisionId, partnerId: input.partnerId, jobId: input.jobId ?? null },
    });
    const access = existing
      ? await this.prisma.drawingAccess.update({
          where: { id: existing.id },
          data: {
            revokedAt: null,
            revokedBy: null,
            expiresAt: input.expiresAt,
            mode: input.mode,
          },
        })
      : await this.prisma.drawingAccess.create({
          data: {
            revisionId,
            partnerId: input.partnerId,
            jobId: input.jobId,
            grantedBy: actor.id,
            expiresAt: input.expiresAt,
            mode: input.mode,
          },
        });
    await this.prisma.drawingAccessLog.create({
      data: {
        revisionId,
        partnerId: input.partnerId,
        userId: actor.id,
        jobId: input.jobId,
        event: 'GRANTED',
      },
    });
    await this.audit.record(actor, {
      action: 'DRAWING_ACCESS_GRANTED',
      entityType: 'DrawingAccess',
      entityId: access.id,
      after: { revisionId, partnerId: input.partnerId },
    });
    return access;
  }

  async revokeAccess(actor: RequestUser, accessId: string) {
    const access = await this.prisma.drawingAccess.update({
      where: { id: accessId },
      data: { revokedAt: new Date(), revokedBy: actor.id },
    });
    await this.prisma.drawingAccessLog.create({
      data: {
        revisionId: access.revisionId,
        partnerId: access.partnerId,
        userId: actor.id,
        jobId: access.jobId,
        event: 'REVOKED',
      },
    });
    await this.audit.record(actor, {
      action: 'DRAWING_ACCESS_REVOKED',
      entityType: 'DrawingAccess',
      entityId: accessId,
    });
    return access;
  }

  /** Every partner view/download is recorded — this is the drawing access log of Section 18. */
  async viewRevision(
    actor: RequestUser,
    revisionId: string,
    action: 'VIEWED' | 'DOWNLOADED',
    context: DrawingAccessContext,
  ): Promise<{ url: string; revisionCode: string; watermark: string }> {
    const revision = await this.prisma.drawingRevision.findUniqueOrThrow({
      where: { id: revisionId },
      include: { drawing: true, file: true },
    });
    if (!revision.file) throw new BadRequestException('This revision has no drawing file');

    if (actor.userType === 'PARTNER') {
      const access = await this.prisma.drawingAccess.findFirst({
        where: {
          revisionId,
          partnerId: actor.partnerId ?? '',
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });
      if (!access) throw new ForbiddenException('This drawing revision is not shared with you');
      if (revision.status !== 'RELEASED') {
        throw new ForbiddenException('This revision is no longer valid for production');
      }
      if (action === 'DOWNLOADED' && access.mode !== 'VIEW_AND_DOWNLOAD') {
        throw new ForbiddenException('Download is not permitted for this drawing');
      }
    }

    await this.prisma.drawingAccessLog.create({
      data: {
        revisionId,
        userId: actor.id,
        partnerId: actor.partnerId,
        event: action,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      },
    });

    return {
      url: await this.storage.signedUrl(revision.file.key),
      revisionCode: revision.revisionCode,
      watermark:
        revision.status === 'RELEASED'
          ? `${revision.drawing.drawingNumber} Rev ${revision.revisionCode} — ${actor.name}`
          : `OBSOLETE — DO NOT USE`,
    };
  }

  async acknowledge(
    actor: RequestUser,
    revisionId: string,
    input: z.infer<typeof acknowledgeRevisionSchema>,
  ) {
    if (!actor.partnerId) throw new ForbiddenException('Only partner users acknowledge drawings');
    const acknowledgement = await this.prisma.drawingAcknowledgement.upsert({
      where: { revisionId_partnerId: { revisionId, partnerId: actor.partnerId } },
      create: {
        revisionId,
        partnerId: actor.partnerId,
        acknowledgedById: actor.id,
        remarks: input.remarks,
      },
      update: { acknowledgedAt: new Date(), remarks: input.remarks },
    });
    await this.audit.record(actor, {
      action: 'DRAWING_ACKNOWLEDGED',
      entityType: 'DrawingAcknowledgement',
      entityId: acknowledgement.id,
      after: { revisionId },
    });
    return acknowledgement;
  }

  async accessLog(revisionId: string) {
    return this.prisma.drawingAccessLog.findMany({
      where: { revisionId },
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        user: { select: { id: true, name: true } },
        partner: { select: { id: true, businessName: true } },
      },
    });
  }

  // ---- Engineering changes ----------------------------------------------

  async listEngineeringChanges(filters: PaginationInput) {
    const [data, total] = await Promise.all([
      this.prisma.engineeringChange.findMany({
        ...paginationArgs(filters),
        orderBy: { createdAt: 'desc' },
        include: {
          drawing: { select: { id: true, drawingNumber: true, title: true } },
          revision: { select: { id: true, revisionCode: true, status: true } },
          raisedBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.engineeringChange.count(),
    ]);
    return paginate(data, total, filters);
  }

  async createEngineeringChange(
    actor: RequestUser,
    input: z.infer<typeof engineeringChangeSchema>,
  ) {
    const ecNumber = await this.sequence.next('EC');
    const change = await this.prisma.engineeringChange.create({
      data: { ecNumber, raisedById: actor.id, ...input },
    });
    await this.audit.record(actor, {
      action: 'ENGINEERING_CHANGE_RAISED',
      entityType: 'EngineeringChange',
      entityId: change.id,
      after: { ecNumber, impact: change.impact },
    });
    return change;
  }

  async decideEngineeringChange(
    actor: RequestUser,
    id: string,
    status: 'APPROVED' | 'REJECTED' | 'IMPLEMENTED',
    note?: string,
  ) {
    const change = await this.prisma.engineeringChange.update({
      where: { id },
      data: {
        status,
        approvedById: status === 'APPROVED' ? actor.id : undefined,
        approvedAt: status === 'APPROVED' ? new Date() : undefined,
        implementedAt: status === 'IMPLEMENTED' ? new Date() : undefined,
        decisionNote: note,
      },
    });
    await this.audit.record(actor, {
      action: `ENGINEERING_CHANGE_${status}`,
      entityType: 'EngineeringChange',
      entityId: id,
      after: { status, note: note ?? null },
    });
    return change;
  }
}

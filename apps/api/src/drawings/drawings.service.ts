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
import {
  allowedCompanyIds,
  assertCanWriteToCompany,
  assertCompanyScope,
  companyWhere,
} from '../common/company-scope';
import { StorageService } from '../files/storage.service';
import { NotificationsService } from '../notifications/notifications.service';

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
    private readonly notifications: NotificationsService,
  ) {}

  async list(
    actor: RequestUser,
    filters: PaginationInput & { componentId?: string; status?: string },
  ): Promise<Paginated<DrawingSummary>> {
    const where: Prisma.DrawingWhereInput = {
      ...companyWhere(actor),
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
      currentRevisionId: drawing.currentRevision?.id ?? null,
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
    assertCompanyScope(actor, drawing.companyId, 'drawing');
    return drawing;
  }

  async createDrawing(actor: RequestUser, input: z.infer<typeof createDrawingSchema>) {
    assertCanWriteToCompany(actor, input.companyId);
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

    // Revisions of this drawing that are live right now, with the partners working to them and
    // the open jobs pointing at them. Everything below moves this population onto the new revision.
    const superseded = await this.prisma.drawingRevision.findMany({
      where: { drawingId: revision.drawingId, id: { not: revisionId }, status: 'RELEASED' },
      select: {
        id: true,
        revisionCode: true,
        access: { where: { revokedAt: null }, select: { partnerId: true, jobId: true, mode: true } },
        jobs: {
          where: { status: { notIn: ['CLOSED', 'CANCELLED', 'RECEIVED'] } },
          select: { id: true, jobNumber: true, partnerId: true },
        },
      },
    });

    const { released, carriedJobs, carriedPartners } = await this.prisma.$transaction(
      async (tx) => {
        const now = new Date();
        await tx.drawingRevision.updateMany({
          where: { drawingId: revision.drawingId, id: { not: revisionId }, status: 'RELEASED' },
          data: { status: 'SUPERSEDED', supersededAt: now },
        });
        const updated = await tx.drawingRevision.update({
          where: { id: revisionId },
          data: {
            status: 'RELEASED',
            releasedAt: now,
            issueDate: input.issueDate ?? now,
            expiryDate: input.expiryDate,
          },
        });
        await tx.drawing.update({
          where: { id: revision.drawingId },
          data: { currentRevisionId: revisionId },
        });

        // Carry every live access grant across, so a partner is never left holding a revision the
        // viewer will refuse. The old grants are revoked in the same breath.
        const partnerIds = new Set<string>();
        for (const old of superseded) {
          for (const grant of old.access) {
            partnerIds.add(grant.partnerId);
            // A nullable jobId makes the compound key unusable for upsert — Postgres treats NULLs
            // as distinct — so match explicitly, the same way grantAccess does.
            const existing = await tx.drawingAccess.findFirst({
              where: { revisionId, partnerId: grant.partnerId, jobId: grant.jobId },
            });
            if (existing) {
              await tx.drawingAccess.update({
                where: { id: existing.id },
                data: { revokedAt: null, revokedBy: null, mode: grant.mode },
              });
            } else {
              await tx.drawingAccess.create({
                data: {
                  revisionId,
                  partnerId: grant.partnerId,
                  jobId: grant.jobId,
                  mode: grant.mode,
                  grantedBy: actor.id,
                },
              });
            }
            await tx.drawingAccessLog.create({
              data: {
                revisionId,
                partnerId: grant.partnerId,
                userId: actor.id,
                jobId: grant.jobId,
                event: 'GRANTED',
              },
            });
          }
          await tx.drawingAccess.updateMany({
            where: { revisionId: old.id, revokedAt: null },
            data: { revokedAt: now, revokedBy: actor.id },
          });
        }

        // Roll open jobs onto the new revision. Without this they keep pointing at a superseded
        // one and the partner's next drawing open is refused with no explanation.
        const jobs = superseded.flatMap((old) => old.jobs);
        if (jobs.length > 0) {
          await tx.gridJob.updateMany({
            where: { id: { in: jobs.map((job) => job.id) } },
            data: { drawingRevisionId: revisionId },
          });
        }
        for (const job of jobs) {
          if (job.partnerId) partnerIds.add(job.partnerId);
        }

        return { released: updated, carriedJobs: jobs, carriedPartners: [...partnerIds] };
      },
    );

    // Section 13 — everyone working to the old revision hears about the change, and has to
    // acknowledge the new one before the drawing counts as controlled again (Module 3).
    const changeSummary = superseded.map((old) => old.revisionCode).join(', ');
    for (const partnerId of input.notifyPartners ? carriedPartners : []) {
      const jobsForPartner = carriedJobs.filter((job) => job.partnerId === partnerId);
      await this.notifications.notify({
        event: 'DRAWING_REVISION_CHANGED',
        title: `${revision.drawing.drawingNumber} is now at revision ${revision.revisionCode}`,
        body: [
          changeSummary
            ? `Revision ${changeSummary} is superseded and must not be used.`
            : 'A new revision has been released.',
          jobsForPartner.length > 0
            ? `Affected job(s): ${jobsForPartner.map((job) => job.jobNumber).join(', ')}.`
            : null,
          revision.changeNote,
          'Open the drawing and acknowledge the new revision before continuing production.',
        ]
          .filter(Boolean)
          .join(' '),
        link: '/partner/drawings',
        entityType: 'DrawingRevision',
        entityId: revisionId,
        partnerId,
        channels: ['IN_APP', 'WHATSAPP'],
      });
    }

    if (carriedJobs.length > 0) {
      await this.notifications.notify({
        event: 'DRAWING_REVISION_CHANGED',
        title: `${carriedJobs.length} open job(s) moved to ${revision.drawing.drawingNumber} rev ${revision.revisionCode}`,
        body: `Jobs ${carriedJobs.map((job) => job.jobNumber).join(', ')} now reference the new revision. Confirm partners have acknowledged it.`,
        link: '/app/engineering/drawings',
        entityType: 'DrawingRevision',
        entityId: revisionId,
        roleCodes: ['ENGINEERING_USER', 'OPERATIONS_HEAD', 'GRIDX_HEAD'],
      });
    }

    await this.audit.record(actor, {
      action: 'DRAWING_REVISION_RELEASED',
      entityType: 'DrawingRevision',
      entityId: revisionId,
      after: {
        drawingNumber: revision.drawing.drawingNumber,
        revision: revision.revisionCode,
        supersededRevisions: superseded.map((old) => old.revisionCode),
        jobsRolledForward: carriedJobs.map((job) => job.jobNumber),
        partnersNotified: carriedPartners.length,
      },
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

  async accessLog(actor: RequestUser, revisionId: string) {
    const revision = await this.prisma.drawingRevision.findUniqueOrThrow({
      where: { id: revisionId },
      select: { drawing: { select: { companyId: true } } },
    });
    assertCompanyScope(actor, revision.drawing.companyId, 'drawing');
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

  async listEngineeringChanges(actor: RequestUser, filters: PaginationInput) {
    const ids = allowedCompanyIds(actor);
    const where = ids ? { drawing: { companyId: { in: ids } } } : {};
    const [data, total] = await Promise.all([
      this.prisma.engineeringChange.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: { createdAt: 'desc' },
        include: {
          drawing: { select: { id: true, drawingNumber: true, title: true } },
          revision: { select: { id: true, revisionCode: true, status: true } },
          raisedBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.engineeringChange.count({ where }),
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

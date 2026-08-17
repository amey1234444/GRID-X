import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

/**
 * Section 13 — background jobs that raise the documented alerts and escalations:
 * unacknowledged material, overdue milestones, delayed inspections, expiring documents
 * and calibration due dates.
 */
@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async runHourlyAlerts(): Promise<void> {
    await Promise.all([
      this.alertPendingJobAcceptance(),
      this.alertUnacknowledgedMaterial(),
      this.alertDelayedInspections(),
    ]);
  }

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async runDailyAlerts(): Promise<void> {
    await Promise.all([
      this.alertOverdueMilestones(),
      this.alertExpiringDocuments(),
      this.alertCalibrationDue(),
    ]);
  }

  async alertPendingJobAcceptance(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
    const jobs = await this.prisma.gridJob.findMany({
      where: { status: 'AWAITING_PARTNER_ACCEPTANCE', updatedAt: { lt: cutoff } },
      select: { id: true, jobNumber: true, partnerId: true },
    });
    for (const job of jobs) {
      if (!job.partnerId) continue;
      await this.notifications.notify({
        event: 'JOB_ACCEPTANCE_PENDING',
        title: `Job ${job.jobNumber} is still awaiting your acceptance`,
        body: 'Please accept or decline this job so production planning can proceed.',
        link: `/partner/jobs/${job.id}`,
        entityType: 'GridJob',
        entityId: job.id,
        partnerId: job.partnerId,
        channels: ['IN_APP', 'WHATSAPP'],
      });
    }
    return jobs.length;
  }

  async alertUnacknowledgedMaterial(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
    const issues = await this.prisma.materialIssue.findMany({
      where: { status: 'ISSUED', issueDate: { lt: cutoff } },
      select: { id: true, challanNumber: true, partnerId: true, jobId: true },
    });
    for (const issue of issues) {
      await this.notifications.notify({
        event: 'MATERIAL_RECEIPT_NOT_ACKNOWLEDGED',
        title: `Confirm material receipt for challan ${issue.challanNumber}`,
        body: 'Material was issued more than 24 hours ago and is not yet acknowledged.',
        link: `/partner/material/${issue.id}`,
        entityType: 'MaterialIssue',
        entityId: issue.id,
        partnerId: issue.partnerId,
        channels: ['IN_APP', 'WHATSAPP'],
      });
      await this.notifications.notify({
        event: 'MATERIAL_RECEIPT_NOT_ACKNOWLEDGED',
        title: `Challan ${issue.challanNumber} not acknowledged`,
        body: 'The partner has not confirmed material receipt within 24 hours.',
        link: `/control/materials/issues/${issue.id}`,
        entityType: 'MaterialIssue',
        entityId: issue.id,
        roleCodes: ['STORES_USER', 'OPERATIONS_HEAD'],
      });
    }
    return issues.length;
  }

  async alertOverdueMilestones(): Promise<number> {
    const now = new Date();
    const jobs = await this.prisma.gridJob.findMany({
      where: {
        dueDate: { lt: now },
        status: { in: ['ACCEPTED', 'MATERIAL_ISSUED', 'IN_PRODUCTION', 'REWORK'] },
      },
      select: { id: true, jobNumber: true, partnerId: true, dueDate: true },
    });
    for (const job of jobs) {
      await this.notifications.notify({
        event: 'JOB_MILESTONE_OVERDUE',
        title: `Job ${job.jobNumber} is past its due date`,
        body: 'Update the production milestone or report a delay with the reason.',
        link: `/partner/jobs/${job.id}`,
        entityType: 'GridJob',
        entityId: job.id,
        partnerId: job.partnerId ?? undefined,
        channels: ['IN_APP', 'WHATSAPP'],
      });
      await this.notifications.notify({
        event: 'JOB_MILESTONE_OVERDUE',
        title: `Job ${job.jobNumber} is delayed`,
        body: 'This job has crossed its committed due date.',
        link: `/control/production/jobs/${job.id}`,
        entityType: 'GridJob',
        entityId: job.id,
        roleCodes: ['OPERATIONS_HEAD', 'GRIDX_HEAD'],
      });
    }
    return jobs.length;
  }

  async alertDelayedInspections(): Promise<number> {
    const cutoff = new Date(Date.now() - 48 * 3600 * 1000);
    const inspections = await this.prisma.inspection.findMany({
      where: { status: { in: ['REQUESTED', 'ASSIGNED'] }, requestedAt: { lt: cutoff } },
      select: { id: true, inspectionNumber: true, inspectorId: true },
    });
    for (const inspection of inspections) {
      await this.notifications.notify({
        event: 'INSPECTION_DELAYED',
        title: `Inspection ${inspection.inspectionNumber} is pending for more than 48 hours`,
        body: 'Partner production is blocked until this inspection is completed.',
        link: `/inspector/inspections/${inspection.id}`,
        entityType: 'Inspection',
        entityId: inspection.id,
        userIds: inspection.inspectorId ? [inspection.inspectorId] : undefined,
        roleCodes: inspection.inspectorId ? undefined : ['QUALITY_INSPECTOR'],
      });
    }
    return inspections.length;
  }

  async alertExpiringDocuments(): Promise<number> {
    const soon = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const documents = await this.prisma.partnerDocument.findMany({
      where: { expiryDate: { not: null, lte: soon, gte: new Date() } },
      include: { partner: { select: { id: true, businessName: true } } },
    });
    for (const document of documents) {
      await this.notifications.notify({
        event: 'COMPLIANCE_DOCUMENT_EXPIRING',
        title: `${document.type} expiring for ${document.partner.businessName}`,
        body: `The document expires on ${document.expiryDate?.toDateString()}. Please renew it.`,
        link: `/control/partners/${document.partnerId}`,
        entityType: 'PartnerDocument',
        entityId: document.id,
        partnerId: document.partnerId,
        roleCodes: ['PROCUREMENT_USER', 'GRIDX_HEAD'],
      });
    }
    return documents.length;
  }

  async alertCalibrationDue(): Promise<number> {
    const soon = new Date(Date.now() + 14 * 24 * 3600 * 1000);
    const tools = await this.prisma.tool.findMany({
      where: { calibrationRequired: true, nextCalibrationDue: { not: null, lte: soon } },
      select: { id: true, toolCode: true, description: true, currentPartnerId: true },
    });
    for (const tool of tools) {
      await this.notifications.notify({
        event: 'FIXTURE_CALIBRATION_DUE',
        title: `Calibration due for ${tool.toolCode}`,
        body: `${tool.description} requires calibration.`,
        link: `/control/tooling/${tool.id}`,
        entityType: 'Tool',
        entityId: tool.id,
        roleCodes: ['QUALITY_INSPECTOR', 'STORES_USER'],
        partnerId: tool.currentPartnerId ?? undefined,
      });
    }
    return tools.length;
  }
}

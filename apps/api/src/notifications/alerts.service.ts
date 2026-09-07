import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SchedulerLockService } from '../common/scheduler-lock.service';
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
    private readonly locks: SchedulerLockService,
  ) {}

  // Claimed before running: on more than one instance these would otherwise alert partners two or
  // three times for the same job (Section 18 — scalability).
  @Cron(CronExpression.EVERY_HOUR, { name: 'hourly-alerts' })
  async runHourlyAlerts(): Promise<void> {
    await this.locks.runExclusively('hourly-alerts', 600, async () => {
      await Promise.all([
        this.alertPendingJobAcceptance(),
        this.alertUnacknowledgedMaterial(),
        this.alertDelayedInspections(),
      ]);
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_7AM, { name: 'daily-alerts' })
  async runDailyAlerts(): Promise<void> {
    await this.locks.runExclusively('daily-alerts', 900, async () => {
      await Promise.all([
        this.alertOverdueMilestones(),
        this.alertExpiringDocuments(),
        this.alertCalibrationDue(),
        this.alertPendingReconciliation(),
        this.alertToolsNotReturned(),
        this.alertDamagedTools(),
        this.alertUnauthorisedToolCustody(),
        this.alertCorrectiveActionsDue(),
      ]);
    });
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

  /**
   * Module 6 — "pending reconciliation alerts". Material stays OSWAR's asset while it sits with a
   * partner, so an unreconciled line on a finished job is unaccounted stock.
   */
  async alertPendingReconciliation(): Promise<number> {
    const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const rows = await this.prisma.materialReconciliation.findMany({
      where: {
        status: { not: 'BALANCED' },
        job: {
          status: { in: ['QUALITY_ACCEPTED', 'DISPATCHED', 'RECEIVED'] },
          updatedAt: { lt: cutoff },
        },
      },
      include: {
        job: { select: { id: true, jobNumber: true, partnerId: true } },
        item: { select: { code: true, name: true } },
      },
    });
    for (const row of rows) {
      await this.notifications.notify({
        event: 'MATERIAL_RECEIPT_NOT_ACKNOWLEDGED',
        title: `Material not reconciled on ${row.job.jobNumber}`,
        body: `${row.item.code} is still open: ${row.issuedKg} kg issued, ${row.consumedKg} kg consumed. The job cannot be closed until it balances.`,
        link: `/app/materials/reconciliation?jobId=${row.jobId}`,
        entityType: 'MaterialReconciliation',
        entityId: row.id,
        roleCodes: ['STORES_USER', 'FINANCE_USER', 'OPERATIONS_HEAD'],
      });
    }
    return rows.length;
  }

  /** Module 9 — "the system should notify management when a fixture is not returned". */
  async alertToolsNotReturned(): Promise<number> {
    const issues = await this.prisma.toolIssue.findMany({
      where: {
        status: 'ISSUED',
        actualReturnDate: null,
        expectedReturnDate: { not: null, lt: new Date() },
      },
      include: {
        tool: { select: { toolCode: true, description: true, replacementValue: true } },
        partner: { select: { id: true, businessName: true } },
      },
    });
    for (const issue of issues) {
      const overdueDays = Math.floor(
        (Date.now() - (issue.expectedReturnDate?.getTime() ?? Date.now())) / (24 * 3600 * 1000),
      );
      await this.notifications.notify({
        event: 'FIXTURE_CALIBRATION_DUE',
        title: `${issue.tool.toolCode} is ${overdueDays} day(s) overdue for return`,
        body: `${issue.tool.description} is still with ${issue.partner.businessName}. Replacement value ${issue.tool.replacementValue}.`,
        link: `/app/tooling`,
        entityType: 'ToolIssue',
        entityId: issue.id,
        roleCodes: ['STORES_USER', 'GRIDX_HEAD'],
      });
      await this.notifications.notify({
        event: 'FIXTURE_CALIBRATION_DUE',
        title: `Please return ${issue.tool.toolCode}`,
        body: `${issue.tool.description} was due back on ${issue.expectedReturnDate?.toDateString()}.`,
        link: '/partner',
        entityType: 'ToolIssue',
        entityId: issue.id,
        partnerId: issue.partnerId,
        channels: ['IN_APP', 'WHATSAPP'],
      });
    }
    return issues.length;
  }

  /**
   * Module 9 — "the system should notify management when a tool is damaged". Runs on a schedule
   * rather than at the moment of return so a damaged tool keeps surfacing until someone acts.
   */
  async alertDamagedTools(): Promise<number> {
    const tools = await this.prisma.tool.findMany({
      where: { isActive: true, condition: { in: ['DAMAGED', 'SCRAPPED'] } },
      select: {
        id: true,
        toolCode: true,
        description: true,
        condition: true,
        currentPartnerId: true,
      },
    });
    for (const tool of tools) {
      await this.notifications.notify({
        event: 'FIXTURE_CALIBRATION_DUE',
        title: `${tool.toolCode} is recorded as ${tool.condition.toLowerCase()}`,
        body: `${tool.description} needs repair or replacement before it is issued again.`,
        link: '/app/tooling',
        entityType: 'Tool',
        entityId: tool.id,
        roleCodes: ['STORES_USER', 'QUALITY_INSPECTOR', 'GRIDX_HEAD'],
      });
    }
    return tools.length;
  }

  /**
   * Module 9 — "the system should notify management when the tool is used by an unauthorised
   * partner". A tool whose recorded custody does not match an open issue is unaccounted for:
   * either it moved between partners informally, or the issue was never closed.
   */
  async alertUnauthorisedToolCustody(): Promise<number> {
    const tools = await this.prisma.tool.findMany({
      where: { isActive: true, currentPartnerId: { not: null } },
      select: {
        id: true,
        toolCode: true,
        description: true,
        currentPartnerId: true,
        issues: {
          where: { status: 'ISSUED' },
          select: { partnerId: true, partner: { select: { businessName: true } } },
        },
      },
    });

    const mismatched = tools.filter(
      (tool) => !tool.issues.some((issue) => issue.partnerId === tool.currentPartnerId),
    );
    if (mismatched.length === 0) return 0;

    // `currentPartnerId` is a bare column with no relation, so the names are resolved in one go.
    const holders = await this.prisma.partner.findMany({
      where: { id: { in: mismatched.map((tool) => tool.currentPartnerId ?? '') } },
      select: { id: true, businessName: true },
    });
    const nameFor = new Map(holders.map((partner) => [partner.id, partner.businessName]));

    for (const tool of mismatched) {
      const heldBy = nameFor.get(tool.currentPartnerId ?? '') ?? 'an unknown partner';
      const issuedTo = tool.issues[0]?.partner.businessName;
      await this.notifications.notify({
        event: 'FIXTURE_CALIBRATION_DUE',
        title: `${tool.toolCode} is held by a partner it was not issued to`,
        body: issuedTo
          ? `${tool.description} is recorded with ${heldBy} but is issued to ${issuedTo}.`
          : `${tool.description} is recorded with ${heldBy} with no open tool issue against it.`,
        link: '/app/tooling',
        entityType: 'Tool',
        entityId: tool.id,
        roleCodes: ['STORES_USER', 'QUALITY_INSPECTOR', 'GRIDX_HEAD'],
      });
    }
    return mismatched.length;
  }

  /** Module 8 — corrective actions have owners and due dates; both are worth nothing unheeded. */
  async alertCorrectiveActionsDue(): Promise<number> {
    const soon = new Date(Date.now() + 3 * 24 * 3600 * 1000);
    const actions = await this.prisma.correctiveAction.findMany({
      where: { stage: { not: 'CLOSED' }, dueDate: { not: null, lte: soon } },
      include: { nonConformance: { select: { ncNumber: true, jobId: true } } },
    });
    for (const action of actions) {
      const overdue = (action.dueDate?.getTime() ?? 0) < Date.now();
      await this.notifications.notify({
        event: 'CORRECTIVE_ACTION_DUE',
        title: `${action.caNumber} is ${overdue ? 'overdue' : 'due soon'}`,
        body: `Corrective action for ${action.nonConformance.ncNumber} is at stage ${action.stage} and was due ${action.dueDate?.toDateString()}.`,
        link: '/app/quality/non-conformances',
        entityType: 'CorrectiveAction',
        entityId: action.id,
        userIds: action.ownerId ? [action.ownerId] : undefined,
        roleCodes: action.ownerId ? undefined : ['QUALITY_INSPECTOR', 'GRIDX_HEAD'],
      });
    }
    return actions.length;
  }
}

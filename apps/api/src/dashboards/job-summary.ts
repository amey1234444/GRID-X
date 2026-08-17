import { Prisma } from '@gridx/db';
import { JobSummary } from '@gridx/shared';

export const JOB_SUMMARY_INCLUDE = {
  component: { select: { componentCode: true, name: true, criticality: true } },
  partner: { select: { id: true, businessName: true } },
  milestones: { orderBy: { reportedAt: 'desc' }, take: 1 },
} satisfies Prisma.GridJobInclude;

type JobWithSummaryIncludes = Prisma.GridJobGetPayload<{ include: typeof JOB_SUMMARY_INCLUDE }>;

const CLOSED_STATUSES = ['CLOSED', 'CANCELLED', 'RECEIVED'];

/** Single place that shapes a job row into the summary consumed by every dashboard and list. */
export function toJobSummary(job: JobWithSummaryIncludes): JobSummary {
  const isOverdue = job.dueDate < new Date() && !CLOSED_STATUSES.includes(job.status);
  return {
    id: job.id,
    jobNumber: job.jobNumber,
    componentCode: job.component.componentCode,
    componentName: job.component.name,
    criticality: job.component.criticality,
    partnerId: job.partnerId,
    partnerName: job.partner?.businessName ?? null,
    quantity: job.quantity,
    acceptedQuantity: job.acceptedQuantity,
    rejectedQuantity: job.rejectedQuantity,
    status: job.status,
    priority: job.priority,
    dueDate: job.dueDate.toISOString(),
    rate: job.rate,
    value: job.rate * job.quantity,
    latestMilestone: job.milestones[0]?.type ?? null,
    isOverdue,
    materialResponsibility: job.materialResponsibility,
    delayDays: isOverdue
      ? Math.max(0, Math.ceil((Date.now() - job.dueDate.getTime()) / (24 * 3600 * 1000)))
      : 0,
  };
}

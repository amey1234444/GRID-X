import { BadRequestException } from '@nestjs/common';
import {
  MILESTONE_LABELS,
  MILESTONES_REQUIRING_PHOTO,
  MilestoneType,
} from '@gridx/shared';

/**
 * Module 7 progress evidence — "at selected stages the partner should upload a photograph".
 *
 * The web form already hides the submit button without one, but that is a courtesy, not a control:
 * the partner PWA, the offline replay path and any direct API call all reach the same endpoint.
 * The requirement is enforced here so the evidence exists wherever the milestone came from.
 */
export function assertMilestoneEvidence(
  type: MilestoneType,
  photographFileIds: string[] | undefined,
): void {
  if (!MILESTONES_REQUIRING_PHOTO.includes(type)) return;
  if (photographFileIds && photographFileIds.length > 0) return;

  throw new BadRequestException(
    `A photograph is required for "${MILESTONE_LABELS[type]}". Take one and try again.`,
  );
}

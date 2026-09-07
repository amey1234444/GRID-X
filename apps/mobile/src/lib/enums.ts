/**
 * Display vocabulary mirrored from packages/shared/src/enums.ts.
 *
 * The mobile app is outside the pnpm workspace, so it cannot import
 * @gridx/shared. Only option lists and labels live here — every rule that
 * decides what a value *means* stays on the server.
 */

export const MILESTONE_TYPES = [
  'JOB_ACCEPTED',
  'MATERIAL_RECEIVED',
  'PRODUCTION_STARTED',
  'FIRST_PIECE_READY',
  'BATCH_25_PERCENT',
  'BATCH_50_PERCENT',
  'BATCH_READY_FOR_INSPECTION',
  'DISPATCHED',
] as const;
export type MilestoneType = (typeof MILESTONE_TYPES)[number];

export const MILESTONE_LABELS: Record<MilestoneType, string> = {
  JOB_ACCEPTED: 'Job accepted',
  MATERIAL_RECEIVED: 'Material received',
  PRODUCTION_STARTED: 'Production started',
  FIRST_PIECE_READY: 'First piece ready',
  BATCH_25_PERCENT: '25% complete',
  BATCH_50_PERCENT: '50% complete',
  BATCH_READY_FOR_INSPECTION: 'Ready for inspection',
  DISPATCHED: 'Dispatched',
};

export const DELAY_REASONS = [
  'MATERIAL_SHORTAGE',
  'DRAWING_CLARIFICATION',
  'MACHINE_BREAKDOWN',
  'LABOUR_SHORTAGE',
  'POWER_ISSUE',
  'QUALITY_ISSUE',
  'TRANSPORT_DELAY',
  'OSWAR_APPROVAL_PENDING',
  'PARTNER_PLANNING_FAILURE',
] as const;
export type DelayReason = (typeof DELAY_REASONS)[number];

export const DELAY_REASON_LABELS: Record<DelayReason, string> = {
  MATERIAL_SHORTAGE: 'Material shortage',
  DRAWING_CLARIFICATION: 'Drawing clarification',
  MACHINE_BREAKDOWN: 'Machine breakdown',
  LABOUR_SHORTAGE: 'Labour shortage',
  POWER_ISSUE: 'Power issue',
  QUALITY_ISSUE: 'Quality issue',
  TRANSPORT_DELAY: 'Transport delay',
  OSWAR_APPROVAL_PENDING: 'OSWAR approval pending',
  PARTNER_PLANNING_FAILURE: 'Planning failure',
};

export const INSPECTION_TYPES = [
  'INCOMING_MATERIAL',
  'FIRST_ARTICLE',
  'IN_PROCESS',
  'FINAL',
  'RECEIVING',
  'PARTNER_AUDIT',
] as const;
export type InspectionType = (typeof INSPECTION_TYPES)[number];

export const INSPECTION_TYPE_LABELS: Record<InspectionType, string> = {
  INCOMING_MATERIAL: 'Incoming material',
  FIRST_ARTICLE: 'First article',
  IN_PROCESS: 'In process',
  FINAL: 'Final',
  RECEIVING: 'Receiving',
  PARTNER_AUDIT: 'Partner audit',
};

export const INSPECTION_DECISIONS = [
  'ACCEPTED',
  'ACCEPTED_WITH_DEVIATION',
  'REWORK_REQUIRED',
  'REJECTED',
  'HOLD_FOR_ENGINEERING_REVIEW',
] as const;
export type InspectionDecision = (typeof INSPECTION_DECISIONS)[number];

export const INSPECTION_DECISION_LABELS: Record<InspectionDecision, string> = {
  ACCEPTED: 'Accepted',
  ACCEPTED_WITH_DEVIATION: 'Accepted with deviation',
  REWORK_REQUIRED: 'Rework required',
  REJECTED: 'Rejected',
  HOLD_FOR_ENGINEERING_REVIEW: 'Hold for engineering review',
};

/** Decisions that require a defect classification alongside them. */
export const DECISIONS_NEEDING_DEFECT: InspectionDecision[] = ['REJECTED', 'REWORK_REQUIRED'];

export const RESULT_VERDICTS = ['PASS', 'FAIL', 'NOT_APPLICABLE'] as const;
export type ResultVerdict = (typeof RESULT_VERDICTS)[number];

export const DEFECT_TYPES = [
  'DIMENSIONAL',
  'WELD_DEFECT',
  'SURFACE_FINISH',
  'MATERIAL_DEFECT',
  'PAINT_DEFECT',
  'ASSEMBLY_ERROR',
  'MISSING_OPERATION',
  'DAMAGE_IN_TRANSIT',
  'DOCUMENTATION',
  'OTHER',
] as const;
export type DefectType = (typeof DEFECT_TYPES)[number];

export const RESPONSIBLE_PARTIES = ['PARTNER', 'OSWAR', 'SHARED', 'EXTERNAL'] as const;
export type ResponsibleParty = (typeof RESPONSIBLE_PARTIES)[number];

export const REWORK_STATUSES = [
  'ISSUED',
  'IN_PROGRESS',
  'READY_FOR_REINSPECTION',
  'COMPLETED',
  'SCRAPPED',
] as const;
export type ReworkStatus = (typeof REWORK_STATUSES)[number];

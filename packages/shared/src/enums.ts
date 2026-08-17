/**
 * Enumerations mirroring the GRID-X blueprint workflows.
 * Values are identical to the Prisma enums so they can cross the API boundary as plain strings.
 */

export const ROLE_CODES = [
  'GROUP_ADMIN',
  'GRIDX_HEAD',
  'OPERATIONS_HEAD',
  'ENGINEERING_USER',
  'PROCUREMENT_USER',
  'QUALITY_INSPECTOR',
  'STORES_USER',
  'FINANCE_USER',
  'LOGISTICS_COORDINATOR',
  'MANAGEMENT_VIEWER',
  'PARTNER_OWNER',
  'PARTNER_SUPERVISOR',
  'PARTNER_WORKER',
] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

export const PARTNER_ROLE_CODES: RoleCode[] = [
  'PARTNER_OWNER',
  'PARTNER_SUPERVISOR',
  'PARTNER_WORKER',
];

export const ROLE_LABELS: Record<RoleCode, string> = {
  GROUP_ADMIN: 'Group Admin',
  GRIDX_HEAD: 'GRID-X Head',
  OPERATIONS_HEAD: 'Operations Head',
  ENGINEERING_USER: 'Engineering User',
  PROCUREMENT_USER: 'Procurement User',
  QUALITY_INSPECTOR: 'Quality Inspector',
  STORES_USER: 'Stores User',
  FINANCE_USER: 'Finance User',
  LOGISTICS_COORDINATOR: 'Logistics Coordinator',
  MANAGEMENT_VIEWER: 'Management Viewer',
  PARTNER_OWNER: 'Partner Owner',
  PARTNER_SUPERVISOR: 'Partner Supervisor',
  PARTNER_WORKER: 'Partner Worker',
};

export const ROLE_DESCRIPTIONS: Record<RoleCode, string> = {
  GROUP_ADMIN: 'Full access across Oswal Engineers, Oswar Rotocorp and future group companies.',
  GRIDX_HEAD: 'Controls the partner network, job allocation, performance and escalations.',
  OPERATIONS_HEAD: 'Views production status, capacity and delays.',
  ENGINEERING_USER: 'Creates and releases drawings, revisions, specifications and work instructions.',
  PROCUREMENT_USER:
    'Creates rates, partner agreements, material purchase links and commercial approvals.',
  QUALITY_INSPECTOR: 'Conducts inspections and manages rejection, rework and corrective actions.',
  STORES_USER: 'Issues and receives material, scrap, finished components and returnable tools.',
  FINANCE_USER: 'Reviews accepted quantities, deductions, invoices and payments.',
  LOGISTICS_COORDINATOR: 'Plans pickup and delivery movements.',
  MANAGEMENT_VIEWER: 'Read-only dashboard for senior management.',
  PARTNER_OWNER: 'Views all jobs, payments, performance and users for their unit.',
  PARTNER_SUPERVISOR: 'Updates production and inspection readiness.',
  PARTNER_WORKER: 'Limited access to instructions and milestone updates.',
};

// --------------------------------------------------------------------------
// Partner
// --------------------------------------------------------------------------

export const PARTNER_APPROVAL_STATUSES = [
  'DRAFT',
  'DOCUMENT_REVIEW',
  'CAPABILITY_AUDIT',
  'TRIAL_APPROVED',
  'APPROVED',
  'CERTIFIED',
  'STRATEGIC',
  'SUSPENDED',
] as const;
export type PartnerApprovalStatus = (typeof PARTNER_APPROVAL_STATUSES)[number];

export const PARTNER_APPROVAL_LABELS: Record<PartnerApprovalStatus, string> = {
  DRAFT: 'Draft',
  DOCUMENT_REVIEW: 'Document Review',
  CAPABILITY_AUDIT: 'Capability Audit',
  TRIAL_APPROVED: 'Trial Approved',
  APPROVED: 'Approved',
  CERTIFIED: 'Certified',
  STRATEGIC: 'Strategic',
  SUSPENDED: 'Suspended',
};

/** Draft → Document Review → Capability Audit → Trial Approved → Approved → Certified → Strategic → Suspended */
export const PARTNER_APPROVAL_TRANSITIONS: Record<PartnerApprovalStatus, PartnerApprovalStatus[]> = {
  DRAFT: ['DOCUMENT_REVIEW', 'SUSPENDED'],
  DOCUMENT_REVIEW: ['CAPABILITY_AUDIT', 'DRAFT', 'SUSPENDED'],
  CAPABILITY_AUDIT: ['TRIAL_APPROVED', 'DOCUMENT_REVIEW', 'SUSPENDED'],
  TRIAL_APPROVED: ['APPROVED', 'CAPABILITY_AUDIT', 'SUSPENDED'],
  APPROVED: ['CERTIFIED', 'SUSPENDED'],
  CERTIFIED: ['STRATEGIC', 'APPROVED', 'SUSPENDED'],
  STRATEGIC: ['CERTIFIED', 'SUSPENDED'],
  SUSPENDED: ['DOCUMENT_REVIEW', 'APPROVED'],
};

/** Partner must be at or beyond APPROVED to receive a job */
export const ALLOCATABLE_PARTNER_STATUSES: PartnerApprovalStatus[] = [
  'TRIAL_APPROVED',
  'APPROVED',
  'CERTIFIED',
  'STRATEGIC',
];

export const PARTNER_LEVELS = ['L1_MICRO', 'L2_SMALL', 'L3_MEDIUM', 'L4_STRATEGIC'] as const;
export type PartnerLevel = (typeof PARTNER_LEVELS)[number];

export const PARTNER_LEVEL_LABELS: Record<PartnerLevel, string> = {
  L1_MICRO: 'L1 — Micro / Cottage',
  L2_SMALL: 'L2 — Small',
  L3_MEDIUM: 'L3 — Medium',
  L4_STRATEGIC: 'L4 — Strategic',
};

export const PARTNER_CATEGORIES = ['A', 'B', 'C', 'D', 'SUSPENDED'] as const;
export type PartnerCategory = (typeof PARTNER_CATEGORIES)[number];

export const PARTNER_AUDIT_STATUSES = [
  'NOT_AUDITED',
  'SCHEDULED',
  'IN_PROGRESS',
  'PASSED',
  'FAILED',
] as const;
export type PartnerAuditStatus = (typeof PARTNER_AUDIT_STATUSES)[number];

export const PARTNER_DOCUMENT_TYPES = [
  'UDYAM_CERTIFICATE',
  'GST_CERTIFICATE',
  'PAN_CARD',
  'BANK_PROOF',
  'ISO_CERTIFICATE',
  'INSURANCE',
  'SAFETY_COMPLIANCE',
  'FACTORY_LICENSE',
  'NDA',
  'AGREEMENT',
  'OTHER',
] as const;
export type PartnerDocumentType = (typeof PARTNER_DOCUMENT_TYPES)[number];

// --------------------------------------------------------------------------
// Processes and components
// --------------------------------------------------------------------------

export const PROCESS_TYPES = [
  'CUTTING',
  'BENDING',
  'WELDING',
  'FABRICATION',
  'MACHINING',
  'DRILLING',
  'GRINDING',
  'PAINTING',
  'ASSEMBLY',
  'PACKING',
  'ELECTRICAL_WIRING',
  'TRANSPORT',
] as const;
export type ProcessType = (typeof PROCESS_TYPES)[number];

export const PROCESS_LABELS: Record<ProcessType, string> = {
  CUTTING: 'Cutting',
  BENDING: 'Bending',
  WELDING: 'Welding',
  FABRICATION: 'Fabrication',
  MACHINING: 'Machining',
  DRILLING: 'Drilling',
  GRINDING: 'Grinding',
  PAINTING: 'Painting',
  ASSEMBLY: 'Assembly',
  PACKING: 'Packing',
  ELECTRICAL_WIRING: 'Electrical Wiring',
  TRANSPORT: 'Transport',
};

export const MACHINE_CONDITIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'UNDER_REPAIR'] as const;
export type MachineCondition = (typeof MACHINE_CONDITIONS)[number];

export const OWNERSHIP_STATUSES = ['OWNED', 'RENTED', 'LEASED'] as const;
export type OwnershipStatus = (typeof OWNERSHIP_STATUSES)[number];

export const CRITICALITY_CLASSES = ['CLASS_A', 'CLASS_B', 'CLASS_C', 'CLASS_D'] as const;
export type CriticalityClass = (typeof CRITICALITY_CLASSES)[number];

export const CRITICALITY_LABELS: Record<CriticalityClass, string> = {
  CLASS_A: 'Class A — Critical, retain in-house',
  CLASS_B: 'Class B — Controlled outsourcing',
  CLASS_C: 'Class C — Standard outsourcing',
  CLASS_D: 'Class D — Cottage or micro-unit suitable',
};

export const INSPECTION_LEVELS = [
  'LEVEL_1_VISUAL',
  'LEVEL_2_SAMPLING',
  'LEVEL_3_FULL_DIMENSIONAL',
  'LEVEL_4_CRITICAL_100_PERCENT',
] as const;
export type InspectionLevel = (typeof INSPECTION_LEVELS)[number];

export const INSPECTION_LEVEL_LABELS: Record<InspectionLevel, string> = {
  LEVEL_1_VISUAL: 'Level 1 — Visual',
  LEVEL_2_SAMPLING: 'Level 2 — Sampling',
  LEVEL_3_FULL_DIMENSIONAL: 'Level 3 — Full dimensional',
  LEVEL_4_CRITICAL_100_PERCENT: 'Level 4 — Critical, 100%',
};

// --------------------------------------------------------------------------
// Drawings
// --------------------------------------------------------------------------

export const DRAWING_STATUSES = [
  'DRAFT',
  'UNDER_REVIEW',
  'APPROVED',
  'RELEASED',
  'SUPERSEDED',
  'ARCHIVED',
] as const;
export type DrawingStatus = (typeof DRAWING_STATUSES)[number];

export const DRAWING_STATUS_LABELS: Record<DrawingStatus, string> = {
  DRAFT: 'Draft',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  RELEASED: 'Released',
  SUPERSEDED: 'Superseded',
  ARCHIVED: 'Archived',
};

/** Draft → Under Review → Approved → Released → Superseded → Archived */
export const DRAWING_STATUS_TRANSITIONS: Record<DrawingStatus, DrawingStatus[]> = {
  DRAFT: ['UNDER_REVIEW', 'ARCHIVED'],
  UNDER_REVIEW: ['APPROVED', 'DRAFT', 'ARCHIVED'],
  APPROVED: ['RELEASED', 'UNDER_REVIEW', 'ARCHIVED'],
  RELEASED: ['SUPERSEDED', 'ARCHIVED'],
  SUPERSEDED: ['ARCHIVED'],
  ARCHIVED: [],
};

export const DRAWING_ACCESS_MODES = ['VIEW_ONLY', 'VIEW_AND_DOWNLOAD'] as const;
export type DrawingAccessMode = (typeof DRAWING_ACCESS_MODES)[number];

export const ENGINEERING_CHANGE_STATUSES = [
  'RAISED',
  'UNDER_REVIEW',
  'APPROVED',
  'IMPLEMENTED',
  'REJECTED',
] as const;
export type EngineeringChangeStatus = (typeof ENGINEERING_CHANGE_STATUSES)[number];

// --------------------------------------------------------------------------
// Jobs
// --------------------------------------------------------------------------

export const JOB_STATUSES = [
  'DRAFT',
  'AWAITING_PARTNER_ACCEPTANCE',
  'ACCEPTED',
  'MATERIAL_PENDING',
  'MATERIAL_ISSUED',
  'IN_PRODUCTION',
  'INSPECTION_REQUESTED',
  'UNDER_INSPECTION',
  'REWORK',
  'QUALITY_ACCEPTED',
  'DISPATCHED',
  'RECEIVED',
  'CLOSED',
  'CANCELLED',
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  DRAFT: 'Draft',
  AWAITING_PARTNER_ACCEPTANCE: 'Awaiting Partner Acceptance',
  ACCEPTED: 'Accepted',
  MATERIAL_PENDING: 'Material Pending',
  MATERIAL_ISSUED: 'Material Issued',
  IN_PRODUCTION: 'In Production',
  INSPECTION_REQUESTED: 'Inspection Requested',
  UNDER_INSPECTION: 'Under Inspection',
  REWORK: 'Rework',
  QUALITY_ACCEPTED: 'Accepted (Quality)',
  DISPATCHED: 'Dispatched',
  RECEIVED: 'Received',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

/**
 * Draft → Awaiting Partner Acceptance → Accepted → Material Pending → Material Issued →
 * In Production → Inspection Requested → Under Inspection → Rework → Accepted →
 * Dispatched → Received → Closed
 */
export const JOB_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  DRAFT: ['AWAITING_PARTNER_ACCEPTANCE', 'CANCELLED'],
  AWAITING_PARTNER_ACCEPTANCE: ['ACCEPTED', 'DRAFT', 'CANCELLED'],
  ACCEPTED: ['MATERIAL_PENDING', 'IN_PRODUCTION', 'CANCELLED'],
  MATERIAL_PENDING: ['MATERIAL_ISSUED', 'CANCELLED'],
  MATERIAL_ISSUED: ['IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['INSPECTION_REQUESTED', 'CANCELLED'],
  INSPECTION_REQUESTED: ['UNDER_INSPECTION', 'IN_PRODUCTION'],
  UNDER_INSPECTION: ['REWORK', 'QUALITY_ACCEPTED', 'IN_PRODUCTION'],
  REWORK: ['INSPECTION_REQUESTED', 'UNDER_INSPECTION', 'CANCELLED'],
  QUALITY_ACCEPTED: ['DISPATCHED'],
  DISPATCHED: ['RECEIVED'],
  RECEIVED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

export const OPEN_JOB_STATUSES: JobStatus[] = [
  'AWAITING_PARTNER_ACCEPTANCE',
  'ACCEPTED',
  'MATERIAL_PENDING',
  'MATERIAL_ISSUED',
  'IN_PRODUCTION',
  'INSPECTION_REQUESTED',
  'UNDER_INSPECTION',
  'REWORK',
  'QUALITY_ACCEPTED',
  'DISPATCHED',
];

export const JOB_SOURCES = [
  'SALES_ORDER',
  'WORK_ORDER',
  'INTERNAL_PRODUCTION',
  'REPLENISHMENT',
  'MANUAL',
] as const;
export type JobSource = (typeof JOB_SOURCES)[number];

export const JOB_SOURCE_LABELS: Record<JobSource, string> = {
  SALES_ORDER: 'Sales Order',
  WORK_ORDER: 'Work Order',
  INTERNAL_PRODUCTION: 'Internal Production Requirement',
  REPLENISHMENT: 'Replenishment Request',
  MANUAL: 'Manual Requirement',
};

export const JOB_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] as const;
export type JobPriority = (typeof JOB_PRIORITIES)[number];

export const MATERIAL_RESPONSIBILITIES = ['OSWAR_SUPPLIED', 'PARTNER_SUPPLIED'] as const;
export type MaterialResponsibility = (typeof MATERIAL_RESPONSIBILITIES)[number];

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
  BATCH_25_PERCENT: 'Batch 25% complete',
  BATCH_50_PERCENT: 'Batch 50% complete',
  BATCH_READY_FOR_INSPECTION: 'Batch ready for inspection',
  DISPATCHED: 'Dispatched',
};

/** Milestones that require photographic evidence before they can be saved */
export const MILESTONES_REQUIRING_PHOTO: MilestoneType[] = [
  'MATERIAL_RECEIVED',
  'FIRST_PIECE_READY',
  'BATCH_READY_FOR_INSPECTION',
  'DISPATCHED',
];

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
  PARTNER_PLANNING_FAILURE: 'Partner planning failure',
};

/** Default responsibility used to separate partner-caused delays from OSWAR-caused delays */
export const DELAY_RESPONSIBILITY: Record<DelayReason, ResponsibleParty> = {
  MATERIAL_SHORTAGE: 'OSWAR',
  DRAWING_CLARIFICATION: 'OSWAR',
  MACHINE_BREAKDOWN: 'PARTNER',
  LABOUR_SHORTAGE: 'PARTNER',
  POWER_ISSUE: 'EXTERNAL',
  QUALITY_ISSUE: 'PARTNER',
  TRANSPORT_DELAY: 'EXTERNAL',
  OSWAR_APPROVAL_PENDING: 'OSWAR',
  PARTNER_PLANNING_FAILURE: 'PARTNER',
};

export const RESPONSIBLE_PARTIES = ['PARTNER', 'OSWAR', 'SHARED', 'EXTERNAL'] as const;
export type ResponsibleParty = (typeof RESPONSIBLE_PARTIES)[number];

export const CLARIFICATION_STATUSES = ['OPEN', 'ANSWERED', 'CLOSED'] as const;
export type ClarificationStatus = (typeof CLARIFICATION_STATUSES)[number];

// --------------------------------------------------------------------------
// Materials
// --------------------------------------------------------------------------

export const MATERIAL_TRANSACTION_TYPES = [
  'ISSUED_TO_PARTNER',
  'RECEIVED_BY_PARTNER',
  'CONSUMED',
  'SCRAP_GENERATED',
  'SCRAP_RETURNED',
  'UNUSED_MATERIAL_RETURNED',
  'SHORTAGE',
  'EXCESS',
  'REJECTED_MATERIAL',
  'REPLACEMENT_MATERIAL',
] as const;
export type MaterialTransactionType = (typeof MATERIAL_TRANSACTION_TYPES)[number];

export const MATERIAL_ISSUE_STATUSES = [
  'DRAFT',
  'PREPARED',
  'ISSUED',
  'ACKNOWLEDGED',
  'PARTIALLY_RECONCILED',
  'RECONCILED',
  'CANCELLED',
] as const;
export type MaterialIssueStatus = (typeof MATERIAL_ISSUE_STATUSES)[number];

export const RECONCILIATION_STATUSES = [
  'PENDING',
  'BALANCED',
  'SHORTAGE',
  'EXCESS',
  'DISPUTED',
] as const;
export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[number];

// --------------------------------------------------------------------------
// Quality
// --------------------------------------------------------------------------

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
  INCOMING_MATERIAL: 'Incoming material inspection',
  FIRST_ARTICLE: 'First-article inspection',
  IN_PROCESS: 'In-process inspection',
  FINAL: 'Final inspection',
  RECEIVING: 'Receiving inspection',
  PARTNER_AUDIT: 'Partner audit',
};

export const INSPECTION_STATUSES = [
  'REQUESTED',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

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

export const CORRECTIVE_ACTION_STAGES = [
  'ISSUE_RAISED',
  'CONTAINMENT',
  'ROOT_CAUSE',
  'CORRECTIVE_ACTION',
  'VERIFICATION',
  'CLOSED',
] as const;
export type CorrectiveActionStage = (typeof CORRECTIVE_ACTION_STAGES)[number];

export const CORRECTIVE_ACTION_STAGE_LABELS: Record<CorrectiveActionStage, string> = {
  ISSUE_RAISED: 'Issue Raised',
  CONTAINMENT: 'Containment',
  ROOT_CAUSE: 'Root Cause',
  CORRECTIVE_ACTION: 'Corrective Action',
  VERIFICATION: 'Verification',
  CLOSED: 'Closed',
};

/** Issue Raised → Containment → Root Cause → Corrective Action → Verification → Closed */
export const CORRECTIVE_ACTION_TRANSITIONS: Record<
  CorrectiveActionStage,
  CorrectiveActionStage[]
> = {
  ISSUE_RAISED: ['CONTAINMENT'],
  CONTAINMENT: ['ROOT_CAUSE'],
  ROOT_CAUSE: ['CORRECTIVE_ACTION'],
  CORRECTIVE_ACTION: ['VERIFICATION'],
  VERIFICATION: ['CLOSED', 'CORRECTIVE_ACTION'],
  CLOSED: [],
};

export const REWORK_STATUSES = [
  'ISSUED',
  'IN_PROGRESS',
  'READY_FOR_REINSPECTION',
  'COMPLETED',
  'SCRAPPED',
] as const;
export type ReworkStatus = (typeof REWORK_STATUSES)[number];

export const DEVIATION_STATUSES = ['REQUESTED', 'APPROVED', 'REJECTED'] as const;
export type DeviationStatus = (typeof DEVIATION_STATUSES)[number];

// --------------------------------------------------------------------------
// Tooling
// --------------------------------------------------------------------------

export const TOOL_CATEGORIES = ['TOOL', 'FIXTURE', 'GAUGE'] as const;
export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

export const TOOL_CONDITIONS = ['NEW', 'GOOD', 'WORN', 'DAMAGED', 'SCRAPPED'] as const;
export type ToolCondition = (typeof TOOL_CONDITIONS)[number];

export const TOOL_ISSUE_STATUSES = ['ISSUED', 'RETURNED', 'OVERDUE', 'DAMAGED', 'LOST'] as const;
export type ToolIssueStatus = (typeof TOOL_ISSUE_STATUSES)[number];

// --------------------------------------------------------------------------
// Logistics
// --------------------------------------------------------------------------

export const SHIPMENT_DIRECTIONS = [
  'OSWAR_TO_PARTNER',
  'PARTNER_TO_OSWAR',
  'PARTNER_TO_PARTNER',
] as const;
export type ShipmentDirection = (typeof SHIPMENT_DIRECTIONS)[number];

export const SHIPMENT_STATUSES = [
  'PLANNED',
  'PICKUP_DUE',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'DELAYED',
  'CANCELLED',
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

// --------------------------------------------------------------------------
// Commercials
// --------------------------------------------------------------------------

export const INVOICE_STATUSES = [
  'DRAFT',
  'RAISED',
  'QUANTITY_VERIFIED',
  'QUALITY_VERIFIED',
  'MATERIAL_RECONCILED',
  'FINANCE_APPROVED',
  'PAYMENT_SCHEDULED',
  'PAID',
  'HELD',
  'REJECTED',
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  RAISED: 'Partner Invoice Raised',
  QUANTITY_VERIFIED: 'Quantity Verified',
  QUALITY_VERIFIED: 'Quality Verified',
  MATERIAL_RECONCILED: 'Material Reconciled',
  FINANCE_APPROVED: 'Finance Approved',
  PAYMENT_SCHEDULED: 'Payment Scheduled',
  PAID: 'Paid',
  HELD: 'Held',
  REJECTED: 'Rejected',
};

/**
 * Partner Invoice Raised → Quantity Verified → Quality Verified → Material Reconciled →
 * Finance Approved → Payment Scheduled → Paid
 */
export const INVOICE_STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ['RAISED'],
  RAISED: ['QUANTITY_VERIFIED', 'HELD', 'REJECTED'],
  QUANTITY_VERIFIED: ['QUALITY_VERIFIED', 'HELD', 'REJECTED'],
  QUALITY_VERIFIED: ['MATERIAL_RECONCILED', 'HELD', 'REJECTED'],
  MATERIAL_RECONCILED: ['FINANCE_APPROVED', 'HELD', 'REJECTED'],
  FINANCE_APPROVED: ['PAYMENT_SCHEDULED', 'HELD'],
  PAYMENT_SCHEDULED: ['PAID', 'HELD'],
  PAID: [],
  HELD: ['QUANTITY_VERIFIED', 'QUALITY_VERIFIED', 'MATERIAL_RECONCILED', 'FINANCE_APPROVED', 'REJECTED'],
  REJECTED: [],
};

export const INVOICE_STAGE_ORDER: InvoiceStatus[] = [
  'RAISED',
  'QUANTITY_VERIFIED',
  'QUALITY_VERIFIED',
  'MATERIAL_RECONCILED',
  'FINANCE_APPROVED',
  'PAYMENT_SCHEDULED',
  'PAID',
];

export const PAYMENT_MODES = ['NEFT', 'RTGS', 'IMPS', 'UPI', 'CHEQUE', 'CASH'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const ADJUSTMENT_TYPES = [
  'QUALITY_INCENTIVE',
  'ON_TIME_DELIVERY_INCENTIVE',
  'REWORK_DEDUCTION',
  'MATERIAL_SHORTAGE_DEDUCTION',
  'APPROVED_PENALTY',
  'OTHER_INCENTIVE',
  'OTHER_DEDUCTION',
] as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

export const INCENTIVE_TYPES: AdjustmentType[] = [
  'QUALITY_INCENTIVE',
  'ON_TIME_DELIVERY_INCENTIVE',
  'OTHER_INCENTIVE',
];

export const DEDUCTION_TYPES: AdjustmentType[] = [
  'REWORK_DEDUCTION',
  'MATERIAL_SHORTAGE_DEDUCTION',
  'APPROVED_PENALTY',
  'OTHER_DEDUCTION',
];

export const ADJUSTMENT_LABELS: Record<AdjustmentType, string> = {
  QUALITY_INCENTIVE: 'Quality Incentive',
  ON_TIME_DELIVERY_INCENTIVE: 'On-Time Delivery Incentive',
  REWORK_DEDUCTION: 'Rework Deduction',
  MATERIAL_SHORTAGE_DEDUCTION: 'Material Shortage Deduction',
  APPROVED_PENALTY: 'Approved Penalty',
  OTHER_INCENTIVE: 'Other Incentive',
  OTHER_DEDUCTION: 'Other Deduction',
};

// --------------------------------------------------------------------------
// Performance
// --------------------------------------------------------------------------

export const KPI_CODES = [
  'FIRST_PASS_QUALITY',
  'ON_TIME_IN_FULL_DELIVERY',
  'MATERIAL_UTILISATION',
  'REWORK_RESPONSE',
  'CAPACITY_RELIABILITY',
  'DOCUMENTATION_DISCIPLINE',
  'SAFETY_AND_COMPLIANCE',
] as const;
export type KpiCode = (typeof KPI_CODES)[number];

export const ALLOCATION_RECOMMENDATIONS = [
  'INCREASE_ALLOCATION',
  'MAINTAIN_ALLOCATION',
  'DEVELOPMENT_PLAN',
  'REDUCE_ALLOCATION',
  'SUSPEND_PARTNER',
] as const;
export type AllocationRecommendation = (typeof ALLOCATION_RECOMMENDATIONS)[number];

export const ALLOCATION_RECOMMENDATION_LABELS: Record<AllocationRecommendation, string> = {
  INCREASE_ALLOCATION: 'Increase allocation',
  MAINTAIN_ALLOCATION: 'Maintain allocation',
  DEVELOPMENT_PLAN: 'Development plan',
  REDUCE_ALLOCATION: 'Reduce allocation',
  SUSPEND_PARTNER: 'Suspend partner',
};

export const CAPACITY_PERIOD_TYPES = ['WEEKLY', 'MONTHLY'] as const;
export type CapacityPeriodType = (typeof CAPACITY_PERIOD_TYPES)[number];

// --------------------------------------------------------------------------
// Notifications
// --------------------------------------------------------------------------

export const NOTIFICATION_EVENTS = [
  'NEW_JOB_ASSIGNED',
  'JOB_ACCEPTANCE_PENDING',
  'MATERIAL_READY_FOR_PICKUP',
  'MATERIAL_RECEIPT_NOT_ACKNOWLEDGED',
  'JOB_MILESTONE_OVERDUE',
  'INSPECTION_REQUESTED',
  'INSPECTION_DELAYED',
  'REWORK_ISSUED',
  'DRAWING_REVISION_CHANGED',
  'INVOICE_APPROVED',
  'INVOICE_HELD',
  'PAYMENT_RELEASED',
  'PARTNER_RATING_REDUCED',
  'COMPLIANCE_DOCUMENT_EXPIRING',
  'FIXTURE_CALIBRATION_DUE',
  'JOB_ACCEPTED',
  'JOB_DECLINED',
  'JOB_DELAY_REPORTED',
  'JOB_CLARIFICATION_RAISED',
  'JOB_CLARIFICATION_ANSWERED',
  'JOB_CLOSED',
  'MATERIAL_ISSUED',
  'MATERIAL_ACKNOWLEDGED',
  'INSPECTION_COMPLETED',
  'SHIPMENT_DISPATCHED',
  'SHIPMENT_RECEIVED',
  'INVOICE_SUBMITTED',
  'PARTNER_STATUS_CHANGED',
  'DRAWING_ACCESS_GRANTED',
  'SCORECARD_PUBLISHED',
  'CORRECTIVE_ACTION_DUE',
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export const NOTIFICATION_CHANNELS = ['IN_APP', 'EMAIL', 'WHATSAPP', 'SMS'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = ['PENDING', 'SENT', 'FAILED', 'READ'] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const FILE_CATEGORIES = [
  'DRAWING',
  'PHOTOGRAPH',
  'INSPECTION_DOCUMENT',
  'INVOICE',
  'PARTNER_CERTIFICATE',
  'AUDIT_REPORT',
  'PROOF_OF_DELIVERY',
  'OTHER',
] as const;
export type FileCategory = (typeof FILE_CATEGORIES)[number];

export const LANGUAGES = ['EN', 'HI'] as const;
export type Language = (typeof LANGUAGES)[number];

export const USER_TYPES = ['INTERNAL', 'PARTNER'] as const;
export type UserType = (typeof USER_TYPES)[number];

export const USER_STATUSES = ['INVITED', 'ACTIVE', 'SUSPENDED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

import { z } from 'zod';
import {
  ADJUSTMENT_TYPES,
  CAPACITY_PERIOD_TYPES,
  CORRECTIVE_ACTION_STAGES,
  CRITICALITY_CLASSES,
  DEFECT_TYPES,
  DELAY_REASONS,
  DEVIATION_STATUSES,
  DRAWING_ACCESS_MODES,
  FILE_CATEGORIES,
  INSPECTION_DECISIONS,
  INSPECTION_LEVELS,
  INSPECTION_TYPES,
  JOB_PRIORITIES,
  JOB_SOURCES,
  LANGUAGES,
  MACHINE_CONDITIONS,
  MATERIAL_RESPONSIBILITIES,
  MATERIAL_TRANSACTION_TYPES,
  OWNERSHIP_STATUSES,
  PARTNER_APPROVAL_STATUSES,
  PARTNER_DOCUMENT_TYPES,
  PARTNER_LEVELS,
  PAYMENT_MODES,
  PROCESS_TYPES,
  RESPONSIBLE_PARTIES,
  RESULT_VERDICTS,
  REWORK_STATUSES,
  ROLE_CODES,
  SHIPMENT_DIRECTIONS,
  SHIPMENT_STATUSES,
  TOOL_CATEGORIES,
  TOOL_CONDITIONS,
  MILESTONE_TYPES,
} from './enums';
import { MANUAL_TRANSACTION_TYPES } from './materials';
import { SETTING_KEYS } from './settings';

const id = z.string().min(1);
const optionalString = z.string().trim().min(1).optional().or(z.literal('').transform(() => undefined));
const phone = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s()]{8,20}$/, 'Enter a valid phone number');
const email = z.string().trim().email();
const positive = z.coerce.number().positive();
const nonNegative = z.coerce.number().min(0);
const dateLike = z.coerce.date();

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: email,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  twoFactorCode: z.string().length(6).optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const requestOtpSchema = z.object({ phone });
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({ phone, code: z.string().length(6) });
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const partnerPasswordLoginSchema = z.object({
  phone,
  password: z.string().min(8),
});
export type PartnerPasswordLoginInput = z.infer<typeof partnerPasswordLoginSchema>;

export const refreshSchema = z.object({ refreshToken: z.string().min(10) });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: z
      .string()
      .min(10, 'Use at least 10 characters')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/[a-z]/, 'Include a lowercase letter')
      .regex(/[0-9]/, 'Include a number'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Section 18 — password recovery. The same strength rule as a deliberate change: a reset is the
 * commonest way a weak password gets in, not a reason to relax the rule.
 */
const strongPassword = z
  .string()
  .min(10, 'Use at least 10 characters')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[0-9]/, 'Include a number');

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * An administrator resetting someone else's password. A link is the default; a temporary password
 * is for the user whose mailbox is the thing they have lost.
 */
export const adminResetPasswordSchema = z.object({
  useTemporaryPassword: z.coerce.boolean().default(false),
});

/**
 * A second factor: either a 6-digit TOTP code from an authenticator app, or one of the recovery
 * codes issued at enrolment (`XXXX-XXXX`, dashes and case optional).
 */
export const twoFactorCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(6, 'Enter the 6-digit code from your authenticator app, or a recovery code')
    .max(20),
});
export type TwoFactorCodeInput = z.infer<typeof twoFactorCodeSchema>;

// ---------------------------------------------------------------------------
// Users, roles, companies
// ---------------------------------------------------------------------------

export const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: email.optional(),
  phone: phone.optional(),
  roleCode: z.enum(ROLE_CODES),
  partnerId: id.optional(),
  companyIds: z.array(id).default([]),
  designation: optionalString,
  language: z.enum(LANGUAGES).default('EN'),
  password: z.string().min(10).optional(),
  twoFactorEnabled: z.boolean().default(false),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema.partial().extend({
  status: z.enum(['INVITED', 'ACTIVE', 'SUSPENDED']).optional(),
});

export const createCompanySchema = z.object({
  code: z.string().trim().min(2).max(12),
  name: z.string().trim().min(2),
  legalName: optionalString,
  gstNumber: optionalString,
  panNumber: optionalString,
  addressLine1: optionalString,
  city: optionalString,
  state: optionalString,
  pincode: optionalString,
});

// ---------------------------------------------------------------------------
// Module 1 — partners
// ---------------------------------------------------------------------------

export const createPartnerSchema = z.object({
  companyId: id,
  businessName: z.string().trim().min(2),
  ownerName: z.string().trim().min(2),
  phone,
  altPhone: phone.optional(),
  email: email.optional(),
  addressLine1: z.string().trim().min(3),
  addressLine2: optionalString,
  city: z.string().trim().min(2),
  state: z.string().trim().min(2),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, 'Enter a 6-digit pincode'),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  distanceKm: nonNegative.optional(),
  udyamNumber: optionalString,
  gstNumber: optionalString,
  panNumber: optionalString,
  bankName: optionalString,
  bankAccountName: optionalString,
  bankAccountNo: optionalString,
  bankIfsc: optionalString,
  level: z.enum(PARTNER_LEVELS).default('L2_SMALL'),
  paymentTermsDays: z.coerce.number().int().min(0).max(180).default(30),
  maxCapacityHours: nonNegative.default(0),
  maxOpenJobs: z.coerce.number().int().min(1).max(500).default(10),
  notes: optionalString,
});
export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;

export const updatePartnerSchema = createPartnerSchema.partial().omit({ companyId: true });

export const changePartnerStatusSchema = z.object({
  toStatus: z.enum(PARTNER_APPROVAL_STATUSES),
  reason: optionalString,
});

export const suspendPartnerSchema = z.object({ reason: z.string().trim().min(5) });

export const partnerCapabilitySchema = z.object({
  process: z.enum(PROCESS_TYPES),
  isCapable: z.boolean().default(true),
  isApproved: z.boolean().default(false),
  maxSizeMm: nonNegative.optional(),
  maxWeightKg: nonNegative.optional(),
  toleranceMm: nonNegative.optional(),
  monthlyCapacityHours: nonNegative.default(0),
  remarks: optionalString,
});
export type PartnerCapabilityInput = z.infer<typeof partnerCapabilitySchema>;

export const partnerMachineSchema = z.object({
  machineType: z.string().trim().min(2),
  make: optionalString,
  model: optionalString,
  size: optionalString,
  capacity: optionalString,
  accuracy: optionalString,
  condition: z.enum(MACHINE_CONDITIONS).default('GOOD'),
  ownership: z.enum(OWNERSHIP_STATUSES).default('OWNED'),
  quantity: z.coerce.number().int().min(1).default(1),
  photoFileId: id.optional(),
  lastServicedAt: dateLike.optional(),
});

export const partnerDocumentSchema = z.object({
  type: z.enum(PARTNER_DOCUMENT_TYPES),
  documentNo: optionalString,
  fileId: id.optional(),
  issueDate: dateLike.optional(),
  expiryDate: dateLike.optional(),
  remarks: optionalString,
});

/**
 * Module 1 — an additional unit for a partner working out of more than one address. The primary
 * location is where material goes when a job does not say otherwise.
 */
export const partnerLocationSchema = z.object({
  label: z.string().trim().min(2),
  addressLine1: z.string().trim().min(3),
  addressLine2: optionalString,
  city: z.string().trim().min(2),
  state: z.string().trim().min(2),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, 'Enter a 6-digit pincode'),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  isPrimary: z.coerce.boolean().default(false),
});

export const partnerEmployeeSchema = z.object({
  name: z.string().trim().min(2),
  skill: optionalString,
  phone: phone.optional(),
  isSupervisor: z.boolean().default(false),
});

export const partnerAuditSchema = z.object({
  auditDate: dateLike,
  auditType: z.string().trim().default('CAPABILITY'),
  score: z.coerce.number().min(0).max(100).optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'PASSED', 'FAILED']).default('IN_PROGRESS'),
  findings: optionalString,
  reportFileId: id.optional(),
  nextAuditDate: dateLike.optional(),
});

// ---------------------------------------------------------------------------
// Module 2 — components and processes
// ---------------------------------------------------------------------------

export const createComponentSchema = z.object({
  companyId: id,
  componentCode: z.string().trim().min(2),
  name: z.string().trim().min(2),
  productId: id.optional(),
  drawingNumber: optionalString,
  materialGrade: optionalString,
  theoreticalWeightKg: nonNegative.optional(),
  primaryProcess: z.enum(PROCESS_TYPES),
  inspectionLevel: z.enum(INSPECTION_LEVELS).default('LEVEL_2_SAMPLING'),
  criticality: z.enum(CRITICALITY_CLASSES).default('CLASS_C'),
  standardCycleTimeMinutes: nonNegative.optional(),
  standardConversionRate: nonNegative.optional(),
  packagingRequirement: optionalString,
  outsourcingEligibilityScore: z.coerce.number().int().min(0).max(100).default(50),
  scrapAllowancePercent: z.coerce.number().min(0).max(100).default(5),
});
export type CreateComponentInput = z.infer<typeof createComponentSchema>;

export const updateComponentSchema = createComponentSchema.partial().omit({ companyId: true });

export const componentProcessSchema = z.object({
  processCode: z.enum(PROCESS_TYPES),
  sequence: z.coerce.number().int().min(1).default(1),
  cycleTimeMinutes: nonNegative.optional(),
  isOutsourced: z.boolean().default(true),
  remarks: optionalString,
});

export const componentItemSchema = z.object({
  itemId: id,
  quantityPerUnit: positive,
  uom: z.string().trim().default('KG'),
});

export const approvePartnerComponentSchema = z.object({
  partnerId: id,
  firstArticleDone: z.boolean().default(false),
  remarks: optionalString,
});

export const createItemSchema = z.object({
  code: z.string().trim().min(2),
  name: z.string().trim().min(2),
  uom: z.string().trim().default('KG'),
  materialGrade: optionalString,
  unitWeightKg: nonNegative.optional(),
  standardRate: nonNegative.optional(),
});

export const createProductSchema = z.object({
  companyId: id,
  code: z.string().trim().min(2),
  name: z.string().trim().min(2),
  description: optionalString,
});

// ---------------------------------------------------------------------------
// Module 3 — drawings
// ---------------------------------------------------------------------------

export const createDrawingSchema = z.object({
  companyId: id,
  componentId: id.optional(),
  drawingNumber: z.string().trim().min(2),
  title: z.string().trim().min(2),
  description: optionalString,
});

export const createRevisionSchema = z.object({
  revisionCode: z.string().trim().min(1).max(6),
  fileId: id,
  changeNote: optionalString,
  issueDate: dateLike.optional(),
  expiryDate: dateLike.optional(),
});

export const releaseRevisionSchema = z.object({
  issueDate: dateLike.optional(),
  expiryDate: dateLike.optional(),
  notifyPartners: z.boolean().default(true),
});

export const grantDrawingAccessSchema = z.object({
  partnerId: id,
  jobId: id.optional(),
  mode: z.enum(DRAWING_ACCESS_MODES).default('VIEW_ONLY'),
  expiresAt: dateLike.optional(),
});

export const acknowledgeRevisionSchema = z.object({ remarks: optionalString });

export const engineeringChangeSchema = z.object({
  drawingId: id.optional(),
  revisionId: id.optional(),
  title: z.string().trim().min(3),
  description: z.string().trim().min(5),
  impact: optionalString,
});

// ---------------------------------------------------------------------------
// Module 4 — jobs
// ---------------------------------------------------------------------------

/**
 * Section 11 `GridJobItem` — a job raised from one order that covers several components. The model
 * existed with no write path, so a multi-component requirement had to be split into separate jobs
 * and lost its link to the order.
 */
export const jobItemSchema = z.object({
  componentId: id,
  drawingRevisionId: id.optional(),
  quantity: positive,
  rate: nonNegative,
});

export const createJobSchema = z.object({
  companyId: id,
  source: z.enum(JOB_SOURCES).default('MANUAL'),
  sourceRef: optionalString,
  customerProject: optionalString,
  productId: id.optional(),
  componentId: id,
  drawingRevisionId: id.optional(),
  quantity: positive,
  partnerId: id.optional(),
  plannedStartDate: dateLike.optional(),
  dueDate: dateLike,
  materialResponsibility: z.enum(MATERIAL_RESPONSIBILITIES).default('OSWAR_SUPPLIED'),
  rate: nonNegative,
  inspectionPlanId: id.optional(),
  deliveryLocation: optionalString,
  priority: z.enum(JOB_PRIORITIES).default('NORMAL'),
  notes: optionalString,
  classAOverrideReason: optionalString,
  /**
   * Additional components on the same job. The `componentId` above stays the job's primary line —
   * it is what the status workflow, the inspection plan and the drawing revision hang off — and
   * these are the further lines that travelled on the same order.
   */
  items: z.array(jobItemSchema).default([]),
});
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type JobItemInput = z.infer<typeof jobItemSchema>;

export const updateJobSchema = createJobSchema.partial().omit({ companyId: true, items: true });

export const allocateJobSchema = z.object({
  partnerId: id,
  rate: nonNegative.optional(),
  classAOverrideReason: optionalString,
  grantDrawingAccess: z.boolean().default(true),
});

export const respondToJobSchema = z.object({
  accepted: z.boolean(),
  declineReason: optionalString,
});

export const updateMilestoneSchema = z.object({
  type: z.enum(MILESTONE_TYPES),
  quantityCompleted: nonNegative.optional(),
  remarks: optionalString,
  expectedCompletionDate: dateLike.optional(),
  photographFileIds: z.array(id).default([]),
  delayReason: z.enum(DELAY_REASONS).optional(),
  clientRequestId: z.string().min(6).optional(),
  /** Where the phone was when the evidence photograph was taken, if it offered a position. */
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

export const reportDelaySchema = z.object({
  reason: z.enum(DELAY_REASONS),
  responsibility: z.enum(RESPONSIBLE_PARTIES).optional(),
  delayDays: z.coerce.number().int().min(0).default(0),
  detail: optionalString,
  expectedCompletionDate: dateLike.optional(),
});

export const clarificationSchema = z.object({ question: z.string().trim().min(5) });
export const answerClarificationSchema = z.object({ answer: z.string().trim().min(2) });

export const closeJobSchema = z.object({
  receivedQuantity: nonNegative.optional(),
  remarks: optionalString,
});

// ---------------------------------------------------------------------------
// Module 5 — capacity
// ---------------------------------------------------------------------------

export const capacityDeclarationSchema = z.object({
  partnerId: id.optional(),
  processCode: z.enum(PROCESS_TYPES),
  periodType: z.enum(CAPACITY_PERIOD_TYPES).default('WEEKLY'),
  periodStart: dateLike,
  periodEnd: dateLike,
  availableHours: nonNegative,
  availableWorkers: z.coerce.number().int().min(0).default(0),
  availableMachines: z.coerce.number().int().min(0).default(0),
  maintenanceShutdownHours: nonNegative.default(0),
  expectedBottleneck: optionalString,
});
export type CapacityDeclarationInput = z.infer<typeof capacityDeclarationSchema>;

// ---------------------------------------------------------------------------
// Module 6 — materials
// ---------------------------------------------------------------------------

export const materialIssueItemSchema = z.object({
  itemId: id,
  quantity: positive,
  uom: z.string().trim().default('KG'),
  issueWeightKg: positive,
  batchNumber: optionalString,
  heatNumber: optionalString,
  theoreticalQuantity: nonNegative.optional(),
  remarks: optionalString,
});

export const createMaterialIssueSchema = z.object({
  jobId: id,
  expectedReturnDate: dateLike.optional(),
  vehicleNumber: optionalString,
  driverName: optionalString,
  remarks: optionalString,
  items: z.array(materialIssueItemSchema).min(1, 'Add at least one material line'),
  photographFileIds: z.array(id).default([]),
});
export type CreateMaterialIssueInput = z.infer<typeof createMaterialIssueSchema>;

export const acknowledgeMaterialSchema = z.object({
  receivedWeightKg: nonNegative,
  shortageWeightKg: nonNegative.default(0),
  damageRemarks: optionalString,
  signatureName: optionalString,
  photographFileIds: z.array(id).default([]),
  clientRequestId: z.string().min(6).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export const updateConsumptionSchema = z.object({
  itemId: id,
  theoreticalKg: nonNegative,
  actualKg: nonNegative,
  remarks: optionalString,
});

export const recordScrapSchema = z.object({
  itemId: id,
  scrapWeightKg: nonNegative,
  returnedWeightKg: nonNegative.default(0),
  challanNumber: optionalString,
  remarks: optionalString,
});

export const completeReconciliationSchema = z.object({
  itemId: id,
  unusedReturnedKg: nonNegative.default(0),
  remarks: optionalString,
});

/**
 * Module 6 — a movement of material recorded by hand.
 *
 * Issue, consumption and scrap each have their own flow; this covers the four transaction types
 * that had none: material rejected and sent back, replacement material issued against it, unused
 * material returned outside reconciliation, and excess found at the partner.
 */
export const recordMaterialTransactionSchema = z
  .object({
    jobId: id,
    itemId: id,
    type: z.enum(MATERIAL_TRANSACTION_TYPES),
    quantityKg: positive,
    materialIssueId: id.optional(),
    batchNumber: optionalString,
    heatNumber: optionalString,
    /** Required on REPLACEMENT_MATERIAL: the rejection this replaces. */
    replacesTransactionId: id.optional(),
    reference: optionalString,
    remarks: optionalString,
    occurredAt: dateLike.optional(),
    photographFileIds: z.array(id).default([]),
  })
  .superRefine((value, ctx) => {
    if (!MANUAL_TRANSACTION_TYPES.includes(value.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['type'],
        message:
          'This movement is recorded by the issue, acknowledgement, consumption or reconciliation ' +
          'flow rather than by hand.',
      });
    }
    if (value.type === 'REPLACEMENT_MATERIAL' && !value.replacesTransactionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['replacesTransactionId'],
        message: 'Say which rejected material this replaces, so the two can be traced together.',
      });
    }
  });
export type RecordMaterialTransactionInput = z.infer<typeof recordMaterialTransactionSchema>;

export const materialTransactionQuerySchema = z.object({
  jobId: id.optional(),
  partnerId: id.optional(),
  itemId: id.optional(),
  type: z.enum(MATERIAL_TRANSACTION_TYPES).optional(),
  from: dateLike.optional(),
  to: dateLike.optional(),
});

/** Module 6 step 2 — the requirement a job's bill of material implies. */
export const materialRequirementQuerySchema = z.object({ jobId: id });

// ---------------------------------------------------------------------------
// Module 8 — quality
// ---------------------------------------------------------------------------

export const inspectionCharacteristicSchema = z.object({
  sequence: z.coerce.number().int().min(1).default(1),
  characteristic: z.string().trim().min(2),
  specification: z.string().trim().min(1),
  nominalValue: z.coerce.number().optional(),
  upperTolerance: z.coerce.number().optional(),
  lowerTolerance: z.coerce.number().optional(),
  unit: optionalString,
  measuringInstrument: optionalString,
  isCritical: z.boolean().default(false),
});

export const createInspectionPlanSchema = z.object({
  companyId: id,
  componentId: id,
  name: z.string().trim().min(2),
  inspectionType: z.enum(INSPECTION_TYPES).default('FINAL'),
  samplingPlan: optionalString,
  /** Share of the offered lot that must be measured. Blank falls back to the inspection level. */
  samplePercent: z.coerce.number().min(0).max(100).optional(),
  minSampleSize: z.coerce.number().int().min(0).optional(),
  characteristics: z.array(inspectionCharacteristicSchema).min(1),
});

export const requestInspectionSchema = z.object({
  jobId: id,
  type: z.enum(INSPECTION_TYPES).default('FINAL'),
  offeredQuantity: positive,
  inspectionPlanId: id.optional(),
  remarks: optionalString,
  photographFileIds: z.array(id).default([]),
});

export const assignInspectionSchema = z.object({ inspectorId: id, dueAt: dateLike.optional() });

export const inspectionResultSchema = z.object({
  characteristicId: id.optional(),
  characteristicName: z.string().trim().min(1),
  specification: optionalString,
  tolerance: optionalString,
  actualValue: optionalString,
  numericValue: z.coerce.number().optional(),
  measuringInstrument: optionalString,
  verdict: z.enum(RESULT_VERDICTS).default('PASS'),
  sampleNumber: z.coerce.number().int().min(1).default(1),
  remarks: optionalString,
});

export const saveInspectionResultsSchema = z.object({
  inspectedQuantity: nonNegative.optional(),
  results: z.array(inspectionResultSchema).min(1),
  photographFileIds: z.array(id).default([]),
});

export const completeInspectionSchema = z
  .object({
    decision: z.enum(INSPECTION_DECISIONS),
    acceptedQuantity: nonNegative.default(0),
    rejectedQuantity: nonNegative.default(0),
    reworkQuantity: nonNegative.default(0),
    remarks: optionalString,
    photographFileIds: z.array(id).default([]),
    // required when the decision creates a non-conformance
    defectType: z.enum(DEFECT_TYPES).optional(),
    probableCause: optionalString,
    responsibility: z.enum(RESPONSIBLE_PARTIES).optional(),
    reworkCost: nonNegative.optional(),
    materialLoss: nonNegative.optional(),
    customerImpact: optionalString,
    reworkInstructions: optionalString,
    reworkDueDate: dateLike.optional(),
    deviationNote: optionalString,
  })
  .superRefine((value, ctx) => {
    if (
      (value.decision === 'REJECTED' || value.decision === 'REWORK_REQUIRED') &&
      !value.defectType
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['defectType'],
        message: 'Defect type is required for rejection or rework',
      });
    }
    if (value.decision === 'REWORK_REQUIRED' && !value.reworkInstructions) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reworkInstructions'],
        message: 'Rework instructions are required',
      });
    }
    if (value.decision === 'ACCEPTED_WITH_DEVIATION' && !value.deviationNote) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deviationNote'],
        message: 'Describe the deviation being approved',
      });
    }
  });
export type CompleteInspectionInput = z.infer<typeof completeInspectionSchema>;

export const createReworkSchema = z.object({
  jobId: id,
  inspectionId: id.optional(),
  nonConformanceId: id.optional(),
  quantity: positive,
  instructions: z.string().trim().min(5),
  estimatedCost: nonNegative.default(0),
  chargeToPartner: z.boolean().default(true),
  dueDate: dateLike.optional(),
});

export const updateReworkStatusSchema = z.object({
  status: z.enum(REWORK_STATUSES),
  completedQuantity: nonNegative.optional(),
  scrappedQuantity: nonNegative.optional(),
  actualCost: nonNegative.optional(),
  remarks: optionalString,
});

export const createCorrectiveActionSchema = z.object({
  nonConformanceId: id,
  ownerId: id.optional(),
  dueDate: dateLike.optional(),
  containment: optionalString,
});

export const advanceCorrectiveActionSchema = z.object({
  stage: z.enum(CORRECTIVE_ACTION_STAGES),
  containment: optionalString,
  rootCause: optionalString,
  correctiveAction: optionalString,
  verification: optionalString,
});

export const decideDeviationSchema = z.object({
  status: z.enum(DEVIATION_STATUSES),
  decisionNote: optionalString,
});

// ---------------------------------------------------------------------------
// Module 9 — tooling
// ---------------------------------------------------------------------------

export const createToolSchema = z.object({
  companyId: id,
  category: z.enum(TOOL_CATEGORIES).default('TOOL'),
  description: z.string().trim().min(2),
  ownerName: z.string().trim().default('OSWAR'),
  condition: z.enum(TOOL_CONDITIONS).default('GOOD'),
  calibrationRequired: z.boolean().default(false),
  calibrationFrequencyDays: z.coerce.number().int().min(1).optional(),
  replacementValue: nonNegative.default(0),
  photoFileId: id.optional(),
});

export const issueToolSchema = z.object({
  partnerId: id,
  jobId: id.optional(),
  expectedReturnDate: dateLike.optional(),
  conditionOnIssue: z.enum(TOOL_CONDITIONS).default('GOOD'),
  remarks: optionalString,
});

export const returnToolSchema = z.object({
  conditionOnReturn: z.enum(TOOL_CONDITIONS).default('GOOD'),
  remarks: optionalString,
});

export const calibrationSchema = z.object({
  calibratedAt: dateLike.optional(),
  nextDueAt: dateLike.optional(),
  agency: optionalString,
  certificateNo: optionalString,
  result: optionalString,
});

// ---------------------------------------------------------------------------
// Module 10 — logistics
// ---------------------------------------------------------------------------

export const createShipmentSchema = z.object({
  companyId: id,
  direction: z.enum(SHIPMENT_DIRECTIONS),
  fromPartnerId: id.optional(),
  toPartnerId: id.optional(),
  pickupLocation: z.string().trim().min(2),
  deliveryLocation: z.string().trim().min(2),
  materialType: optionalString,
  weightKg: nonNegative.default(0),
  vehicleId: id.optional(),
  driverName: optionalString,
  driverPhone: phone.optional(),
  plannedPickupAt: dateLike,
  expectedDeliveryAt: dateLike.optional(),
  transportCost: nonNegative.default(0),
  remarks: optionalString,
  items: z
    .array(
      z.object({
        jobId: id.optional(),
        materialIssueId: id.optional(),
        description: z.string().trim().min(1),
        quantity: nonNegative.default(0),
        weightKg: nonNegative.default(0),
      }),
    )
    .default([]),
});

export const updateShipmentStatusSchema = z.object({
  status: z.enum(SHIPMENT_STATUSES),
  actualPickupAt: dateLike.optional(),
  actualDeliveryAt: dateLike.optional(),
  remarks: optionalString,
});

export const proofOfDeliverySchema = z.object({
  receivedBy: z.string().trim().min(2),
  receivedAt: dateLike.optional(),
  signatureFileId: id.optional(),
  photoFileId: id.optional(),
  remarks: optionalString,
});

export const createVehicleSchema = z.object({
  registrationNo: z.string().trim().min(4),
  vehicleType: z.string().trim().min(2),
  capacityKg: nonNegative.optional(),
  ownerName: optionalString,
  driverName: optionalString,
  driverPhone: phone.optional(),
});

// ---------------------------------------------------------------------------
// Module 11 — commercials
// ---------------------------------------------------------------------------

export const createRateSchema = z.object({
  companyId: id,
  partnerId: id,
  componentId: id,
  conversionRate: positive,
  effectiveFrom: dateLike,
  effectiveTo: dateLike.optional(),
  minimumBatch: nonNegative.default(1),
  revisionNote: optionalString,
});

export const submitInvoiceSchema = z.object({
  partnerInvoiceNo: optionalString,
  periodFrom: dateLike.optional(),
  periodTo: dateLike.optional(),
  jobIds: z.array(id).min(1, 'Select at least one job'),
  fileId: id.optional(),
  taxPercent: z.coerce.number().min(0).max(28).default(0),
});
export type SubmitInvoiceInput = z.infer<typeof submitInvoiceSchema>;

export const invoiceActionSchema = z.object({
  approved: z.boolean().default(true),
  remarks: optionalString,
});

export const holdInvoiceSchema = z.object({ holdReason: z.string().trim().min(5) });

export const scheduleInvoiceSchema = z.object({ paymentScheduledFor: dateLike });

export const recordPaymentSchema = z.object({
  amount: positive,
  mode: z.enum(PAYMENT_MODES).default('NEFT'),
  referenceNo: optionalString,
  paidAt: dateLike.optional(),
  remarks: optionalString,
});

export const deductionSchema = z.object({
  partnerId: id,
  invoiceId: id.optional(),
  type: z.enum(ADJUSTMENT_TYPES),
  reason: z.string().trim().min(3),
  amount: positive,
});

/**
 * Section 18 - role administration. Only the human-readable side of a role is editable; the
 * permission matrix stays in code so every environment enforces the same grants.
 */
export const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(400).optional(),
});

export const incentiveRuleSchema = z.object({
  partnerId: id.optional(),
  type: z.enum(ADJUSTMENT_TYPES),
  name: z.string().trim().min(2),
  percentage: z.coerce.number().min(0).max(100).optional(),
  fixedAmount: nonNegative.optional(),
  condition: optionalString,
  /** The performance level that earns this rule. Leave unset to award it by hand. */
  thresholdPercent: z.coerce.number().min(0).max(100).optional(),
});

// ---------------------------------------------------------------------------
// Module 12 — scorecard
// ---------------------------------------------------------------------------

export const computeScorecardSchema = z.object({
  partnerId: id.optional(),
  periodMonth: z.coerce.number().int().min(1).max(12),
  periodYear: z.coerce.number().int().min(2020).max(2100),
});

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export const uploadIntentSchema = z.object({
  originalName: z.string().trim().min(1),
  mimeType: z.string().trim().min(3),
  sizeBytes: z.coerce.number().int().min(1),
  category: z.enum(FILE_CATEGORIES).default('OTHER'),
});

// ---------------------------------------------------------------------------
// Common query helpers
// ---------------------------------------------------------------------------

/**
 * Section 7 — system settings. Only keys in the catalogue may be written, so the screen cannot
 * invent a setting no rule honours.
 */
export const updateSettingSchema = z.object({
  value: z.union([z.boolean(), z.coerce.number(), z.array(z.string()), z.string()]),
});

export const settingKeySchema = z.enum(SETTING_KEYS as [string, ...string[]]);

/** Section 19 — a partner switching their own interface language. */
export const updateLanguageSchema = z.object({ language: z.enum(LANGUAGES) });

/** Module 5 — the capacity board, optionally rolled up by location. */
export const capacityWindowSchema = z.object({
  from: dateLike,
  to: dateLike,
  partnerId: id.optional(),
  processCode: z.enum(PROCESS_TYPES).optional(),
  city: optionalString,
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

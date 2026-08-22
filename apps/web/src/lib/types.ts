/** Response shapes returned by the GRID-X API, as consumed by the web app. */

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const emptyPage = <T>(): Paginated<T> => ({
  data: [],
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 1,
});

export interface PartnerRow {
  id: string;
  partnerCode: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string | null;
  city: string;
  state: string;
  distanceKm: number | null;
  category: string;
  level: string;
  approvalStatus: string;
  auditStatus: string;
  maxCapacityHours: number;
  paymentTermsDays: number;
  currentScore: number | null;
  isActive: boolean;
  capabilities?: { id: string; process: string; isApproved: boolean; monthlyCapacityHours: number }[];
  _count?: { jobs: number; users: number };
}

export interface JobRow {
  id: string;
  jobNumber: string;
  componentCode: string;
  componentName: string;
  criticality: string;
  partnerId: string | null;
  partnerName: string | null;
  quantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  status: string;
  priority: string;
  dueDate: string;
  rate: number;
  value: number;
  latestMilestone: string | null;
  isOverdue: boolean;
  materialResponsibility: string;
  delayDays: number;
}

export interface ComponentRow {
  id: string;
  componentCode: string;
  name: string;
  drawingNumber: string | null;
  materialGrade: string | null;
  theoreticalWeightKg: number | null;
  primaryProcess: string;
  inspectionLevel: string;
  criticality: string;
  standardCycleTimeMinutes: number | null;
  standardConversionRate: number | null;
  scrapAllowancePercent: number;
  outsourcingEligibilityScore: number;
  isActive: boolean;
  product?: { code: string; name: string } | null;
  _count?: { drawings: number; jobs: number; approvedPartners: number };
}

export interface DrawingRow {
  id: string;
  drawingNumber: string;
  title: string;
  componentCode: string | null;
  currentRevisionId: string | null;
  currentRevisionCode: string | null;
  status: string | null;
  revisionCount: number;
  releasedAt: string | null;
  pendingAcknowledgements: number;
}

export interface ItemRow {
  id: string;
  code: string;
  name: string;
  uom: string;
  materialGrade: string | null;
  unitWeightKg: number | null;
  standardRate: number | null;
  isActive: boolean;
}

export interface ProductRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface ProcessRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  standardRatePerHour: number | null;
  isActive: boolean;
}

export interface InspectionPlanRow {
  id: string;
  name: string;
  inspectionType: string;
  samplingPlan: string | null;
  version: number;
  isActive: boolean;
  component: { componentCode: string; name: string };
  characteristics: {
    id: string;
    sequence: number;
    characteristic: string;
    specification: string;
    unit: string | null;
    measuringInstrument: string | null;
    isCritical: boolean;
  }[];
}

export interface MaterialIssueRow {
  id: string;
  challanNumber: string;
  status: string;
  issueDate: string;
  expectedReturnDate: string | null;
  totalIssueWeightKg: number;
  vehicleNumber: string | null;
  driverName: string | null;
  job: { id: string; jobNumber: string; component?: { componentCode: string; name: string } } | null;
  partner: { id: string; businessName: string } | null;
  items: {
    id: string;
    quantity: number;
    uom: string;
    issueWeightKg: number | null;
    heatNumber: string | null;
    item: { code: string; name: string };
  }[];
  acknowledgements: { id: string; receivedWeightKg: number; shortageWeightKg: number; acknowledgedAt: string }[];
}

export interface InspectionRow {
  id: string;
  inspectionNumber: string;
  type: string;
  status: string;
  decision: string | null;
  offeredQuantity: number;
  inspectedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  reworkQuantity: number;
  requestedAt: string;
  completedAt: string | null;
  job: { id: string; jobNumber: string; component?: { componentCode: string; name: string } } | null;
  partner: { id: string; businessName: string } | null;
  inspector: { id: string; name: string } | null;
}

export interface NonConformanceRow {
  id: string;
  ncNumber: string;
  defectType: string;
  quantityAffected: number;
  probableCause: string | null;
  responsibility: string;
  reworkCost: number;
  materialLoss: number;
  correctiveActionRequired: boolean;
  raisedAt: string;
  closedAt: string | null;
  job: { id: string; jobNumber: string } | null;
  partner: { id: string; businessName: string } | null;
  correctiveActions: { id: string; status: string; action: string | null }[];
  reworkOrders: { id: string; reworkNumber: string; status: string }[];
}

export interface ReworkRow {
  id: string;
  reworkNumber: string;
  status: string;
  quantity: number;
  instructions: string;
  estimatedCost: number;
  chargeToPartner: boolean;
  issuedAt: string;
  completedAt: string | null;
  dueDate: string | null;
  job: { id: string; jobNumber: string; component?: { name: string } } | null;
}

export interface ShipmentRow {
  id: string;
  shipmentNumber: string;
  direction: string;
  status: string;
  pickupLocation: string;
  deliveryLocation: string;
  weightKg: number;
  transportCost: number;
  driverName: string | null;
  driverPhone: string | null;
  plannedPickupAt: string;
  actualPickupAt: string | null;
  expectedDeliveryAt: string | null;
  actualDeliveryAt: string | null;
  vehicle: { registrationNo: string; vehicleType: string } | null;
  fromPartner: { id: string; businessName: string } | null;
  toPartner: { id: string; businessName: string } | null;
  items?: { id: string; description: string; quantity: number; weightKg: number }[];
}

export interface VehicleRow {
  id: string;
  registrationNo: string;
  vehicleType: string;
  capacityKg: number | null;
  ownerName: string | null;
  driverName: string | null;
  driverPhone: string | null;
  isActive: boolean;
}

export interface ToolRow {
  id: string;
  toolCode: string;
  category: string;
  description: string;
  ownerName: string;
  condition: string;
  currentPartnerId: string | null;
  calibrationRequired: boolean;
  calibrationFrequencyDays: number | null;
  lastCalibratedAt: string | null;
  nextCalibrationDue: string | null;
  replacementValue: number;
  issues: { id: string; status: string; partner: { id: string; businessName: string } | null }[];
  calibrations: { id: string; calibratedAt: string; result: string | null }[];
}

export interface RateRow {
  id: string;
  conversionRate: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  minimumBatch: number;
  isActive: boolean;
  previousRate: number | null;
  partner: { id: string; businessName: string };
  component: { id: string; componentCode: string; name: string };
}

export interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  partnerInvoiceNo: string | null;
  status: string;
  invoiceDate: string;
  periodFrom: string;
  periodTo: string;
  basicAmount: number;
  incentiveAmount: number;
  deductionAmount: number;
  taxAmount: number;
  netAmount: number;
  quantityVerifiedAt: string | null;
  qualityVerifiedAt: string | null;
  materialReconciledAt: string | null;
  financeApprovedAt: string | null;
  paymentScheduledFor: string | null;
  paidAt: string | null;
  holdReason: string | null;
  partner: { id: string; businessName: string };
  items: {
    id: string;
    acceptedQuantity: number;
    conversionRate: number;
    amount: number;
    description: string | null;
    jobId: string | null;
  }[];
  payments: { id: string; amount: number; paidAt: string; reference: string | null; mode: string }[];
  approvals?: { id: string; stage: string; decision: string; remarks: string | null; createdAt: string }[];
}

export interface UserRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  userType: string;
  status: string;
  designation: string | null;
  language: string;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  role: { code: string; name: string };
  partner: { id: string; businessName: string } | null;
}

export interface RoleRow {
  id: string;
  code: string;
  name: string;
  label: string;
  description: string | null;
  isPartnerRole: boolean;
  permissions: string[];
}

export interface CompanyRow {
  id: string;
  code: string;
  name: string;
  legalName: string | null;
  gstNumber: string | null;
  city: string | null;
  state: string | null;
  currency: string;
  isActive: boolean;
}

export interface SettingRow {
  id: string;
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface AuditLogRow {
  id: string;
  actorLabel: string | null;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string | null;
  createdAt: string;
}

export interface ScorecardRow {
  id: string;
  partnerId: string;
  periodMonth: number;
  periodYear: number;
  totalScore: number;
  category: string;
  recommendation: string;
  jobsCompleted: number;
  jobsOnTime: number;
  quantityAccepted: number;
  quantityRejected: number;
  computedAt: string;
  partner?: { id: string; businessName: string; city: string; category: string };
  kpis: { id: string; code: string; weight: number; value: number; weighted: number }[];
}

export interface LeaderboardResult {
  weights: Record<string, number>;
  categoryMix: Record<string, number>;
  averageScore: number;
  rows: {
    rank: number;
    partnerId: string;
    partnerName: string;
    city: string;
    totalScore: number;
    category: string;
    recommendation: string;
    jobsCompleted: number;
    jobsOnTime: number;
  }[];
}

export interface CapacityDeclarationRow {
  id: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  availableHours: number;
  committedHours: number;
  availableWorkers: number;
  availableMachines: number;
  expectedBottleneck: string | null;
  partner: { id: string; partnerCode: string; businessName: string };
  process: { id: string; code: string; name: string };
}

export interface CapacityHeatmapCell {
  partnerId: string;
  partnerCode: string;
  businessName: string;
  processCode: string;
  periodStart: string;
  periodEnd: string;
  availableHours: number;
  committedHours: number;
  freeHours: number;
  utilisationPercent: number;
  expectedBottleneck: string | null;
}

export interface ReportDefinition {
  key: string;
  title: string;
}

export interface ReportColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'date' | 'percent';
}

export interface ReportResult {
  key: string;
  title: string;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  generatedAt: string;
}

export interface ImsStatus {
  enabled: boolean;
  configured: boolean;
  baseUrl?: string;
  timeoutMs: number;
}

export interface ImsLogRow {
  id: string;
  direction: string;
  entity: string;
  recordRef: string | null;
  success: boolean;
  message: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Detail shapes
// ---------------------------------------------------------------------------

export interface PartnerDetail {
  id: string;
  partnerCode: string;
  businessName: string;
  ownerName: string;
  phone: string;
  altPhone: string | null;
  email: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  distanceKm: number | null;
  udyamNumber: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNo: string | null;
  bankIfsc: string | null;
  category: string;
  level: string;
  approvalStatus: string;
  auditStatus: string;
  paymentTermsDays: number;
  maxCapacityHours: number;
  maxOpenJobs: number;
  isActive: boolean;
  suspendedReason: string | null;
  currentScore: number | null;
  notes: string | null;
  openJobs: number;
  canAllocate: boolean;
  company: { id: string; name: string };
  capabilities: {
    id: string;
    process: string;
    isCapable: boolean;
    isApproved: boolean;
    maxSizeMm: number | null;
    maxWeightKg: number | null;
    toleranceMm: number | null;
    monthlyCapacityHours: number;
  }[];
  machines: {
    id: string;
    machineType: string;
    make: string | null;
    model: string | null;
    capacity: string | null;
    condition: string;
    ownership: string;
    quantity: number;
  }[];
  documents: {
    id: string;
    type: string;
    documentNo: string | null;
    expiryDate: string | null;
    verified: boolean;
  }[];
  employees: { id: string; name: string; skill: string | null; phone: string | null; isSupervisor: boolean }[];
  audits: {
    id: string;
    auditDate: string;
    auditType: string;
    score: number | null;
    status: string;
    findings: string | null;
    nextAuditDate: string | null;
  }[];
  statusHistory: {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    reason: string | null;
    createdAt: string;
    changedBy: { id: string; name: string } | null;
  }[];
  approvedComponents: {
    id: string;
    firstArticleDone: boolean;
    component: { id: string; componentCode: string; name: string };
  }[];
  scores: { id: string; periodMonth: number; periodYear: number; totalScore: number; category: string }[];
  rates: { id: string; conversionRate: number; component: { componentCode: string; name: string } }[];
  users: { id: string; name: string; phone: string | null; email: string | null; status: string }[];
  _count: { jobs: number; invoices: number; nonConformances: number };
}

export interface JobDetail {
  id: string;
  jobNumber: string;
  status: string;
  priority: string;
  quantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  reworkQuantity: number;
  rate: number;
  source: string;
  sourceRef: string | null;
  customerProject: string | null;
  materialResponsibility: string;
  deliveryLocation: string | null;
  notes: string | null;
  plannedStartDate: string | null;
  dueDate: string;
  acceptedAt: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  productionStartedAt: string | null;
  completedAt: string | null;
  closedAt: string | null;
  dispatchedQuantity: number;
  receivedQuantity: number;
  classAOverrideReason: string | null;
  component: {
    id: string;
    componentCode: string;
    name: string;
    criticality: string;
    inspectionLevel: string;
    materialGrade: string | null;
    theoreticalWeightKg: number | null;
    processes: { id: string; sequence: number; process: { code: string; name: string } }[];
  };
  partner: {
    id: string;
    partnerCode: string;
    businessName: string;
    ownerName: string;
    phone: string;
    city: string;
    currentScore: number | null;
    category: string;
  } | null;
  drawingRevision: {
    id: string;
    revisionCode: string;
    status: string;
    drawing: { id: string; drawingNumber: string; title: string };
  } | null;
  inspectionPlan: {
    id: string;
    name: string;
    characteristics: { id: string; sequence: number; characteristic: string; specification: string; unit: string | null; measuringInstrument: string | null; isCritical: boolean }[];
  } | null;
  assignments: {
    id: string;
    accepted: boolean | null;
    assignedAt: string;
    respondedAt: string | null;
    declineReason: string | null;
    partner: { id: string; businessName: string } | null;
  }[];
  milestones: {
    id: string;
    type: string;
    quantityCompleted: number | null;
    remarks: string | null;
    reportedAt: string;
    syncedFromOffline: boolean;
  }[];
  statusHistory: { id: string; fromStatus: string | null; toStatus: string; reason: string | null; createdAt: string }[];
  delays: { id: string; reason: string; responsibility: string; delayDays: number; detail: string | null; reportedAt: string }[];
  clarifications: { id: string; question: string; answer: string | null; status: string; raisedAt: string }[];
  materialIssues: {
    id: string;
    challanNumber: string;
    status: string;
    issueDate: string;
    totalIssueWeightKg: number;
    items: { id: string; quantity: number; uom: string; issueWeightKg: number | null; item: { code: string; name: string } }[];
  }[];
  inspections: {
    id: string;
    inspectionNumber: string;
    type: string;
    status: string;
    decision: string | null;
    offeredQuantity: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
    requestedAt: string;
  }[];
  reworkOrders: { id: string; reworkNumber: string; status: string; quantity: number }[];
  invoiceItems: { id: string; amount: number; invoice: { id: string; invoiceNumber: string; status: string } }[];
  reconciliations: {
    id: string;
    status: string;
    issuedKg: number;
    consumedKg: number;
    scrapReturnedKg: number;
    unusedReturnedKg: number;
    shortageKg: number;
    excessKg: number;
    deductionAmount: number;
    item: { code: string; name: string };
  }[];
}

export interface InspectionDetail extends InspectionRow {
  remarks: string | null;
  inspectionPlan: {
    id: string;
    name: string;
    characteristics: {
      id: string;
      sequence: number;
      characteristic: string;
      specification: string;
      unit: string | null;
      measuringInstrument: string | null;
      isCritical: boolean;
    }[];
  } | null;
  results: {
    id: string;
    characteristicName: string;
    specification: string | null;
    actualValue: string | null;
    verdict: string;
    sampleNumber: number;
    remarks: string | null;
    recordedAt: string;
  }[];
  nonConformances: { id: string; ncNumber: string; defectType: string; quantityAffected: number }[];
  reworkOrders: { id: string; reworkNumber: string; status: string; quantity: number }[];
  deviations: { id: string; status: string; requestNote: string | null; decisionNote: string | null }[];
}

export interface ReconciliationRow {
  itemId: string;
  itemCode: string;
  itemName: string;
  issuedKg: number;
  consumedKg: number;
  scrapReturnedKg: number;
  unusedReturnedKg: number;
  balanceKg: number;
  status: string;
  deductionAmount: number;
}

export interface InvoiceableJob {
  jobId: string;
  jobNumber: string;
  componentCode: string;
  componentName: string;
  acceptedQuantity: number;
  conversionRate: number;
  amount: number;
}

export interface EngineeringChangeRow {
  id: string;
  ecNumber: string;
  title: string;
  description: string;
  impact: string | null;
  status: string;
  raisedAt: string;
  decisionNote: string | null;
  drawing: { id: string; drawingNumber: string } | null;
}

export interface DrawingDetail {
  id: string;
  drawingNumber: string;
  title: string;
  description: string | null;
  component: { id: string; componentCode: string; name: string } | null;
  revisions: {
    id: string;
    revisionCode: string;
    status: string;
    changeNote: string | null;
    issueDate: string | null;
    expiryDate: string | null;
    releasedAt: string | null;
    createdAt: string;
    acknowledgements: { id: string; acknowledgedAt: string; partner: { id: string; businessName: string } | null }[];
    access: {
      id: string;
      mode: string;
      revokedAt: string | null;
      partner: { id: string; businessName: string } | null;
    }[];
  }[];
}

export interface ComponentDetail extends ComponentRow {
  packagingRequirement: string | null;
  processes: { id: string; sequence: number; cycleTimeMinutes: number | null; isOutsourced: boolean; process: { code: string; name: string } }[];
  items: { id: string; quantityPerUnit: number; uom: string; item: { code: string; name: string } }[];
  approvedPartners: {
    id: string;
    firstArticleDone: boolean;
    remarks: string | null;
    partner: { id: string; partnerCode: string; businessName: string; approvalStatus: string };
  }[];
  drawings: { id: string; drawingNumber: string; title: string }[];
}

export interface PartnerDashboard {
  partnerId: string;
  businessName: string;
  category: string;
  score: number | null;
  newJobs: number;
  activeJobs: number;
  awaitingMaterialAck: number;
  pendingInspections: number;
  reworkOpen: number;
  invoicesPending: number;
  paymentsDue: number;
  jobs: JobRow[];
}

export const emptyPartnerDashboard = (): PartnerDashboard => ({
  partnerId: '',
  businessName: '',
  category: 'C',
  score: null,
  newJobs: 0,
  activeJobs: 0,
  awaitingMaterialAck: 0,
  pendingInspections: 0,
  reworkOpen: 0,
  invoicesPending: 0,
  paymentsDue: 0,
  jobs: [],
});

/** Production → Delays. One recorded delay, with the job it belongs to (Module 7). */
export interface DelayRow {
  id: string;
  jobId: string;
  jobNumber: string;
  componentCode: string;
  componentName: string;
  partnerId: string | null;
  partnerName: string | null;
  jobStatus: string;
  dueDate: string | null;
  reason: string;
  responsibility: string;
  delayDays: number;
  detail: string | null;
  expectedCompletionDate: string | null;
  reportedByName: string | null;
  reportedAt: string;
  resolvedAt: string | null;
}

/** Production → Clarifications. A partner's question and its answer (Module 7). */
export interface ClarificationRow {
  id: string;
  jobId: string;
  jobNumber: string;
  componentCode: string;
  componentName: string;
  partnerId: string | null;
  partnerName: string | null;
  dueDate: string | null;
  question: string;
  answer: string | null;
  status: string;
  raisedByName: string | null;
  raisedAt: string;
  answeredByName: string | null;
  answeredAt: string | null;
  openForDays: number | null;
}

/** Section 7 screen 5 — the cross-partner capability matrix. */
export interface CapabilityMatrix {
  processes: string[];
  partners: {
    id: string;
    partnerCode: string;
    businessName: string;
    city: string;
    category: string;
    approvalStatus: string;
    allocatable: boolean;
    capabilities: Record<string, { approved: boolean; capacityHours: number }>;
  }[];
  coverage: { process: string; approvedPartners: number; allocatablePartners: number }[];
}

/** Quality → Corrective actions. Module 8's CAPA workflow, across all non-conformances. */
export interface CorrectiveActionRow {
  id: string;
  caNumber: string;
  stage: string;
  dueDate: string | null;
  closedAt: string | null;
  createdAt: string;
  ownerName: string | null;
  ncNumber: string;
  defectType: string;
  quantityAffected: number;
  jobId: string | null;
  jobNumber: string | null;
  partnerName: string | null;
  overdueDays: number | null;
}

/** Materials → Partner stock. OSWAR material currently held in partner workshops. */
export interface PartnerStock {
  rows: {
    partnerId: string;
    partnerName: string;
    jobId: string;
    jobNumber: string;
    jobStatus: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    issuedKg: number;
    consumedKg: number;
    scrapReturnedKg: number;
    balanceKg: number;
    oldestIssueDate: string | null;
    daysHeld: number | null;
  }[];
  totals: { issuedKg: number; balanceKg: number; partners: number };
}

/** Materials → Scrap. The scrap-return register (Module 6). */
export interface ScrapRow {
  id: string;
  jobId: string;
  jobNumber: string;
  partnerName: string | null;
  itemCode: string;
  itemName: string;
  scrapWeightKg: number;
  returnedWeightKg: number;
  outstandingKg: number;
  scrapPercent: number;
  challanNumber: string | null;
  returnedAt: string;
}

/** Commercial → Approvals. One stage sign-off on a partner invoice (Module 11). */
export interface PaymentApprovalRow {
  id: string;
  stage: string;
  approved: boolean;
  remarks: string | null;
  approverName: string | null;
  createdAt: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceStatus: string;
  netAmount: number;
  partnerName: string | null;
}

/** Partners → Machines. The network-wide machine register (Module 1). */
export interface MachineRow {
  id: string;
  partnerId: string;
  partnerName: string;
  city: string;
  machineType: string;
  make: string | null;
  model: string | null;
  size: string | null;
  capacity: string | null;
  accuracy: string | null;
  condition: string;
  ownership: string;
  quantity: number;
  lastServicedAt: string | null;
}

/** Partners → Audits. Every partner audit, newest first (Module 1). */
export interface PartnerAuditRow {
  id: string;
  partnerId: string;
  partnerName: string;
  city: string;
  auditDate: string;
  auditType: string;
  score: number | null;
  status: string;
  findings: string | null;
  auditorName: string | null;
  nextAuditDate: string | null;
}

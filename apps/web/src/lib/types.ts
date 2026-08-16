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

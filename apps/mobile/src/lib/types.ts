/** API response shapes, mirrored from apps/web/src/lib/types.ts — the mobile app owns no business logic. */

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  roleCode: string;
  permissions: string[];
  partnerId?: string | null;
  partnerName?: string | null;
  language?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  twoFactorEnrolmentRequired?: boolean;
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
  dispatchedQuantity: number;
  receivedQuantity: number;
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
    characteristics: PlanCharacteristic[];
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
  }[];
  statusHistory: {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    reason: string | null;
    createdAt: string;
  }[];
  delays: {
    id: string;
    reason: string;
    responsibility: string;
    delayDays: number;
    detail: string | null;
    reportedAt: string;
  }[];
  clarifications: {
    id: string;
    question: string;
    answer: string | null;
    status: string;
    raisedAt: string;
  }[];
  materialIssues: {
    id: string;
    challanNumber: string;
    status: string;
    issueDate: string;
    totalIssueWeightKg: number;
    items: {
      id: string;
      quantity: number;
      uom: string;
      issueWeightKg: number | null;
      item: { code: string; name: string };
    }[];
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
}

export interface PlanCharacteristic {
  id: string;
  sequence: number;
  characteristic: string;
  specification: string;
  unit: string | null;
  measuringInstrument: string | null;
  isCritical: boolean;
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
  startedAt: string | null;
  completedAt: string | null;
  dueAt: string | null;
  job: {
    id: string;
    jobNumber: string;
    quantity?: number;
    component?: { componentCode: string; name: string; criticality: string; materialGrade: string | null };
  } | null;
  partner: { id: string; businessName: string; city?: string } | null;
  inspector: { id: string; name: string } | null;
}

export interface InspectionDetail extends InspectionRow {
  remarks: string | null;
  inspectionPlan: { id: string; name: string; characteristics: PlanCharacteristic[] } | null;
  photographs: { id: string; url: string; caption: string | null; takenAt: string }[];
  results: {
    id: string;
    characteristicId: string | null;
    characteristicName: string;
    specification: string | null;
    tolerance: string | null;
    actualValue: string | null;
    numericValue: number | null;
    measuringInstrument: string | null;
    verdict: string;
    sampleNumber: number;
    remarks: string | null;
    recordedAt: string;
  }[];
  nonConformances: { id: string; ncNumber: string; defectType: string; quantityAffected: number }[];
  reworkOrders: { id: string; reworkNumber: string; status: string; quantity: number }[];
  deviations: { id: string; status: string; requestNote: string | null; decisionNote: string | null }[];
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
  correctiveActions: { id: string; caNumber: string; stage: string; dueDate: string | null; closedAt: string | null }[];
  reworkOrders: { id: string; reworkNumber: string; status: string }[];
}

export interface ReworkRow {
  id: string;
  reworkNumber: string;
  status: string;
  quantity: number;
  instructions: string;
  estimatedCost: number;
  actualCost: number;
  completedQuantity: number;
  scrappedQuantity: number;
  chargeToPartner: boolean;
  issuedAt: string;
  completedAt: string | null;
  dueDate: string | null;
  job: { id: string; jobNumber: string; component?: { name: string } } | null;
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
  acknowledgements: {
    id: string;
    receivedWeightKg: number;
    shortageWeightKg: number;
    acknowledgedAt: string;
  }[];
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

export interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  partnerInvoiceNo: string | null;
  status: string;
  invoiceDate: string;
  basicAmount: number;
  deductionAmount: number;
  netAmount: number;
  paidAt: string | null;
  holdReason: string | null;
  partner: { id: string; businessName: string };
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

export interface NotificationRow {
  id: string;
  event: string;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationPage extends Paginated<NotificationRow> {
  unreadCount: number;
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

export interface UploadedFileRef {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

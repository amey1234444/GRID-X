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

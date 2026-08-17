import {
  AllocationRecommendation,
  CriticalityClass,
  DrawingStatus,
  InvoiceStatus,
  JobPriority,
  JobStatus,
  KpiCode,
  MaterialResponsibility,
  MilestoneType,
  PartnerApprovalStatus,
  PartnerCategory,
  ProcessType,
  RoleCode,
  UserType,
} from './enums';
import { PermissionCode } from './permissions';

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  userType: UserType;
  roleCode: RoleCode;
  permissions: PermissionCode[];
  partnerId: string | null;
  partnerName: string | null;
  companyIds: string[];
  defaultCompanyId: string | null;
  language: 'EN' | 'HI';
  twoFactorEnabled: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}

/** Chairman and management dashboard (Section 6). */
export interface ManagementDashboard {
  activePartners: number;
  jobsInProgress: number;
  jobsAtRisk: number;
  totalOutsourcedValue: number;
  costSavings: number;
  avoidedCapex: number;
  qualityAcceptanceRate: number;
  onTimeDeliveryRate: number;
  totalNetworkCapacityHours: number;
  capacityUtilisationPercent: number;
  topPartners: PartnerScoreSummary[];
  bottomPartners: PartnerScoreSummary[];
  materialUnderPartnerCustodyKg: number;
  materialUnderPartnerCustodyValue: number;
  overduePayments: number;
  estimatedAdditionalCapacityHours: number;
  jobsByStatus: Array<{ status: JobStatus; count: number }>;
  monthlyTrend: Array<{ month: string; outsourcedValue: number; acceptanceRate: number; otd: number }>;
}

export interface PartnerScoreSummary {
  partnerId: string;
  partnerCode: string;
  businessName: string;
  city: string;
  score: number;
  category: PartnerCategory;
  recommendation: AllocationRecommendation | null;
  jobsCompleted: number;
}

/** Operations dashboard (Section 6). */
export interface OperationsDashboard {
  dueToday: JobSummary[];
  delayedJobs: JobSummary[];
  awaitingInspection: JobSummary[];
  materialPending: JobSummary[];
  partnerWorkload: Array<{
    partnerId: string;
    businessName: string;
    openJobs: number;
    committedHours: number;
    availableHours: number;
    utilisationPercent: number;
  }>;
  capacityBottlenecks: Array<{
    process: ProcessType;
    availableHours: number;
    committedHours: number;
    utilisationPercent: number;
  }>;
  escalations: JobSummary[];
}

/** Quality dashboard (Section 6). */
export interface QualityDashboard {
  firstArticlesPending: number;
  rejectionRate: number;
  reworkAgeingDays: Array<{ bucket: string; count: number }>;
  repeatDefects: Array<{ defectType: string; count: number; partners: number }>;
  partnerQualityTrends: Array<{ partnerId: string; businessName: string; firstPassQuality: number }>;
  openCorrectiveActions: number;
  inspectionWorkload: Array<{ inspectorId: string; name: string; pending: number }>;
}

/** Finance dashboard (Section 6). */
export interface FinanceDashboard {
  invoicesPending: number;
  invoicesPendingValue: number;
  acceptedValue: number;
  paymentsDue: number;
  deductions: number;
  materialReconciliationPending: number;
  partnerOutstanding: Array<{ partnerId: string; businessName: string; outstanding: number }>;
  costSavingsByCategory: Array<{ category: string; savings: number }>;
  invoiceAgeing: Array<{ bucket: string; count: number; value: number }>;
}

export interface PartnerDashboard {
  partnerId: string;
  businessName: string;
  category: PartnerCategory;
  score: number | null;
  newJobs: number;
  activeJobs: number;
  awaitingMaterialAck: number;
  pendingInspections: number;
  reworkOpen: number;
  invoicesPending: number;
  paymentsDue: number;
  jobs: JobSummary[];
}

export interface JobSummary {
  id: string;
  jobNumber: string;
  componentCode: string;
  componentName: string;
  criticality: CriticalityClass;
  partnerId: string | null;
  partnerName: string | null;
  quantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  status: JobStatus;
  priority: JobPriority;
  dueDate: string;
  delayDays: number;
  rate: number;
  value: number;
  latestMilestone: MilestoneType | null;
  isOverdue: boolean;
  materialResponsibility: MaterialResponsibility;
}

export interface DrawingSummary {
  id: string;
  drawingNumber: string;
  title: string;
  componentCode: string | null;
  currentRevisionId: string | null;
  currentRevisionCode: string | null;
  status: DrawingStatus | null;
  releasedAt: string | null;
  revisionCount: number;
  pendingAcknowledgements: number;
}

export interface CapacityBoardRow {
  partnerId: string;
  businessName: string;
  city: string;
  process: ProcessType;
  availableHours: number;
  committedHours: number;
  freeHours: number;
  utilisationPercent: number;
  bottleneck: string | null;
}

export interface NetworkCapacitySummary {
  totalHours: number;
  utilisedHours: number;
  freeHours: number;
  utilisationPercent: number;
  overloadedPartners: number;
  underutilisedPartners: number;
  byProcess: Array<{ process: ProcessType; available: number; committed: number; free: number }>;
  byLocation: Array<{ city: string; available: number; committed: number; free: number }>;
}

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  partnerName: string;
  status: InvoiceStatus;
  netAmount: number;
  invoiceDate: string;
  ageingDays: number;
  holdReason: string | null;
}

export interface ScorecardDetail {
  partnerId: string;
  businessName: string;
  periodMonth: number;
  periodYear: number;
  totalScore: number;
  category: PartnerCategory;
  recommendation: AllocationRecommendation;
  kpis: Array<{ code: KpiCode; label: string; weight: number; value: number; weighted: number }>;
  history: Array<{ period: string; score: number; category: PartnerCategory }>;
}

export interface PartnerRecommendation {
  partnerId: string;
  partnerCode: string;
  businessName: string;
  city: string;
  distanceKm: number | null;
  category: PartnerCategory;
  score: number;
  rating: number;
  freeCapacityHours: number;
  openJobs: number;
  onTimeDeliveryPercent: number;
  firstPassQualityPercent: number;
  conversionRate: number | null;
  networkSharePercent: number;
  blockers: string[];
  breakdown: Array<{ factor: string; label: string; score: number; weight: number; weighted: number }>;
}

export interface PartnerApprovalGate {
  status: PartnerApprovalStatus;
  canAllocate: boolean;
  reason?: string;
}

export interface NotificationItem {
  id: string;
  event: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}

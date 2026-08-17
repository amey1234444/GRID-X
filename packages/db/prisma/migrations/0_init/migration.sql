-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('GROUP_ADMIN', 'GRIDX_HEAD', 'OPERATIONS_HEAD', 'ENGINEERING_USER', 'PROCUREMENT_USER', 'QUALITY_INSPECTOR', 'STORES_USER', 'FINANCE_USER', 'LOGISTICS_COORDINATOR', 'MANAGEMENT_VIEWER', 'PARTNER_OWNER', 'PARTNER_SUPERVISOR', 'PARTNER_WORKER');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('INTERNAL', 'PARTNER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PartnerApprovalStatus" AS ENUM ('DRAFT', 'DOCUMENT_REVIEW', 'CAPABILITY_AUDIT', 'TRIAL_APPROVED', 'APPROVED', 'CERTIFIED', 'STRATEGIC', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PartnerLevel" AS ENUM ('L1_MICRO', 'L2_SMALL', 'L3_MEDIUM', 'L4_STRATEGIC');

-- CreateEnum
CREATE TYPE "PartnerCategory" AS ENUM ('A', 'B', 'C', 'D', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PartnerAuditStatus" AS ENUM ('NOT_AUDITED', 'SCHEDULED', 'IN_PROGRESS', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProcessType" AS ENUM ('CUTTING', 'BENDING', 'WELDING', 'FABRICATION', 'MACHINING', 'DRILLING', 'GRINDING', 'PAINTING', 'ASSEMBLY', 'PACKING', 'ELECTRICAL_WIRING', 'TRANSPORT');

-- CreateEnum
CREATE TYPE "MachineCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'UNDER_REPAIR');

-- CreateEnum
CREATE TYPE "OwnershipStatus" AS ENUM ('OWNED', 'RENTED', 'LEASED');

-- CreateEnum
CREATE TYPE "PartnerDocumentType" AS ENUM ('UDYAM_CERTIFICATE', 'GST_CERTIFICATE', 'PAN_CARD', 'BANK_PROOF', 'ISO_CERTIFICATE', 'INSURANCE', 'SAFETY_COMPLIANCE', 'FACTORY_LICENSE', 'NDA', 'AGREEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "CriticalityClass" AS ENUM ('CLASS_A', 'CLASS_B', 'CLASS_C', 'CLASS_D');

-- CreateEnum
CREATE TYPE "InspectionLevel" AS ENUM ('LEVEL_1_VISUAL', 'LEVEL_2_SAMPLING', 'LEVEL_3_FULL_DIMENSIONAL', 'LEVEL_4_CRITICAL_100_PERCENT');

-- CreateEnum
CREATE TYPE "DrawingStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'RELEASED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DrawingAccessMode" AS ENUM ('VIEW_ONLY', 'VIEW_AND_DOWNLOAD');

-- CreateEnum
CREATE TYPE "DrawingAccessEvent" AS ENUM ('GRANTED', 'REVOKED', 'VIEWED', 'DOWNLOADED');

-- CreateEnum
CREATE TYPE "EngineeringChangeStatus" AS ENUM ('RAISED', 'UNDER_REVIEW', 'APPROVED', 'IMPLEMENTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'AWAITING_PARTNER_ACCEPTANCE', 'ACCEPTED', 'MATERIAL_PENDING', 'MATERIAL_ISSUED', 'IN_PRODUCTION', 'INSPECTION_REQUESTED', 'UNDER_INSPECTION', 'REWORK', 'QUALITY_ACCEPTED', 'DISPATCHED', 'RECEIVED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobSource" AS ENUM ('SALES_ORDER', 'WORK_ORDER', 'INTERNAL_PRODUCTION', 'REPLENISHMENT', 'MANUAL');

-- CreateEnum
CREATE TYPE "JobPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MaterialResponsibility" AS ENUM ('OSWAR_SUPPLIED', 'PARTNER_SUPPLIED');

-- CreateEnum
CREATE TYPE "MilestoneType" AS ENUM ('JOB_ACCEPTED', 'MATERIAL_RECEIVED', 'PRODUCTION_STARTED', 'FIRST_PIECE_READY', 'BATCH_25_PERCENT', 'BATCH_50_PERCENT', 'BATCH_READY_FOR_INSPECTION', 'DISPATCHED');

-- CreateEnum
CREATE TYPE "DelayReason" AS ENUM ('MATERIAL_SHORTAGE', 'DRAWING_CLARIFICATION', 'MACHINE_BREAKDOWN', 'LABOUR_SHORTAGE', 'POWER_ISSUE', 'QUALITY_ISSUE', 'TRANSPORT_DELAY', 'OSWAR_APPROVAL_PENDING', 'PARTNER_PLANNING_FAILURE');

-- CreateEnum
CREATE TYPE "ResponsibleParty" AS ENUM ('PARTNER', 'OSWAR', 'SHARED', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "ClarificationStatus" AS ENUM ('OPEN', 'ANSWERED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MaterialTransactionType" AS ENUM ('ISSUED_TO_PARTNER', 'RECEIVED_BY_PARTNER', 'CONSUMED', 'SCRAP_GENERATED', 'SCRAP_RETURNED', 'UNUSED_MATERIAL_RETURNED', 'SHORTAGE', 'EXCESS', 'REJECTED_MATERIAL', 'REPLACEMENT_MATERIAL');

-- CreateEnum
CREATE TYPE "MaterialIssueStatus" AS ENUM ('DRAFT', 'PREPARED', 'ISSUED', 'ACKNOWLEDGED', 'PARTIALLY_RECONCILED', 'RECONCILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('PENDING', 'BALANCED', 'SHORTAGE', 'EXCESS', 'DISPUTED');

-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('INCOMING_MATERIAL', 'FIRST_ARTICLE', 'IN_PROCESS', 'FINAL', 'RECEIVING', 'PARTNER_AUDIT');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('REQUESTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InspectionDecision" AS ENUM ('ACCEPTED', 'ACCEPTED_WITH_DEVIATION', 'REWORK_REQUIRED', 'REJECTED', 'HOLD_FOR_ENGINEERING_REVIEW');

-- CreateEnum
CREATE TYPE "ResultVerdict" AS ENUM ('PASS', 'FAIL', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "DefectType" AS ENUM ('DIMENSIONAL', 'WELD_DEFECT', 'SURFACE_FINISH', 'MATERIAL_DEFECT', 'PAINT_DEFECT', 'ASSEMBLY_ERROR', 'MISSING_OPERATION', 'DAMAGE_IN_TRANSIT', 'DOCUMENTATION', 'OTHER');

-- CreateEnum
CREATE TYPE "CorrectiveActionStage" AS ENUM ('ISSUE_RAISED', 'CONTAINMENT', 'ROOT_CAUSE', 'CORRECTIVE_ACTION', 'VERIFICATION', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReworkStatus" AS ENUM ('ISSUED', 'IN_PROGRESS', 'READY_FOR_REINSPECTION', 'COMPLETED', 'SCRAPPED');

-- CreateEnum
CREATE TYPE "DeviationStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ToolCategory" AS ENUM ('TOOL', 'FIXTURE', 'GAUGE');

-- CreateEnum
CREATE TYPE "ToolCondition" AS ENUM ('NEW', 'GOOD', 'WORN', 'DAMAGED', 'SCRAPPED');

-- CreateEnum
CREATE TYPE "ToolIssueStatus" AS ENUM ('ISSUED', 'RETURNED', 'OVERDUE', 'DAMAGED', 'LOST');

-- CreateEnum
CREATE TYPE "ShipmentDirection" AS ENUM ('OSWAR_TO_PARTNER', 'PARTNER_TO_OSWAR', 'PARTNER_TO_PARTNER');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PLANNED', 'PICKUP_DUE', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'DELAYED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'RAISED', 'QUANTITY_VERIFIED', 'QUALITY_VERIFIED', 'MATERIAL_RECONCILED', 'FINANCE_APPROVED', 'PAYMENT_SCHEDULED', 'PAID', 'HELD', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('NEFT', 'RTGS', 'IMPS', 'UPI', 'CHEQUE', 'CASH');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('QUALITY_INCENTIVE', 'ON_TIME_DELIVERY_INCENTIVE', 'REWORK_DEDUCTION', 'MATERIAL_SHORTAGE_DEDUCTION', 'APPROVED_PENALTY', 'OTHER_INCENTIVE', 'OTHER_DEDUCTION');

-- CreateEnum
CREATE TYPE "KpiCode" AS ENUM ('FIRST_PASS_QUALITY', 'ON_TIME_IN_FULL_DELIVERY', 'MATERIAL_UTILISATION', 'REWORK_RESPONSE', 'CAPACITY_RELIABILITY', 'DOCUMENTATION_DISCIPLINE', 'SAFETY_AND_COMPLIANCE');

-- CreateEnum
CREATE TYPE "AllocationRecommendation" AS ENUM ('INCREASE_ALLOCATION', 'MAINTAIN_ALLOCATION', 'DEVELOPMENT_PLAN', 'REDUCE_ALLOCATION', 'SUSPEND_PARTNER');

-- CreateEnum
CREATE TYPE "CapacityPeriodType" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "NotificationEvent" AS ENUM ('NEW_JOB_ASSIGNED', 'JOB_ACCEPTANCE_PENDING', 'MATERIAL_READY_FOR_PICKUP', 'MATERIAL_RECEIPT_NOT_ACKNOWLEDGED', 'JOB_MILESTONE_OVERDUE', 'INSPECTION_REQUESTED', 'INSPECTION_DELAYED', 'REWORK_ISSUED', 'DRAWING_REVISION_CHANGED', 'INVOICE_APPROVED', 'INVOICE_HELD', 'PAYMENT_RELEASED', 'PARTNER_RATING_REDUCED', 'COMPLIANCE_DOCUMENT_EXPIRING', 'FIXTURE_CALIBRATION_DUE', 'JOB_ACCEPTED', 'JOB_DECLINED', 'JOB_DELAY_REPORTED', 'JOB_CLARIFICATION_RAISED', 'JOB_CLARIFICATION_ANSWERED', 'JOB_CLOSED', 'MATERIAL_ISSUED', 'MATERIAL_ACKNOWLEDGED', 'INSPECTION_COMPLETED', 'SHIPMENT_DISPATCHED', 'SHIPMENT_RECEIVED', 'INVOICE_SUBMITTED', 'PARTNER_STATUS_CHANGED', 'DRAWING_ACCESS_GRANTED', 'SCORECARD_PUBLISHED', 'CORRECTIVE_ACTION_DUE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'WHATSAPP', 'SMS');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('DRAWING', 'PHOTOGRAPH', 'INSPECTION_DOCUMENT', 'INVOICE', 'PARTNER_CERTIFICATE', 'AUDIT_REPORT', 'PROOF_OF_DELIVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('EN', 'HI');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "code" "RoleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPartnerRole" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "userType" "UserType" NOT NULL DEFAULT 'INTERNAL',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "roleId" TEXT NOT NULL,
    "partnerId" TEXT,
    "designation" TEXT,
    "language" "Language" NOT NULL DEFAULT 'EN',
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "passwordUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCompany" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'LOGIN',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "actorLabel" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "companyId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "category" "FileCategory" NOT NULL DEFAULT 'OTHER',
    "checksum" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photograph" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "caption" TEXT,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photograph_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "partnerCode" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "altPhone" TEXT,
    "email" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "distanceKm" DOUBLE PRECISION,
    "udyamNumber" TEXT,
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "bankName" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNo" TEXT,
    "bankIfsc" TEXT,
    "category" "PartnerCategory" NOT NULL DEFAULT 'C',
    "level" "PartnerLevel" NOT NULL DEFAULT 'L2_SMALL',
    "approvalStatus" "PartnerApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "auditStatus" "PartnerAuditStatus" NOT NULL DEFAULT 'NOT_AUDITED',
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "maxCapacityHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxOpenJobs" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "suspendedReason" TEXT,
    "currentScore" DOUBLE PRECISION,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerLocation" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerDocument" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "type" "PartnerDocumentType" NOT NULL,
    "documentNo" TEXT,
    "fileId" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerCapability" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "process" "ProcessType" NOT NULL,
    "isCapable" BOOLEAN NOT NULL DEFAULT true,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "maxSizeMm" DOUBLE PRECISION,
    "maxWeightKg" DOUBLE PRECISION,
    "toleranceMm" DOUBLE PRECISION,
    "monthlyCapacityHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerMachine" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "machineType" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "size" TEXT,
    "capacity" TEXT,
    "accuracy" TEXT,
    "condition" "MachineCondition" NOT NULL DEFAULT 'GOOD',
    "photoFileId" TEXT,
    "ownership" "OwnershipStatus" NOT NULL DEFAULT 'OWNED',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "lastServicedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerMachine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerEmployee" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "skill" TEXT,
    "phone" TEXT,
    "isSupervisor" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerAudit" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "auditorId" TEXT,
    "auditDate" TIMESTAMP(3) NOT NULL,
    "auditType" TEXT NOT NULL DEFAULT 'CAPABILITY',
    "score" DOUBLE PRECISION,
    "status" "PartnerAuditStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "findings" TEXT,
    "reportFileId" TEXT,
    "nextAuditDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerStatusHistory" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "fromStatus" "PartnerApprovalStatus",
    "toStatus" "PartnerApprovalStatus" NOT NULL,
    "reason" TEXT,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imsRef" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uom" TEXT NOT NULL DEFAULT 'KG',
    "materialGrade" TEXT,
    "unitWeightKg" DOUBLE PRECISION,
    "standardRate" DOUBLE PRECISION,
    "imsRef" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Process" (
    "id" TEXT NOT NULL,
    "code" "ProcessType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "standardRatePerHour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "componentCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productId" TEXT,
    "drawingNumber" TEXT,
    "materialGrade" TEXT,
    "theoreticalWeightKg" DOUBLE PRECISION,
    "primaryProcess" "ProcessType" NOT NULL,
    "inspectionLevel" "InspectionLevel" NOT NULL DEFAULT 'LEVEL_2_SAMPLING',
    "criticality" "CriticalityClass" NOT NULL DEFAULT 'CLASS_C',
    "standardCycleTimeMinutes" DOUBLE PRECISION,
    "standardConversionRate" DOUBLE PRECISION,
    "packagingRequirement" TEXT,
    "outsourcingEligibilityScore" INTEGER NOT NULL DEFAULT 50,
    "scrapAllowancePercent" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentProcess" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "cycleTimeMinutes" DOUBLE PRECISION,
    "isOutsourced" BOOLEAN NOT NULL DEFAULT true,
    "remarks" TEXT,

    CONSTRAINT "ComponentProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentItem" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantityPerUnit" DOUBLE PRECISION NOT NULL,
    "uom" TEXT NOT NULL DEFAULT 'KG',

    CONSTRAINT "ComponentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentCriticality" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "criticality" "CriticalityClass" NOT NULL,
    "reason" TEXT,
    "approvedBy" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComponentCriticality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovedPartnerComponent" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "firstArticleDone" BOOLEAN NOT NULL DEFAULT false,
    "firstArticleDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "remarks" TEXT,

    CONSTRAINT "ApprovedPartnerComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Drawing" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "componentId" TEXT,
    "drawingNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "currentRevisionId" TEXT,
    "uploadedById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drawing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawingRevision" (
    "id" TEXT NOT NULL,
    "drawingId" TEXT NOT NULL,
    "revisionCode" TEXT NOT NULL,
    "revisionNo" INTEGER NOT NULL,
    "status" "DrawingStatus" NOT NULL DEFAULT 'DRAFT',
    "fileId" TEXT,
    "previewFileId" TEXT,
    "changeNote" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrawingRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawingAccess" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "jobId" TEXT,
    "mode" "DrawingAccessMode" NOT NULL DEFAULT 'VIEW_ONLY',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "DrawingAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawingAcknowledgement" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "acknowledgedById" TEXT,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,

    CONSTRAINT "DrawingAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawingAccessLog" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "partnerId" TEXT,
    "userId" TEXT,
    "jobId" TEXT,
    "event" "DrawingAccessEvent" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrawingAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngineeringChange" (
    "id" TEXT NOT NULL,
    "ecNumber" TEXT NOT NULL,
    "drawingId" TEXT,
    "revisionId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "EngineeringChangeStatus" NOT NULL DEFAULT 'RAISED',
    "raisedById" TEXT,
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "implementedAt" TIMESTAMP(3),
    "impact" TEXT,
    "decisionNote" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngineeringChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GridJob" (
    "id" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "source" "JobSource" NOT NULL DEFAULT 'MANUAL',
    "sourceRef" TEXT,
    "customerProject" TEXT,
    "productId" TEXT,
    "componentId" TEXT NOT NULL,
    "drawingRevisionId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "acceptedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rejectedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reworkQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dispatchedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receivedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "partnerId" TEXT,
    "plannedStartDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "materialResponsibility" "MaterialResponsibility" NOT NULL DEFAULT 'OSWAR_SUPPLIED',
    "rate" DOUBLE PRECISION NOT NULL,
    "inspectionPlanId" TEXT,
    "deliveryLocation" TEXT,
    "priority" "JobPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "productionStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "classAOverrideById" TEXT,
    "classAOverrideReason" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GridJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GridJobItem" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "drawingRevisionId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "acceptedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rejectedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GridJobItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAssignment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recommendationScore" DOUBLE PRECISION,
    "recommendationDetail" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "respondedAt" TIMESTAMP(3),
    "accepted" BOOLEAN,
    "declineReason" TEXT,

    CONSTRAINT "JobAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobMilestone" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "type" "MilestoneType" NOT NULL,
    "quantityCompleted" DOUBLE PRECISION,
    "remarks" TEXT,
    "expectedCompletionDate" TIMESTAMP(3),
    "reportedById" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "syncedFromOffline" BOOLEAN NOT NULL DEFAULT false,
    "clientRequestId" TEXT,

    CONSTRAINT "JobMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobStatusHistory" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "fromStatus" "JobStatus",
    "toStatus" "JobStatus" NOT NULL,
    "reason" TEXT,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobDelay" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "reason" "DelayReason" NOT NULL,
    "responsibility" "ResponsibleParty" NOT NULL,
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "detail" TEXT,
    "expectedCompletionDate" TIMESTAMP(3),
    "reportedById" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "JobDelay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobClarification" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "status" "ClarificationStatus" NOT NULL DEFAULT 'OPEN',
    "raisedById" TEXT,
    "answeredById" TEXT,
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "JobClarification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialIssue" (
    "id" TEXT NOT NULL,
    "challanNumber" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "status" "MaterialIssueStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3),
    "expectedReturnDate" TIMESTAMP(3),
    "totalIssueWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vehicleNumber" TEXT,
    "driverName" TEXT,
    "remarks" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialIssueItem" (
    "id" TEXT NOT NULL,
    "materialIssueId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "uom" TEXT NOT NULL DEFAULT 'KG',
    "issueWeightKg" DOUBLE PRECISION NOT NULL,
    "batchNumber" TEXT,
    "heatNumber" TEXT,
    "theoreticalQuantity" DOUBLE PRECISION,
    "remarks" TEXT,

    CONSTRAINT "MaterialIssueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialReceiptAcknowledgement" (
    "id" TEXT NOT NULL,
    "materialIssueId" TEXT NOT NULL,
    "acknowledgedById" TEXT,
    "receivedWeightKg" DOUBLE PRECISION NOT NULL,
    "shortageWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "damageRemarks" TEXT,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signatureName" TEXT,
    "clientRequestId" TEXT,

    CONSTRAINT "MaterialReceiptAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialConsumption" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "theoreticalKg" DOUBLE PRECISION NOT NULL,
    "actualKg" DOUBLE PRECISION NOT NULL,
    "variancePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,

    CONSTRAINT "MaterialConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapReturn" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "scrapWeightKg" DOUBLE PRECISION NOT NULL,
    "returnedWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scrapPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "returnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "challanNumber" TEXT,
    "remarks" TEXT,

    CONSTRAINT "ScrapReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialReconciliation" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "issuedKg" DOUBLE PRECISION NOT NULL,
    "consumedKg" DOUBLE PRECISION NOT NULL,
    "scrapReturnedKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unusedReturnedKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shortageKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "excessKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'PENDING',
    "transactionType" "MaterialTransactionType" NOT NULL DEFAULT 'CONSUMED',
    "deductionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reconciledById" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionPlan" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inspectionType" "InspectionType" NOT NULL DEFAULT 'FINAL',
    "samplingPlan" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionCharacteristic" (
    "id" TEXT NOT NULL,
    "inspectionPlanId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "characteristic" TEXT NOT NULL,
    "specification" TEXT NOT NULL,
    "nominalValue" DOUBLE PRECISION,
    "upperTolerance" DOUBLE PRECISION,
    "lowerTolerance" DOUBLE PRECISION,
    "unit" TEXT,
    "measuringInstrument" TEXT,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InspectionCharacteristic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "inspectionNumber" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "partnerId" TEXT,
    "inspectionPlanId" TEXT,
    "type" "InspectionType" NOT NULL,
    "status" "InspectionStatus" NOT NULL DEFAULT 'REQUESTED',
    "decision" "InspectionDecision",
    "offeredQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inspectedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "acceptedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rejectedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reworkQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requestedById" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inspectorId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionResult" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "characteristicId" TEXT,
    "characteristicName" TEXT NOT NULL,
    "specification" TEXT,
    "tolerance" TEXT,
    "actualValue" TEXT,
    "numericValue" DOUBLE PRECISION,
    "measuringInstrument" TEXT,
    "verdict" "ResultVerdict" NOT NULL DEFAULT 'PASS',
    "sampleNumber" INTEGER NOT NULL DEFAULT 1,
    "remarks" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NonConformance" (
    "id" TEXT NOT NULL,
    "ncNumber" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "inspectionId" TEXT,
    "partnerId" TEXT,
    "defectType" "DefectType" NOT NULL,
    "quantityAffected" DOUBLE PRECISION NOT NULL,
    "probableCause" TEXT,
    "responsibility" "ResponsibleParty" NOT NULL DEFAULT 'PARTNER',
    "reworkCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "materialLoss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerImpact" TEXT,
    "correctiveActionRequired" BOOLEAN NOT NULL DEFAULT true,
    "raisedById" TEXT,
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NonConformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectiveAction" (
    "id" TEXT NOT NULL,
    "caNumber" TEXT NOT NULL,
    "nonConformanceId" TEXT NOT NULL,
    "stage" "CorrectiveActionStage" NOT NULL DEFAULT 'ISSUE_RAISED',
    "containment" TEXT,
    "rootCause" TEXT,
    "correctiveAction" TEXT,
    "verification" TEXT,
    "ownerId" TEXT,
    "dueDate" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrectiveAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReworkOrder" (
    "id" TEXT NOT NULL,
    "reworkNumber" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "inspectionId" TEXT,
    "nonConformanceId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "instructions" TEXT NOT NULL,
    "status" "ReworkStatus" NOT NULL DEFAULT 'ISSUED',
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "chargeToPartner" BOOLEAN NOT NULL DEFAULT true,
    "issuedById" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReworkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviationApproval" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "requestNote" TEXT NOT NULL,
    "status" "DeviationStatus" NOT NULL DEFAULT 'REQUESTED',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviationApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "capacityKg" DOUBLE PRECISION,
    "ownerName" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "direction" "ShipmentDirection" NOT NULL,
    "fromPartnerId" TEXT,
    "toPartnerId" TEXT,
    "pickupLocation" TEXT NOT NULL,
    "deliveryLocation" TEXT NOT NULL,
    "materialType" TEXT,
    "weightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vehicleId" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "plannedPickupAt" TIMESTAMP(3) NOT NULL,
    "actualPickupAt" TIMESTAMP(3),
    "expectedDeliveryAt" TIMESTAMP(3),
    "actualDeliveryAt" TIMESTAMP(3),
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PLANNED',
    "transportCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentItem" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "jobId" TEXT,
    "materialIssueId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ShipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofOfDelivery" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "receivedBy" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signatureFileId" TEXT,
    "photoFileId" TEXT,
    "remarks" TEXT,

    CONSTRAINT "ProofOfDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerRate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "conversionRate" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "minimumBatch" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "approvedBy" TEXT,
    "previousRate" DOUBLE PRECISION,
    "revisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerIncentiveRule" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT,
    "type" "AdjustmentType" NOT NULL,
    "name" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION,
    "fixedAmount" DOUBLE PRECISION,
    "condition" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerIncentiveRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerDeduction" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "type" "AdjustmentType" NOT NULL,
    "reason" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerDeduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "partnerInvoiceNo" TEXT,
    "companyId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodFrom" TIMESTAMP(3),
    "periodTo" TIMESTAMP(3),
    "basicAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "incentiveAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "fileId" TEXT,
    "holdReason" TEXT,
    "quantityVerifiedAt" TIMESTAMP(3),
    "qualityVerifiedAt" TIMESTAMP(3),
    "materialReconciledAt" TIMESTAMP(3),
    "financeApprovedAt" TIMESTAMP(3),
    "paymentScheduledFor" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerInvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "acceptedQuantity" DOUBLE PRECISION NOT NULL,
    "conversionRate" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,

    CONSTRAINT "PartnerInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentApproval" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "approverId" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "mode" "PaymentMode" NOT NULL DEFAULT 'NEFT',
    "referenceNo" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    "remarks" TEXT,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerScore" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "category" "PartnerCategory" NOT NULL,
    "recommendation" "AllocationRecommendation" NOT NULL,
    "jobsCompleted" INTEGER NOT NULL DEFAULT 0,
    "jobsOnTime" INTEGER NOT NULL DEFAULT 0,
    "quantityAccepted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantityRejected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,

    CONSTRAINT "PartnerScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerKPI" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "scoreId" TEXT,
    "code" "KpiCode" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "weighted" DOUBLE PRECISION NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,

    CONSTRAINT "PartnerKPI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacityDeclaration" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "periodType" "CapacityPeriodType" NOT NULL DEFAULT 'WEEKLY',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "availableHours" DOUBLE PRECISION NOT NULL,
    "availableWorkers" INTEGER NOT NULL DEFAULT 0,
    "availableMachines" INTEGER NOT NULL DEFAULT 0,
    "committedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maintenanceShutdownHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedBottleneck" TEXT,
    "declaredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapacityDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacityAllocation" (
    "id" TEXT NOT NULL,
    "declarationId" TEXT,
    "partnerId" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "jobId" TEXT,
    "allocatedHours" DOUBLE PRECISION NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapacityAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tool" (
    "id" TEXT NOT NULL,
    "toolCode" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "category" "ToolCategory" NOT NULL DEFAULT 'TOOL',
    "description" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL DEFAULT 'OSWAR',
    "currentPartnerId" TEXT,
    "condition" "ToolCondition" NOT NULL DEFAULT 'GOOD',
    "calibrationRequired" BOOLEAN NOT NULL DEFAULT false,
    "calibrationFrequencyDays" INTEGER,
    "lastCalibratedAt" TIMESTAMP(3),
    "nextCalibrationDue" TIMESTAMP(3),
    "photoFileId" TEXT,
    "replacementValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolIssue" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "jobId" TEXT,
    "issuedById" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturnDate" TIMESTAMP(3),
    "actualReturnDate" TIMESTAMP(3),
    "conditionOnIssue" "ToolCondition" NOT NULL DEFAULT 'GOOD',
    "conditionOnReturn" "ToolCondition",
    "status" "ToolIssueStatus" NOT NULL DEFAULT 'ISSUED',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalibrationRecord" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "calibratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextDueAt" TIMESTAMP(3),
    "agency" TEXT,
    "certificateNo" TEXT,
    "result" TEXT,
    "performedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalibrationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "event" "NotificationEvent" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImsSyncLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "direction" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "recordRef" TEXT,
    "payload" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImsSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumberSequence" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "padding" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "Permission_resource_idx" ON "Permission"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_userType_status_idx" ON "User"("userType", "status");

-- CreateIndex
CREATE INDEX "User_partnerId_idx" ON "User"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCompany_userId_companyId_key" ON "UserCompany"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");

-- CreateIndex
CREATE INDEX "OtpCode_phone_idx" ON "OtpCode"("phone");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoredFile_key_key" ON "StoredFile"("key");

-- CreateIndex
CREATE INDEX "StoredFile_category_idx" ON "StoredFile"("category");

-- CreateIndex
CREATE INDEX "Photograph_entityType_entityId_idx" ON "Photograph"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_partnerCode_key" ON "Partner"("partnerCode");

-- CreateIndex
CREATE INDEX "Partner_companyId_approvalStatus_idx" ON "Partner"("companyId", "approvalStatus");

-- CreateIndex
CREATE INDEX "Partner_category_idx" ON "Partner"("category");

-- CreateIndex
CREATE INDEX "PartnerLocation_partnerId_idx" ON "PartnerLocation"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerDocument_partnerId_type_idx" ON "PartnerDocument"("partnerId", "type");

-- CreateIndex
CREATE INDEX "PartnerDocument_expiryDate_idx" ON "PartnerDocument"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerCapability_partnerId_process_key" ON "PartnerCapability"("partnerId", "process");

-- CreateIndex
CREATE INDEX "PartnerMachine_partnerId_idx" ON "PartnerMachine"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerEmployee_partnerId_idx" ON "PartnerEmployee"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerAudit_partnerId_auditDate_idx" ON "PartnerAudit"("partnerId", "auditDate");

-- CreateIndex
CREATE INDEX "PartnerStatusHistory_partnerId_createdAt_idx" ON "PartnerStatusHistory"("partnerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_companyId_code_key" ON "Product"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Item_code_key" ON "Item"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Process_code_key" ON "Process"("code");

-- CreateIndex
CREATE INDEX "Component_criticality_idx" ON "Component"("criticality");

-- CreateIndex
CREATE UNIQUE INDEX "Component_companyId_componentCode_key" ON "Component"("companyId", "componentCode");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentProcess_componentId_processId_sequence_key" ON "ComponentProcess"("componentId", "processId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentItem_componentId_itemId_key" ON "ComponentItem"("componentId", "itemId");

-- CreateIndex
CREATE INDEX "ComponentCriticality_componentId_idx" ON "ComponentCriticality"("componentId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovedPartnerComponent_componentId_partnerId_key" ON "ApprovedPartnerComponent"("componentId", "partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "Drawing_currentRevisionId_key" ON "Drawing"("currentRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "Drawing_companyId_drawingNumber_key" ON "Drawing"("companyId", "drawingNumber");

-- CreateIndex
CREATE INDEX "DrawingRevision_status_idx" ON "DrawingRevision"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DrawingRevision_drawingId_revisionCode_key" ON "DrawingRevision"("drawingId", "revisionCode");

-- CreateIndex
CREATE INDEX "DrawingAccess_partnerId_idx" ON "DrawingAccess"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "DrawingAccess_revisionId_partnerId_jobId_key" ON "DrawingAccess"("revisionId", "partnerId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "DrawingAcknowledgement_revisionId_partnerId_key" ON "DrawingAcknowledgement"("revisionId", "partnerId");

-- CreateIndex
CREATE INDEX "DrawingAccessLog_revisionId_createdAt_idx" ON "DrawingAccessLog"("revisionId", "createdAt");

-- CreateIndex
CREATE INDEX "DrawingAccessLog_partnerId_idx" ON "DrawingAccessLog"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "EngineeringChange_ecNumber_key" ON "EngineeringChange"("ecNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GridJob_jobNumber_key" ON "GridJob"("jobNumber");

-- CreateIndex
CREATE INDEX "GridJob_companyId_status_idx" ON "GridJob"("companyId", "status");

-- CreateIndex
CREATE INDEX "GridJob_partnerId_status_idx" ON "GridJob"("partnerId", "status");

-- CreateIndex
CREATE INDEX "GridJob_dueDate_idx" ON "GridJob"("dueDate");

-- CreateIndex
CREATE INDEX "GridJobItem_jobId_idx" ON "GridJobItem"("jobId");

-- CreateIndex
CREATE INDEX "JobAssignment_jobId_idx" ON "JobAssignment"("jobId");

-- CreateIndex
CREATE INDEX "JobAssignment_partnerId_idx" ON "JobAssignment"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "JobMilestone_clientRequestId_key" ON "JobMilestone"("clientRequestId");

-- CreateIndex
CREATE INDEX "JobMilestone_jobId_type_idx" ON "JobMilestone"("jobId", "type");

-- CreateIndex
CREATE INDEX "JobStatusHistory_jobId_createdAt_idx" ON "JobStatusHistory"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "JobDelay_jobId_idx" ON "JobDelay"("jobId");

-- CreateIndex
CREATE INDEX "JobDelay_reason_idx" ON "JobDelay"("reason");

-- CreateIndex
CREATE INDEX "JobClarification_jobId_status_idx" ON "JobClarification"("jobId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialIssue_challanNumber_key" ON "MaterialIssue"("challanNumber");

-- CreateIndex
CREATE INDEX "MaterialIssue_jobId_idx" ON "MaterialIssue"("jobId");

-- CreateIndex
CREATE INDEX "MaterialIssue_partnerId_status_idx" ON "MaterialIssue"("partnerId", "status");

-- CreateIndex
CREATE INDEX "MaterialIssueItem_materialIssueId_idx" ON "MaterialIssueItem"("materialIssueId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialReceiptAcknowledgement_clientRequestId_key" ON "MaterialReceiptAcknowledgement"("clientRequestId");

-- CreateIndex
CREATE INDEX "MaterialReceiptAcknowledgement_materialIssueId_idx" ON "MaterialReceiptAcknowledgement"("materialIssueId");

-- CreateIndex
CREATE INDEX "MaterialConsumption_jobId_idx" ON "MaterialConsumption"("jobId");

-- CreateIndex
CREATE INDEX "ScrapReturn_jobId_idx" ON "ScrapReturn"("jobId");

-- CreateIndex
CREATE INDEX "MaterialReconciliation_status_idx" ON "MaterialReconciliation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialReconciliation_jobId_itemId_key" ON "MaterialReconciliation"("jobId", "itemId");

-- CreateIndex
CREATE INDEX "InspectionPlan_componentId_idx" ON "InspectionPlan"("componentId");

-- CreateIndex
CREATE INDEX "InspectionCharacteristic_inspectionPlanId_idx" ON "InspectionCharacteristic"("inspectionPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_inspectionNumber_key" ON "Inspection"("inspectionNumber");

-- CreateIndex
CREATE INDEX "Inspection_status_type_idx" ON "Inspection"("status", "type");

-- CreateIndex
CREATE INDEX "Inspection_jobId_idx" ON "Inspection"("jobId");

-- CreateIndex
CREATE INDEX "InspectionResult_inspectionId_idx" ON "InspectionResult"("inspectionId");

-- CreateIndex
CREATE UNIQUE INDEX "NonConformance_ncNumber_key" ON "NonConformance"("ncNumber");

-- CreateIndex
CREATE INDEX "NonConformance_jobId_idx" ON "NonConformance"("jobId");

-- CreateIndex
CREATE INDEX "NonConformance_defectType_idx" ON "NonConformance"("defectType");

-- CreateIndex
CREATE UNIQUE INDEX "CorrectiveAction_caNumber_key" ON "CorrectiveAction"("caNumber");

-- CreateIndex
CREATE INDEX "CorrectiveAction_stage_idx" ON "CorrectiveAction"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "ReworkOrder_reworkNumber_key" ON "ReworkOrder"("reworkNumber");

-- CreateIndex
CREATE INDEX "ReworkOrder_status_idx" ON "ReworkOrder"("status");

-- CreateIndex
CREATE INDEX "ReworkOrder_jobId_idx" ON "ReworkOrder"("jobId");

-- CreateIndex
CREATE INDEX "DeviationApproval_inspectionId_idx" ON "DeviationApproval"("inspectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_registrationNo_key" ON "Vehicle"("registrationNo");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_shipmentNumber_key" ON "Shipment"("shipmentNumber");

-- CreateIndex
CREATE INDEX "Shipment_status_plannedPickupAt_idx" ON "Shipment"("status", "plannedPickupAt");

-- CreateIndex
CREATE INDEX "ShipmentItem_shipmentId_idx" ON "ShipmentItem"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProofOfDelivery_shipmentId_key" ON "ProofOfDelivery"("shipmentId");

-- CreateIndex
CREATE INDEX "PartnerRate_partnerId_componentId_effectiveFrom_idx" ON "PartnerRate"("partnerId", "componentId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "PartnerDeduction_partnerId_idx" ON "PartnerDeduction"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerInvoice_invoiceNumber_key" ON "PartnerInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "PartnerInvoice_partnerId_status_idx" ON "PartnerInvoice"("partnerId", "status");

-- CreateIndex
CREATE INDEX "PartnerInvoice_status_invoiceDate_idx" ON "PartnerInvoice"("status", "invoiceDate");

-- CreateIndex
CREATE INDEX "PartnerInvoiceItem_invoiceId_idx" ON "PartnerInvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentApproval_invoiceId_idx" ON "PaymentApproval"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentRecord_invoiceId_idx" ON "PaymentRecord"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerScore_partnerId_periodYear_periodMonth_key" ON "PartnerScore"("partnerId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "PartnerKPI_partnerId_periodYear_periodMonth_idx" ON "PartnerKPI"("partnerId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "CapacityDeclaration_periodStart_idx" ON "CapacityDeclaration"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "CapacityDeclaration_partnerId_processId_periodStart_key" ON "CapacityDeclaration"("partnerId", "processId", "periodStart");

-- CreateIndex
CREATE INDEX "CapacityAllocation_partnerId_periodStart_idx" ON "CapacityAllocation"("partnerId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "Tool_toolCode_key" ON "Tool"("toolCode");

-- CreateIndex
CREATE INDEX "Tool_category_idx" ON "Tool"("category");

-- CreateIndex
CREATE INDEX "Tool_nextCalibrationDue_idx" ON "Tool"("nextCalibrationDue");

-- CreateIndex
CREATE INDEX "ToolIssue_toolId_idx" ON "ToolIssue"("toolId");

-- CreateIndex
CREATE INDEX "ToolIssue_partnerId_status_idx" ON "ToolIssue"("partnerId", "status");

-- CreateIndex
CREATE INDEX "CalibrationRecord_toolId_idx" ON "CalibrationRecord"("toolId");

-- CreateIndex
CREATE INDEX "Notification_userId_status_idx" ON "Notification"("userId", "status");

-- CreateIndex
CREATE INDEX "Notification_event_idx" ON "Notification"("event");

-- CreateIndex
CREATE INDEX "ImsSyncLog_entity_createdAt_idx" ON "ImsSyncLog"("entity", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "NumberSequence_key_key" ON "NumberSequence"("key");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompany" ADD CONSTRAINT "UserCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompany" ADD CONSTRAINT "UserCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photograph" ADD CONSTRAINT "Photograph_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerLocation" ADD CONSTRAINT "PartnerLocation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerDocument" ADD CONSTRAINT "PartnerDocument_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerDocument" ADD CONSTRAINT "PartnerDocument_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCapability" ADD CONSTRAINT "PartnerCapability_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMachine" ADD CONSTRAINT "PartnerMachine_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerEmployee" ADD CONSTRAINT "PartnerEmployee_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAudit" ADD CONSTRAINT "PartnerAudit_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAudit" ADD CONSTRAINT "PartnerAudit_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerStatusHistory" ADD CONSTRAINT "PartnerStatusHistory_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerStatusHistory" ADD CONSTRAINT "PartnerStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentProcess" ADD CONSTRAINT "ComponentProcess_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentProcess" ADD CONSTRAINT "ComponentProcess_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentItem" ADD CONSTRAINT "ComponentItem_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentItem" ADD CONSTRAINT "ComponentItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentCriticality" ADD CONSTRAINT "ComponentCriticality_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovedPartnerComponent" ADD CONSTRAINT "ApprovedPartnerComponent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovedPartnerComponent" ADD CONSTRAINT "ApprovedPartnerComponent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drawing" ADD CONSTRAINT "Drawing_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drawing" ADD CONSTRAINT "Drawing_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drawing" ADD CONSTRAINT "Drawing_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drawing" ADD CONSTRAINT "Drawing_currentRevisionId_fkey" FOREIGN KEY ("currentRevisionId") REFERENCES "DrawingRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_drawingId_fkey" FOREIGN KEY ("drawingId") REFERENCES "Drawing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingAccess" ADD CONSTRAINT "DrawingAccess_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "DrawingRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingAccess" ADD CONSTRAINT "DrawingAccess_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingAccess" ADD CONSTRAINT "DrawingAccess_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GridJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingAcknowledgement" ADD CONSTRAINT "DrawingAcknowledgement_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "DrawingRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingAcknowledgement" ADD CONSTRAINT "DrawingAcknowledgement_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingAcknowledgement" ADD CONSTRAINT "DrawingAcknowledgement_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingAccessLog" ADD CONSTRAINT "DrawingAccessLog_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "DrawingRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingAccessLog" ADD CONSTRAINT "DrawingAccessLog_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingAccessLog" ADD CONSTRAINT "DrawingAccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineeringChange" ADD CONSTRAINT "EngineeringChange_drawingId_fkey" FOREIGN KEY ("drawingId") REFERENCES "Drawing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineeringChange" ADD CONSTRAINT "EngineeringChange_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "DrawingRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineeringChange" ADD CONSTRAINT "EngineeringChange_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineeringChange" ADD CONSTRAINT "EngineeringChange_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GridJob" ADD CONSTRAINT "GridJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GridJob" ADD CONSTRAINT "GridJob_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GridJob" ADD CONSTRAINT "GridJob_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GridJob" ADD CONSTRAINT "GridJob_drawingRevisionId_fkey" FOREIGN KEY ("drawingRevisionId") REFERENCES "DrawingRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GridJob" ADD CONSTRAINT "GridJob_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GridJob" ADD CONSTRAINT "GridJob_inspectionPlanId_fkey" FOREIGN KEY ("inspectionPlanId") REFERENCES "InspectionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GridJob" ADD CONSTRAINT "GridJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GridJobItem" ADD CONSTRAINT "GridJobItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GridJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GridJobItem" ADD CONSTRAINT "GridJobItem_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GridJobItem" ADD CONSTRAINT "GridJobItem_drawingRevisionId_fkey" FOREIGN KEY ("drawingRevisionId") REFERENCES "DrawingRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GridJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobMilestone" ADD CONSTRAINT "JobMilestone_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GridJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobMilestone" ADD CONSTRAINT "JobMilestone_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobStatusHistory" ADD CONSTRAINT "JobStatusHistory_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GridJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobStatusHistory" ADD CONSTRAINT "JobStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobDelay" ADD CONSTRAINT "JobDelay_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GridJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobDelay" ADD CONSTRAINT "JobDelay_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobClarification" ADD CONSTRAINT "JobClarification_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GridJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobClarification" ADD CONSTRAINT "JobClarification_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobClarification" ADD CONSTRAINT "JobClarification_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GridJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssueItem" ADD CONSTRAINT "MaterialIssueItem_materialIssueId_fkey" FOREIGN KEY ("materialIssueId") REFERENCES "MaterialIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssueItem" ADD CONSTRAINT "MaterialIssueItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceiptAcknowledgement" ADD CONSTRAINT "MaterialReceiptAcknowledgement_materialIssueId_fkey" FOREIGN KEY ("materialIssueId") REFERENCES "MaterialIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceiptAcknowledgement" ADD CONSTRAINT "MaterialReceiptAcknowledgement_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialConsumption" ADD CONSTRAINT "MaterialConsumption_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GridJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialConsumption" ADD CONSTRAINT "MaterialConsumption_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapReturn" ADD CONSTRAINT "ScrapReturn_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GridJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapReturn" ADD CONSTRAINT "ScrapReturn_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReconciliation" ADD CONSTRAINT "MaterialReconciliation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GridJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReconciliation" ADD CONSTRAINT "MaterialReconciliation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReconciliation" ADD CONSTRAINT "MaterialReconciliation_reconciledById_fkey" FOREIGN KEY ("reconciledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionPlan" ADD CONSTRAINT "InspectionPlan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionPlan" ADD CONSTRAINT "InspectionPlan_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionCharacteristic" ADD CONSTRAINT "InspectionCharacteristic_inspectionPlanId_fkey" FOREIGN KEY ("inspectionPlanId") REFERENCES "InspectionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GridJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_inspectionPlanId_fkey" FOREIGN KEY ("inspectionPlanId") REFERENCES "InspectionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionResult" ADD CONSTRAINT "InspectionResult_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionResult" ADD CONSTRAINT "InspectionResult_characteristicId_fkey" FOREIGN KEY ("characteristicId") REFERENCES "InspectionCharacteristic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformance" ADD CONSTRAINT "NonConformance_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GridJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformance" ADD CONSTRAINT "NonConformance_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformance" ADD CONSTRAINT "NonConformance_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformance" ADD CONSTRAINT "NonConformance_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_nonConformanceId_fkey" FOREIGN KEY ("nonConformanceId") REFERENCES "NonConformance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReworkOrder" ADD CONSTRAINT "ReworkOrder_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GridJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReworkOrder" ADD CONSTRAINT "ReworkOrder_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReworkOrder" ADD CONSTRAINT "ReworkOrder_nonConformanceId_fkey" FOREIGN KEY ("nonConformanceId") REFERENCES "NonConformance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReworkOrder" ADD CONSTRAINT "ReworkOrder_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviationApproval" ADD CONSTRAINT "DeviationApproval_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviationApproval" ADD CONSTRAINT "DeviationApproval_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_fromPartnerId_fkey" FOREIGN KEY ("fromPartnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_toPartnerId_fkey" FOREIGN KEY ("toPartnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GridJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_materialIssueId_fkey" FOREIGN KEY ("materialIssueId") REFERENCES "MaterialIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofOfDelivery" ADD CONSTRAINT "ProofOfDelivery_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRate" ADD CONSTRAINT "PartnerRate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRate" ADD CONSTRAINT "PartnerRate_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRate" ADD CONSTRAINT "PartnerRate_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerIncentiveRule" ADD CONSTRAINT "PartnerIncentiveRule_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerDeduction" ADD CONSTRAINT "PartnerDeduction_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerDeduction" ADD CONSTRAINT "PartnerDeduction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PartnerInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerInvoice" ADD CONSTRAINT "PartnerInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerInvoice" ADD CONSTRAINT "PartnerInvoice_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerInvoice" ADD CONSTRAINT "PartnerInvoice_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerInvoiceItem" ADD CONSTRAINT "PartnerInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PartnerInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerInvoiceItem" ADD CONSTRAINT "PartnerInvoiceItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GridJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentApproval" ADD CONSTRAINT "PaymentApproval_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PartnerInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentApproval" ADD CONSTRAINT "PaymentApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PartnerInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerScore" ADD CONSTRAINT "PartnerScore_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerKPI" ADD CONSTRAINT "PartnerKPI_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerKPI" ADD CONSTRAINT "PartnerKPI_scoreId_fkey" FOREIGN KEY ("scoreId") REFERENCES "PartnerScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacityDeclaration" ADD CONSTRAINT "CapacityDeclaration_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacityDeclaration" ADD CONSTRAINT "CapacityDeclaration_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacityDeclaration" ADD CONSTRAINT "CapacityDeclaration_declaredById_fkey" FOREIGN KEY ("declaredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacityAllocation" ADD CONSTRAINT "CapacityAllocation_declarationId_fkey" FOREIGN KEY ("declarationId") REFERENCES "CapacityDeclaration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacityAllocation" ADD CONSTRAINT "CapacityAllocation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacityAllocation" ADD CONSTRAINT "CapacityAllocation_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacityAllocation" ADD CONSTRAINT "CapacityAllocation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GridJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tool" ADD CONSTRAINT "Tool_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolIssue" ADD CONSTRAINT "ToolIssue_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolIssue" ADD CONSTRAINT "ToolIssue_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolIssue" ADD CONSTRAINT "ToolIssue_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GridJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolIssue" ADD CONSTRAINT "ToolIssue_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationRecord" ADD CONSTRAINT "CalibrationRecord_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationRecord" ADD CONSTRAINT "CalibrationRecord_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImsSyncLog" ADD CONSTRAINT "ImsSyncLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;


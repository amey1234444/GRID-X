import { RoleCode } from './enums';

/**
 * Permission codes are `<resource>:<action>`.
 * Section 18 requires role-based permissions and partner isolation, so every API route
 * declares the permission it needs and the guard resolves it from the user's role.
 */
export const PERMISSIONS = {
  // Partners
  PARTNER_READ: 'partner:read',
  PARTNER_CREATE: 'partner:create',
  PARTNER_UPDATE: 'partner:update',
  PARTNER_APPROVE: 'partner:approve',
  PARTNER_SUSPEND: 'partner:suspend',
  PARTNER_AUDIT: 'partner:audit',
  PARTNER_CAPABILITY_MANAGE: 'partner_capability:manage',
  PARTNER_DOCUMENT_MANAGE: 'partner_document:manage',
  PARTNER_MACHINE_MANAGE: 'partner_machine:manage',

  // Components / engineering
  COMPONENT_READ: 'component:read',
  COMPONENT_MANAGE: 'component:manage',
  PROCESS_MANAGE: 'process:manage',
  ITEM_READ: 'item:read',
  ITEM_MANAGE: 'item:manage',

  // Drawings
  DRAWING_READ: 'drawing:read',
  DRAWING_MANAGE: 'drawing:manage',
  DRAWING_APPROVE: 'drawing:approve',
  DRAWING_RELEASE: 'drawing:release',
  DRAWING_ACCESS_MANAGE: 'drawing_access:manage',
  DRAWING_ACKNOWLEDGE: 'drawing:acknowledge',
  DRAWING_AUDIT_READ: 'drawing_audit:read',

  // Jobs
  JOB_READ: 'job:read',
  JOB_CREATE: 'job:create',
  JOB_UPDATE: 'job:update',
  JOB_ALLOCATE: 'job:allocate',
  JOB_CLASS_A_OVERRIDE: 'job:class_a_override',
  JOB_RESPOND: 'job:respond',
  JOB_MILESTONE_UPDATE: 'job_milestone:update',
  JOB_CLOSE: 'job:close',
  JOB_CLARIFICATION_RAISE: 'job_clarification:raise',
  JOB_CLARIFICATION_ANSWER: 'job_clarification:answer',

  // Capacity
  CAPACITY_READ: 'capacity:read',
  CAPACITY_DECLARE: 'capacity:declare',

  // Materials
  MATERIAL_READ: 'material:read',
  MATERIAL_ISSUE: 'material:issue',
  MATERIAL_ACKNOWLEDGE: 'material:acknowledge',
  MATERIAL_CONSUMPTION_UPDATE: 'material_consumption:update',
  MATERIAL_RECONCILE: 'material:reconcile',

  // Quality
  INSPECTION_READ: 'inspection:read',
  INSPECTION_REQUEST: 'inspection:request',
  INSPECTION_PERFORM: 'inspection:perform',
  INSPECTION_PLAN_MANAGE: 'inspection_plan:manage',
  NONCONFORMANCE_MANAGE: 'nonconformance:manage',
  REWORK_MANAGE: 'rework:manage',
  CORRECTIVE_ACTION_MANAGE: 'corrective_action:manage',
  DEVIATION_APPROVE: 'deviation:approve',

  // Tooling
  TOOL_READ: 'tool:read',
  TOOL_MANAGE: 'tool:manage',

  // Logistics
  SHIPMENT_READ: 'shipment:read',
  SHIPMENT_MANAGE: 'shipment:manage',

  // Commercials
  RATE_READ: 'rate:read',
  RATE_MANAGE: 'rate:manage',
  INVOICE_READ: 'invoice:read',
  INVOICE_SUBMIT: 'invoice:submit',
  INVOICE_VERIFY_QUANTITY: 'invoice:verify_quantity',
  INVOICE_VERIFY_QUALITY: 'invoice:verify_quality',
  INVOICE_APPROVE: 'invoice:approve',
  PAYMENT_RECORD: 'payment:record',

  // Performance
  SCORECARD_READ: 'scorecard:read',
  SCORECARD_COMPUTE: 'scorecard:compute',

  // Dashboards and reports
  DASHBOARD_MANAGEMENT: 'dashboard:management',
  DASHBOARD_OPERATIONS: 'dashboard:operations',
  DASHBOARD_QUALITY: 'dashboard:quality',
  DASHBOARD_FINANCE: 'dashboard:finance',
  DASHBOARD_PARTNER: 'dashboard:partner',
  REPORT_READ: 'report:read',

  // Administration
  USER_READ: 'user:read',
  USER_MANAGE: 'user:manage',
  ROLE_MANAGE: 'role:manage',
  COMPANY_MANAGE: 'company:manage',
  SETTING_MANAGE: 'setting:manage',
  AUDIT_LOG_READ: 'audit_log:read',
  IMS_SYNC: 'ims:sync',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionCode[] = Object.values(PERMISSIONS);

const P = PERMISSIONS;

const READ_ONLY_MANAGEMENT: PermissionCode[] = [
  P.PARTNER_READ,
  P.COMPONENT_READ,
  P.DRAWING_READ,
  P.JOB_READ,
  P.CAPACITY_READ,
  P.MATERIAL_READ,
  P.INSPECTION_READ,
  P.TOOL_READ,
  P.SHIPMENT_READ,
  P.RATE_READ,
  P.INVOICE_READ,
  P.SCORECARD_READ,
  P.DASHBOARD_MANAGEMENT,
  P.DASHBOARD_OPERATIONS,
  P.DASHBOARD_QUALITY,
  P.DASHBOARD_FINANCE,
  P.REPORT_READ,
];

/** Role → permission matrix implementing Section 4 role definitions. */
export const ROLE_PERMISSIONS: Record<RoleCode, PermissionCode[]> = {
  GROUP_ADMIN: ALL_PERMISSIONS,

  GRIDX_HEAD: [
    P.PARTNER_READ,
    P.PARTNER_CREATE,
    P.PARTNER_UPDATE,
    P.PARTNER_APPROVE,
    P.PARTNER_SUSPEND,
    P.PARTNER_AUDIT,
    P.PARTNER_CAPABILITY_MANAGE,
    P.PARTNER_DOCUMENT_MANAGE,
    P.PARTNER_MACHINE_MANAGE,
    P.COMPONENT_READ,
    P.COMPONENT_MANAGE,
    P.ITEM_READ,
    P.DRAWING_READ,
    P.DRAWING_ACCESS_MANAGE,
    P.DRAWING_AUDIT_READ,
    P.JOB_READ,
    P.JOB_CREATE,
    P.JOB_UPDATE,
    P.JOB_ALLOCATE,
    P.JOB_CLASS_A_OVERRIDE,
    P.JOB_CLOSE,
    P.JOB_CLARIFICATION_ANSWER,
    P.CAPACITY_READ,
    P.MATERIAL_READ,
    P.INSPECTION_READ,
    P.NONCONFORMANCE_MANAGE,
    P.REWORK_MANAGE,
    P.CORRECTIVE_ACTION_MANAGE,
    P.TOOL_READ,
    P.TOOL_MANAGE,
    P.SHIPMENT_READ,
    P.RATE_READ,
    P.INVOICE_READ,
    P.SCORECARD_READ,
    P.SCORECARD_COMPUTE,
    P.DASHBOARD_MANAGEMENT,
    P.DASHBOARD_OPERATIONS,
    P.DASHBOARD_QUALITY,
    P.DASHBOARD_FINANCE,
    P.REPORT_READ,
    P.USER_READ,
    P.USER_MANAGE,
    P.AUDIT_LOG_READ,
  ],

  OPERATIONS_HEAD: [
    P.PARTNER_READ,
    P.COMPONENT_READ,
    P.DRAWING_READ,
    P.JOB_READ,
    P.JOB_CREATE,
    P.JOB_UPDATE,
    P.JOB_ALLOCATE,
    P.JOB_CLOSE,
    P.JOB_CLARIFICATION_ANSWER,
    P.CAPACITY_READ,
    P.MATERIAL_READ,
    P.INSPECTION_READ,
    P.INSPECTION_REQUEST,
    P.SHIPMENT_READ,
    P.SHIPMENT_MANAGE,
    P.TOOL_READ,
    P.SCORECARD_READ,
    P.DASHBOARD_OPERATIONS,
    P.DASHBOARD_QUALITY,
    P.REPORT_READ,
  ],

  ENGINEERING_USER: [
    P.PARTNER_READ,
    P.COMPONENT_READ,
    P.COMPONENT_MANAGE,
    P.PROCESS_MANAGE,
    P.ITEM_READ,
    P.DRAWING_READ,
    P.DRAWING_MANAGE,
    P.DRAWING_APPROVE,
    P.DRAWING_RELEASE,
    P.DRAWING_ACCESS_MANAGE,
    P.DRAWING_AUDIT_READ,
    P.INSPECTION_PLAN_MANAGE,
    P.INSPECTION_READ,
    P.DEVIATION_APPROVE,
    P.JOB_READ,
    P.JOB_CLARIFICATION_ANSWER,
    P.REPORT_READ,
  ],

  PROCUREMENT_USER: [
    P.PARTNER_READ,
    P.PARTNER_CREATE,
    P.PARTNER_UPDATE,
    P.PARTNER_DOCUMENT_MANAGE,
    P.COMPONENT_READ,
    P.ITEM_READ,
    P.ITEM_MANAGE,
    P.JOB_READ,
    P.RATE_READ,
    P.RATE_MANAGE,
    P.INVOICE_READ,
    P.SCORECARD_READ,
    P.REPORT_READ,
    P.DASHBOARD_FINANCE,
  ],

  QUALITY_INSPECTOR: [
    P.PARTNER_READ,
    P.PARTNER_AUDIT,
    P.COMPONENT_READ,
    P.DRAWING_READ,
    P.JOB_READ,
    P.INSPECTION_READ,
    P.INSPECTION_PERFORM,
    P.INSPECTION_PLAN_MANAGE,
    P.NONCONFORMANCE_MANAGE,
    P.REWORK_MANAGE,
    P.CORRECTIVE_ACTION_MANAGE,
    P.DASHBOARD_QUALITY,
    P.REPORT_READ,
  ],

  STORES_USER: [
    P.PARTNER_READ,
    P.COMPONENT_READ,
    P.ITEM_READ,
    P.JOB_READ,
    P.MATERIAL_READ,
    P.MATERIAL_ISSUE,
    P.MATERIAL_CONSUMPTION_UPDATE,
    P.MATERIAL_RECONCILE,
    P.TOOL_READ,
    P.TOOL_MANAGE,
    P.SHIPMENT_READ,
    P.REPORT_READ,
  ],

  FINANCE_USER: [
    P.PARTNER_READ,
    P.COMPONENT_READ,
    P.JOB_READ,
    P.MATERIAL_READ,
    P.RATE_READ,
    P.INVOICE_READ,
    P.INVOICE_VERIFY_QUANTITY,
    P.INVOICE_VERIFY_QUALITY,
    P.INVOICE_APPROVE,
    P.PAYMENT_RECORD,
    P.SCORECARD_READ,
    P.DASHBOARD_FINANCE,
    P.REPORT_READ,
  ],

  LOGISTICS_COORDINATOR: [
    P.PARTNER_READ,
    P.JOB_READ,
    P.MATERIAL_READ,
    P.SHIPMENT_READ,
    P.SHIPMENT_MANAGE,
    P.REPORT_READ,
  ],

  MANAGEMENT_VIEWER: READ_ONLY_MANAGEMENT,

  // ---- Partner roles (all reads are additionally scoped to their own partner) ----
  PARTNER_OWNER: [
    P.DASHBOARD_PARTNER,
    P.JOB_READ,
    P.JOB_RESPOND,
    P.JOB_MILESTONE_UPDATE,
    P.JOB_CLARIFICATION_RAISE,
    P.DRAWING_READ,
    P.DRAWING_ACKNOWLEDGE,
    P.MATERIAL_READ,
    P.MATERIAL_ACKNOWLEDGE,
    P.INSPECTION_READ,
    P.INSPECTION_REQUEST,
    P.CAPACITY_READ,
    P.CAPACITY_DECLARE,
    P.INVOICE_READ,
    P.INVOICE_SUBMIT,
    P.SCORECARD_READ,
    P.SHIPMENT_READ,
    P.TOOL_READ,
    P.USER_READ,
    P.USER_MANAGE,
    P.COMPONENT_READ,
  ],

  PARTNER_SUPERVISOR: [
    P.DASHBOARD_PARTNER,
    P.JOB_READ,
    P.JOB_RESPOND,
    P.JOB_MILESTONE_UPDATE,
    P.JOB_CLARIFICATION_RAISE,
    P.DRAWING_READ,
    P.DRAWING_ACKNOWLEDGE,
    P.MATERIAL_READ,
    P.MATERIAL_ACKNOWLEDGE,
    P.INSPECTION_READ,
    P.INSPECTION_REQUEST,
    P.CAPACITY_READ,
    P.CAPACITY_DECLARE,
    P.SCORECARD_READ,
    P.COMPONENT_READ,
  ],

  PARTNER_WORKER: [
    P.DASHBOARD_PARTNER,
    P.JOB_READ,
    P.JOB_MILESTONE_UPDATE,
    P.DRAWING_READ,
  ],
};

export function permissionsForRole(role: RoleCode): PermissionCode[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(role: RoleCode, permission: PermissionCode): boolean {
  return permissionsForRole(role).includes(permission);
}

export function describePermission(code: PermissionCode): { resource: string; action: string } {
  const [resource, action] = code.split(':');
  return { resource, action };
}

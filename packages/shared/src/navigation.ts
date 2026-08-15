import { PERMISSIONS, PermissionCode } from './permissions';

export interface NavItem {
  label: string;
  href: string;
  permission?: PermissionCode;
  /** lucide-react icon name */
  icon?: string;
}

export interface NavSection {
  label: string;
  href?: string;
  icon: string;
  permission?: PermissionCode;
  items?: NavItem[];
}

/** Section 24 — recommended navigation structure for GRID-X Control. */
export const CONTROL_NAVIGATION: NavSection[] = [
  {
    label: 'Dashboard',
    href: '/app',
    icon: 'LayoutDashboard',
  },
  {
    label: 'Partners',
    icon: 'Factory',
    permission: PERMISSIONS.PARTNER_READ,
    items: [
      { label: 'All Partners', href: '/app/partners', permission: PERMISSIONS.PARTNER_READ },
      { label: 'Capabilities', href: '/app/partners/capabilities', permission: PERMISSIONS.PARTNER_READ },
      { label: 'Machines', href: '/app/partners/machines', permission: PERMISSIONS.PARTNER_READ },
      { label: 'Audits', href: '/app/partners/audits', permission: PERMISSIONS.PARTNER_READ },
      { label: 'Scorecards', href: '/app/partners/scorecards', permission: PERMISSIONS.SCORECARD_READ },
    ],
  },
  {
    label: 'Engineering',
    icon: 'Ruler',
    permission: PERMISSIONS.COMPONENT_READ,
    items: [
      { label: 'Components', href: '/app/engineering/components', permission: PERMISSIONS.COMPONENT_READ },
      { label: 'Processes', href: '/app/engineering/processes', permission: PERMISSIONS.COMPONENT_READ },
      { label: 'Drawings', href: '/app/engineering/drawings', permission: PERMISSIONS.DRAWING_READ },
      { label: 'Revisions', href: '/app/engineering/revisions', permission: PERMISSIONS.DRAWING_READ },
      { label: 'Inspection Plans', href: '/app/engineering/inspection-plans', permission: PERMISSIONS.INSPECTION_READ },
    ],
  },
  {
    label: 'Production',
    icon: 'Cog',
    permission: PERMISSIONS.JOB_READ,
    items: [
      { label: 'Jobs', href: '/app/production/jobs', permission: PERMISSIONS.JOB_READ },
      { label: 'Planning Board', href: '/app/production/planning-board', permission: PERMISSIONS.JOB_READ },
      { label: 'Capacity', href: '/app/production/capacity', permission: PERMISSIONS.CAPACITY_READ },
      { label: 'Delays', href: '/app/production/delays', permission: PERMISSIONS.JOB_READ },
      { label: 'Clarifications', href: '/app/production/clarifications', permission: PERMISSIONS.JOB_READ },
    ],
  },
  {
    label: 'Materials',
    icon: 'Boxes',
    permission: PERMISSIONS.MATERIAL_READ,
    items: [
      { label: 'Material Issue', href: '/app/materials/issues', permission: PERMISSIONS.MATERIAL_READ },
      { label: 'Partner Stock', href: '/app/materials/partner-stock', permission: PERMISSIONS.MATERIAL_READ },
      { label: 'Scrap', href: '/app/materials/scrap', permission: PERMISSIONS.MATERIAL_READ },
      { label: 'Reconciliation', href: '/app/materials/reconciliation', permission: PERMISSIONS.MATERIAL_READ },
    ],
  },
  {
    label: 'Quality',
    icon: 'ShieldCheck',
    permission: PERMISSIONS.INSPECTION_READ,
    items: [
      { label: 'Inspection Queue', href: '/app/quality/inspections', permission: PERMISSIONS.INSPECTION_READ },
      { label: 'Rejections', href: '/app/quality/rejections', permission: PERMISSIONS.INSPECTION_READ },
      { label: 'Rework', href: '/app/quality/rework', permission: PERMISSIONS.INSPECTION_READ },
      { label: 'Corrective Actions', href: '/app/quality/corrective-actions', permission: PERMISSIONS.INSPECTION_READ },
    ],
  },
  {
    label: 'Logistics',
    icon: 'Truck',
    permission: PERMISSIONS.SHIPMENT_READ,
    items: [
      { label: 'Pickups', href: '/app/logistics/pickups', permission: PERMISSIONS.SHIPMENT_READ },
      { label: 'Shipments', href: '/app/logistics/shipments', permission: PERMISSIONS.SHIPMENT_READ },
      { label: 'Deliveries', href: '/app/logistics/deliveries', permission: PERMISSIONS.SHIPMENT_READ },
    ],
  },
  {
    label: 'Tooling',
    icon: 'Wrench',
    permission: PERMISSIONS.TOOL_READ,
    items: [
      { label: 'Tools & Fixtures', href: '/app/tooling', permission: PERMISSIONS.TOOL_READ },
      { label: 'Calibration', href: '/app/tooling/calibration', permission: PERMISSIONS.TOOL_READ },
    ],
  },
  {
    label: 'Commercial',
    icon: 'Wallet',
    permission: PERMISSIONS.INVOICE_READ,
    items: [
      { label: 'Rates', href: '/app/commercial/rates', permission: PERMISSIONS.RATE_READ },
      { label: 'Invoices', href: '/app/commercial/invoices', permission: PERMISSIONS.INVOICE_READ },
      { label: 'Approvals', href: '/app/commercial/approvals', permission: PERMISSIONS.INVOICE_READ },
      { label: 'Payments', href: '/app/commercial/payments', permission: PERMISSIONS.INVOICE_READ },
    ],
  },
  {
    label: 'Reports',
    href: '/app/reports',
    icon: 'BarChart3',
    permission: PERMISSIONS.REPORT_READ,
  },
  {
    label: 'Administration',
    icon: 'Settings',
    permission: PERMISSIONS.USER_READ,
    items: [
      { label: 'Users', href: '/app/admin/users', permission: PERMISSIONS.USER_READ },
      { label: 'Roles', href: '/app/admin/roles', permission: PERMISSIONS.USER_READ },
      { label: 'Companies', href: '/app/admin/companies', permission: PERMISSIONS.USER_READ },
      { label: 'Settings', href: '/app/admin/settings', permission: PERMISSIONS.USER_READ },
      { label: 'Audit Log', href: '/app/admin/audit-log', permission: PERMISSIONS.AUDIT_LOG_READ },
    ],
  },
];

/** Section 7 — partner application screens. */
export const PARTNER_NAVIGATION: NavItem[] = [
  { label: 'Dashboard', href: '/partner', icon: 'LayoutDashboard' },
  { label: 'New Jobs', href: '/partner/jobs/new', icon: 'Inbox' },
  { label: 'Active Jobs', href: '/partner/jobs', icon: 'Cog' },
  { label: 'Drawings', href: '/partner/drawings', icon: 'FileText' },
  { label: 'Material', href: '/partner/material', icon: 'Boxes' },
  { label: 'Inspections', href: '/partner/inspections', icon: 'ShieldCheck' },
  { label: 'Invoices', href: '/partner/invoices', icon: 'Wallet' },
  { label: 'Scorecard', href: '/partner/scorecard', icon: 'Gauge' },
  { label: 'Support', href: '/partner/support', icon: 'LifeBuoy' },
];

/** Partner bottom tab bar for the mobile-first PWA. */
export const PARTNER_TABS: NavItem[] = [
  { label: 'Home', href: '/partner', icon: 'Home' },
  { label: 'Jobs', href: '/partner/jobs', icon: 'ClipboardList' },
  { label: 'Material', href: '/partner/material', icon: 'Boxes' },
  { label: 'Invoices', href: '/partner/invoices', icon: 'Wallet' },
  { label: 'Score', href: '/partner/scorecard', icon: 'Gauge' },
];

/** GRID-X Inspector screens. */
export const INSPECTOR_NAVIGATION: NavItem[] = [
  { label: 'Pending', href: '/inspector', icon: 'ClipboardCheck' },
  { label: 'Audits', href: '/inspector/audits', icon: 'ShieldCheck' },
  { label: 'Corrective Actions', href: '/inspector/corrective-actions', icon: 'Wrench' },
];

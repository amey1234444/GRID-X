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

/** Section 24 — navigation structure for GRID-X Control. */
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
      { label: 'All partners', href: '/app/partners', permission: PERMISSIONS.PARTNER_READ },
      { label: 'Scorecards', href: '/app/partners/scorecards', permission: PERMISSIONS.SCORECARD_READ },
    ],
  },
  {
    label: 'Engineering',
    icon: 'Ruler',
    permission: PERMISSIONS.COMPONENT_READ,
    items: [
      { label: 'Components', href: '/app/engineering/components', permission: PERMISSIONS.COMPONENT_READ },
      { label: 'Drawings', href: '/app/engineering/drawings', permission: PERMISSIONS.DRAWING_READ },
      {
        label: 'Inspection plans',
        href: '/app/engineering/inspection-plans',
        permission: PERMISSIONS.INSPECTION_READ,
      },
      { label: 'Masters', href: '/app/engineering/masters', permission: PERMISSIONS.COMPONENT_READ },
    ],
  },
  {
    label: 'Production',
    icon: 'Cog',
    permission: PERMISSIONS.JOB_READ,
    items: [
      { label: 'Jobs', href: '/app/production/jobs', permission: PERMISSIONS.JOB_READ },
      { label: 'Planning board', href: '/app/production/planning-board', permission: PERMISSIONS.JOB_READ },
      { label: 'Capacity', href: '/app/production/capacity', permission: PERMISSIONS.CAPACITY_READ },
    ],
  },
  {
    label: 'Materials',
    icon: 'Boxes',
    permission: PERMISSIONS.MATERIAL_READ,
    items: [
      { label: 'Material issues', href: '/app/materials/issues', permission: PERMISSIONS.MATERIAL_READ },
      { label: 'Reconciliation', href: '/app/materials/reconciliation', permission: PERMISSIONS.MATERIAL_READ },
    ],
  },
  {
    label: 'Quality',
    icon: 'ShieldCheck',
    permission: PERMISSIONS.INSPECTION_READ,
    items: [
      { label: 'Inspection queue', href: '/app/quality/inspections', permission: PERMISSIONS.INSPECTION_READ },
      {
        label: 'Non-conformances',
        href: '/app/quality/non-conformances',
        permission: PERMISSIONS.INSPECTION_READ,
      },
      { label: 'Rework', href: '/app/quality/rework', permission: PERMISSIONS.INSPECTION_READ },
    ],
  },
  {
    label: 'Logistics',
    icon: 'Truck',
    permission: PERMISSIONS.SHIPMENT_READ,
    items: [
      { label: 'Shipments', href: '/app/logistics/shipments', permission: PERMISSIONS.SHIPMENT_READ },
      { label: 'Vehicles', href: '/app/logistics/vehicles', permission: PERMISSIONS.SHIPMENT_READ },
    ],
  },
  {
    label: 'Tooling',
    href: '/app/tooling',
    icon: 'Wrench',
    permission: PERMISSIONS.TOOL_READ,
  },
  {
    label: 'Commercial',
    icon: 'Wallet',
    permission: PERMISSIONS.INVOICE_READ,
    items: [
      { label: 'Rates', href: '/app/commercial/rates', permission: PERMISSIONS.RATE_READ },
      { label: 'Invoices', href: '/app/commercial/invoices', permission: PERMISSIONS.INVOICE_READ },
    ],
  },
  {
    label: 'Reports',
    href: '/app/reports',
    icon: 'BarChart3',
    permission: PERMISSIONS.REPORT_READ,
  },
  {
    label: 'IMS integration',
    href: '/app/ims',
    icon: 'Network',
    permission: PERMISSIONS.IMS_SYNC,
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
      { label: 'Audit log', href: '/app/admin/audit-log', permission: PERMISSIONS.AUDIT_LOG_READ },
    ],
  },
];

/** Section 7 — partner application screens. */
export const PARTNER_NAVIGATION: NavItem[] = [
  { label: 'Dashboard', href: '/partner', icon: 'LayoutDashboard' },
  { label: 'Jobs', href: '/partner/jobs', icon: 'ClipboardList' },
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
  { label: 'Queue', href: '/inspector', icon: 'ClipboardCheck' },
  { label: 'Non-conformances', href: '/inspector/non-conformances', icon: 'ShieldCheck' },
  { label: 'Rework', href: '/inspector/rework', icon: 'Wrench' },
];

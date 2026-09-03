'use client';

import {
  BarChart3,
  Bell,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Cog,
  Factory,
  FileText,
  Gauge,
  Home,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Network,
  Ruler,
  Hammer,
  Settings,
  ShieldCheck,
  Truck,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  BarChart3,
  Bell,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Cog,
  Factory,
  FileText,
  Gauge,
  Home,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Network,
  Ruler,
  Hammer,
  Settings,
  ShieldCheck,
  Truck,
  Wallet,
  Wrench,
};

export function NavIcon({ name, className }: { name?: string; className?: string }): React.JSX.Element {
  const Icon = (name && ICONS[name]) || LayoutDashboard;
  return <Icon className={className} />;
}

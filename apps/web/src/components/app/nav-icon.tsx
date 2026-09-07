'use client';

import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Clock,
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
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Clock,
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

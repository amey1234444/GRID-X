'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CONTROL_NAVIGATION, type AuthUser, type NavSection } from '@gridx/shared';
import { ChevronDown, Menu, X } from 'lucide-react';

import { Wordmark } from '@/components/brand';
import { NavIcon } from '@/components/app/nav-icon';
import { UserMenu } from '@/components/app/user-menu';
import { NotificationBell } from '@/components/app/notification-bell';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { ScrollableNav } from '@/components/app/scrollable-nav';
import { cn } from '@/lib/utils';

function visibleSections(user: AuthUser): NavSection[] {
  const permissions = new Set<string>(user.permissions);
  return CONTROL_NAVIGATION.filter(
    (section) => !section.permission || permissions.has(section.permission),
  ).map((section) => ({
    ...section,
    items: section.items?.filter((item) => !item.permission || permissions.has(item.permission)),
  }));
}

function SidebarSection({
  section,
  pathname,
  onNavigate,
}: {
  section: NavSection;
  pathname: string;
  onNavigate?: () => void;
}): React.JSX.Element {
  const hasChildren = Boolean(section.items?.length);
  const isActiveSection = section.items?.some((item) => pathname.startsWith(item.href)) ?? false;
  const [open, setOpen] = useState(isActiveSection);

  if (!hasChildren && section.href) {
    const active = pathname === section.href;
    return (
      <Link
        href={section.href}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          active
            ? 'bg-primary/10 font-medium text-primary'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        )}
      >
        <NavIcon name={section.icon} className="h-4 w-4" />
        {section.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          isActiveSection ? 'text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        )}
        aria-expanded={open}
      >
        <NavIcon name={section.icon} className="h-4 w-4" />
        <span className="flex-1 text-left">{section.label}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="mt-1 space-y-0.5 border-l pl-4 ml-4">
          {section.items?.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'block rounded-md px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function ControlShell({
  user,
  children,
}: {
  user: AuthUser;
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const sections = visibleSections(user);

  const sidebar = (onNavigate?: () => void): React.JSX.Element => (
    <ScrollableNav>
      <div className="space-y-1">
        {sections.map((section) => (
          <SidebarSection
            key={section.label}
            section={section}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </ScrollableNav>
  );

  return (
    <div className="min-h-screen bg-secondary/30">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-background lg:flex">
        <div className="flex h-16 items-center border-b px-5">
          <Wordmark href="/app" />
        </div>
        <div className="flex-1 overflow-hidden px-3 py-4">{sidebar()}</div>
        <div className="border-t p-4">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="truncate text-sm font-medium">{user.name}</p>
          <Badge variant="secondary" className="mt-2">
            {user.roleCode.replace(/_/g, ' ')}
          </Badge>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b glass px-4 sm:px-6">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex-1" />
          <NotificationBell inboxHref="/app/notifications" />
          <ThemeToggle />
          <UserMenu user={user} />
        </header>

        <main className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r bg-background">
            <div className="flex h-16 items-center justify-between border-b px-4">
              <Wordmark href="/app" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden px-3 py-4">{sidebar(() => setMobileOpen(false))}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

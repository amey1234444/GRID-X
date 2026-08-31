'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CONTROL_NAVIGATION, type AuthUser, type NavSection } from '@gridx/shared';
import { Activity, ChevronRight, Menu, PanelLeftClose, Search, X } from 'lucide-react';

import { CommandPalette, useCommandPalette } from '@/components/app/command-palette';
import { NavIcon } from '@/components/app/nav-icon';
import { NotificationBell } from '@/components/app/notification-bell';
import { UserMenu } from '@/components/app/user-menu';
import { WorkspaceSwitcher } from '@/components/app/workspace-switcher';
import { LogoMark } from '@/components/brand';
import { PageTransition } from '@/components/motion';
import { Kbd } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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

interface Crumb {
  label: string;
  href?: string;
}

/**
 * Derives the header breadcrumb from the nav tree, so every screen gets a
 * trail without any page having to declare one. A trailing record segment
 * (`/jobs/abc123`) becomes a final, unlinked "Detail" crumb.
 */
function breadcrumbFor(sections: NavSection[], pathname: string): Crumb[] {
  let best: { crumbs: Crumb[]; length: number } | null = null;

  const consider = (crumbs: Crumb[], href: string): void => {
    if (!(pathname === href || pathname.startsWith(`${href}/`))) return;
    if (!best || href.length > best.length) best = { crumbs, length: href.length };
  };

  for (const section of sections) {
    if (section.href) consider([{ label: section.label, href: section.href }], section.href);
    for (const item of section.items ?? []) {
      consider([{ label: section.label }, { label: item.label, href: item.href }], item.href);
    }
  }

  if (!best) return [{ label: 'Dashboard', href: '/app' }];

  const matched = best as { crumbs: Crumb[]; length: number };
  const crumbs = [...matched.crumbs];
  const remainder = pathname.slice(matched.length).replace(/^\//, '');
  if (remainder) {
    crumbs.push({ label: remainder === 'new' ? 'New' : 'Detail' });
  }
  // The last crumb is where you already are — never a link.
  const last = crumbs[crumbs.length - 1];
  if (last) delete last.href;
  return crumbs;
}

/* ---------------------------------------------------------------------- */

const rowBase = [
  'group relative flex w-full items-center gap-2.5 rounded-input px-2 py-[7px]',
  'text-[0.8125rem] leading-none',
  'transition-[background-color,color] duration-150 ease-out-expo',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
].join(' ');

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

  // Deep-linking into a collapsed group should reveal it.
  useEffect(() => {
    if (isActiveSection) setOpen(true);
  }, [isActiveSection]);

  if (!hasChildren && section.href) {
    const active = pathname === section.href;
    return (
      <Link
        href={section.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={cn(
          rowBase,
          active
            ? 'bg-surface-hover font-medium text-foreground'
            : 'text-muted-foreground hover:bg-surface-hover/70 hover:text-foreground',
        )}
      >
        {active ? (
          <span className="absolute inset-y-1 left-0 w-[2px] rounded-full bg-primary" aria-hidden />
        ) : null}
        <NavIcon
          name={section.icon}
          className={cn(
            'h-4 w-4 shrink-0 transition-opacity',
            active ? 'opacity-100' : 'opacity-60',
          )}
        />
        <span className="truncate">{section.label}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          rowBase,
          isActiveSection
            ? 'text-foreground'
            : 'text-muted-foreground hover:bg-surface-hover/70 hover:text-foreground',
        )}
      >
        <NavIcon
          name={section.icon}
          className={cn('h-4 w-4 shrink-0', isActiveSection ? 'opacity-100' : 'opacity-60')}
        />
        <span className="flex-1 truncate text-left">{section.label}</span>
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-subtle transition-transform duration-200 ease-out-expo',
            open && 'rotate-90',
          )}
        />
      </button>

      {/* Grid-rows trick animates height without measuring the content. */}
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-out-expo',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="relative ml-[15px] mt-0.5 space-y-px border-l border-border-subtle pl-3">
            {section.items?.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative block truncate rounded-input px-2 py-[6px] text-[0.8125rem] leading-none',
                    'transition-colors duration-150',
                    active
                      ? 'bg-surface-hover font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-surface-hover/70 hover:text-foreground',
                  )}
                >
                  {active ? (
                    <span
                      className="absolute -left-[13px] top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-primary"
                      aria-hidden
                    />
                  ) : null}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */

function SearchRow({ onClick }: { onClick: () => void }): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-2.5 rounded-input bg-surface-elevated px-2 py-[7px]',
        'text-[0.8125rem] leading-none text-subtle shadow-hairline',
        'transition-colors duration-150 hover:bg-surface-hover hover:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
      )}
    >
      <Search className="h-4 w-4 shrink-0 opacity-60" />
      <span className="flex-1 text-left">Search</span>
      <Kbd className="transition-colors group-hover:border-border">⌘K</Kbd>
    </button>
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
  const [collapsed, setCollapsed] = useState(false);
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();
  const sections = visibleSections(user);

  // Route changes must never leave the mobile drawer covering the page.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const nav = (onNavigate?: () => void): React.JSX.Element => (
    <nav className="h-full space-y-0.5 overflow-y-auto px-2 pb-4">
      {sections.map((section) => (
        <SidebarSection
          key={section.label}
          section={section}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );

  const sidebarBody = (onNavigate?: () => void): React.JSX.Element => (
    <>
      <div className="space-y-2 px-2 pb-3 pt-3">
        <WorkspaceSwitcher user={user} />
        <SearchRow
          onClick={() => {
            onNavigate?.();
            setPaletteOpen(true);
          }}
        />
      </div>
      <div className="min-h-0 flex-1">{nav(onNavigate)}</div>
    </>
  );

  return (
    <div className="app-canvas min-h-screen bg-background">
      <CommandPalette user={user} open={paletteOpen} onOpenChange={setPaletteOpen} />

      {/* Desktop sidebar --------------------------------------------------- */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border-subtle bg-surface lg:flex',
          'transition-[width] duration-300 ease-out-expo',
          collapsed ? 'w-[68px]' : 'w-[248px]',
        )}
      >
        {collapsed ? (
          <>
            <div className="flex flex-col items-center gap-2 px-2 pb-3 pt-3">
              <Link
                href="/app"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] bg-surface-elevated text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border-strong))]"
              >
                <LogoMark className="h-[17px] w-[17px]" />
              </Link>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setPaletteOpen(true)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-input text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                    aria-label="Search"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Search <Kbd className="ml-1">⌘K</Kbd>
                </TooltipContent>
              </Tooltip>
            </div>
            <nav className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-2 pb-4">
              {sections.map((section) => {
                const href = section.href ?? section.items?.[0]?.href;
                const active =
                  (section.href && pathname === section.href) ||
                  (section.items?.some((item) => pathname.startsWith(item.href)) ?? false);
                if (!href) return null;
                return (
                  <Tooltip key={section.label}>
                    <TooltipTrigger asChild>
                      <Link
                        href={href}
                        className={cn(
                          'inline-flex h-8 w-8 items-center justify-center rounded-input transition-colors duration-150',
                          active
                            ? 'bg-surface-hover text-foreground'
                            : 'text-muted-foreground hover:bg-surface-hover/70 hover:text-foreground',
                        )}
                      >
                        <NavIcon name={section.icon} className="h-4 w-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{section.label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
          </>
        ) : (
          sidebarBody()
        )}

        <div className="border-t border-border-subtle p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setCollapsed((value) => !value)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-input px-2 py-[7px] text-[0.8125rem] leading-none',
                  'text-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-muted-foreground',
                  collapsed && 'justify-center',
                )}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <PanelLeftClose
                  className={cn(
                    'h-4 w-4 shrink-0 transition-transform duration-300',
                    collapsed && 'rotate-180',
                  )}
                />
                {collapsed ? null : <span>Collapse</span>}
              </button>
            </TooltipTrigger>
            {collapsed ? <TooltipContent side="right">Expand sidebar</TooltipContent> : null}
          </Tooltip>
        </div>
      </aside>

      {/* Main column ------------------------------------------------------- */}
      <div
        className={cn(
          'transition-[padding] duration-300 ease-out-expo',
          collapsed ? 'lg:pl-[68px]' : 'lg:pl-[248px]',
        )}
      >
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border-subtle glass px-3 sm:px-5">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-input text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>

          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex items-center gap-1 text-[0.8125rem]">
              {breadcrumbFor(sections, pathname).map((crumb, index, all) => (
                <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
                  {index > 0 ? (
                    <ChevronRight className="h-3 w-3 shrink-0 text-subtle" aria-hidden />
                  ) : null}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="truncate rounded-control px-1 py-0.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={cn(
                        'truncate px-1 py-0.5',
                        index === all.length - 1 ? 'font-medium text-foreground' : 'text-subtle',
                      )}
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex-1" />

          <div className="hidden items-center gap-2 rounded-control bg-surface-elevated px-2.5 py-1.5 text-[0.6875rem] text-muted-foreground shadow-hairline sm:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-45" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            <Activity className="h-3 w-3 text-brand" />
            Control network online
          </div>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-input text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground lg:hidden"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
          <NotificationBell inboxHref="/app/notifications" />
          <UserMenu user={user} />
        </header>

        <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-5 lg:p-6">
          <PageTransition className="space-y-5">{children}</PageTransition>
        </main>
      </div>

      {/* Mobile drawer ----------------------------------------------------- */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm duration-200 animate-in fade-in-0"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-border-subtle bg-surface duration-300 ease-out-expo animate-in slide-in-from-left">
            <div className="flex items-center justify-between px-3 pt-3">
              <span className="text-[0.8125rem] font-medium">Navigation</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-input text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {sidebarBody(() => setMobileOpen(false))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

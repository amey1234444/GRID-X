'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PARTNER_NAVIGATION, PARTNER_TABS, type AuthUser } from '@gridx/shared';

import { NavIcon } from '@/components/app/nav-icon';
import { UserMenu } from '@/components/app/user-menu';
import { NotificationBell } from '@/components/app/notification-bell';
import { OfflineBanner } from '@/components/partner/offline-banner';
import { ServiceWorkerRegistration } from '@/components/partner/service-worker-registration';
import { Wordmark } from '@/components/brand';
import { PageTransition } from '@/components/motion';
import { PARTNER_STRINGS, type Language, type PartnerStringKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const LABEL_KEYS: Record<string, PartnerStringKey> = {
  Home: 'home',
  Dashboard: 'home',
  Jobs: 'jobs',
  Drawings: 'drawings',
  Material: 'material',
  Inspections: 'inspections',
  Invoices: 'invoices',
  Scorecard: 'scorecard',
  Score: 'scorecard',
  Support: 'support',
};

function label(text: string, language: Language): string {
  const key = LABEL_KEYS[text];
  return key ? PARTNER_STRINGS[key][language] : text;
}

export function PartnerShell({
  user,
  children,
}: {
  user: AuthUser;
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();
  const language: Language = user.language === 'HI' ? 'HI' : 'EN';

  return (
    <div className="flex min-h-screen flex-col bg-background pb-[4.25rem] lg:pb-0">
      <ServiceWorkerRegistration />

      <header className="sticky top-0 z-30 border-b border-border-subtle glass">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4">
          <Wordmark href="/partner" />
          {user.partnerName ? (
            <>
              <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
              <span className="hidden truncate text-[0.8125rem] text-muted-foreground sm:block">
                {user.partnerName}
              </span>
            </>
          ) : null}
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <UserMenu user={user} />
          </div>
        </div>

        {/* Desktop keeps a horizontal rail; mobile uses the bottom tab bar. */}
        <nav className="hidden border-t border-border-subtle lg:block">
          <div className="mx-auto flex w-full max-w-5xl gap-0.5 overflow-x-auto px-4 py-1.5">
            {PARTNER_NAVIGATION.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-input px-2.5 py-1.5 text-[0.8125rem] leading-none',
                    'transition-colors duration-150',
                    active
                      ? 'bg-surface-hover font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-surface-hover/70 hover:text-foreground',
                  )}
                >
                  <NavIcon
                    name={item.icon}
                    className={cn('h-4 w-4', active ? 'opacity-100' : 'opacity-60')}
                  />
                  {label(item.label, language)}
                </Link>
              );
            })}
          </div>
        </nav>

        <OfflineBanner language={language} />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">
        <PageTransition className="space-y-5">{children}</PageTransition>
      </main>

      {/* Field navigation: large touch targets, active state carried by an
          indicator rail above the icon so labels stay legible in sunlight. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border-subtle bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
        aria-label="Primary"
      >
        {PARTNER_TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex min-h-[3.25rem] flex-col items-center justify-center gap-1 px-1 py-2',
                'text-[10px] leading-none transition-colors duration-150',
                active ? 'text-primary' : 'text-muted-foreground active:bg-surface-hover',
              )}
            >
              <span
                className={cn(
                  'absolute inset-x-4 top-0 h-[2px] rounded-b-full bg-primary transition-transform duration-200 ease-out-expo',
                  active ? 'scale-x-100' : 'scale-x-0',
                )}
                aria-hidden
              />
              <NavIcon name={tab.icon} className="h-[18px] w-[18px]" />
              <span className="truncate">{label(tab.label, language)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

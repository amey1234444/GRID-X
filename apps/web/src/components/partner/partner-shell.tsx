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
    <div className="flex min-h-screen flex-col bg-secondary/30 pb-16 lg:pb-0">
      <ServiceWorkerRegistration />
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="flex h-14 items-center gap-3 px-4">
          <Wordmark href="/partner" />
          <span className="hidden truncate text-sm text-muted-foreground sm:block">{user.partnerName ?? user.name}</span>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <UserMenu user={user} />
          </div>
        </div>
        <nav className="hidden gap-1 overflow-x-auto border-t px-4 py-2 lg:flex">
          {PARTNER_NAVIGATION.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <NavIcon name={item.icon} className="h-4 w-4" />
                {label(item.label, language)}
              </Link>
            );
          })}
        </nav>
        <OfflineBanner language={language} />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background lg:hidden">
        {PARTNER_TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <NavIcon name={tab.icon} className="h-5 w-5" />
              {label(tab.label, language)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

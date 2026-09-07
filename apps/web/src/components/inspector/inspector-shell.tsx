'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { INSPECTOR_NAVIGATION, type AuthUser } from '@gridx/shared';
import { ArrowUpRight } from 'lucide-react';

import { NavIcon } from '@/components/app/nav-icon';
import { NotificationBell } from '@/components/app/notification-bell';
import { UserMenu } from '@/components/app/user-menu';
import { Wordmark } from '@/components/brand';
import { PageTransition } from '@/components/motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function InspectorShell({
  user,
  children,
}: {
  user: AuthUser;
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border-subtle glass">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4">
          <Wordmark href="/inspector" />
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Inspector
          </Badge>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell inboxHref="/app/notifications" />
            <UserMenu user={user} />
          </div>
        </div>

        <nav className="border-t border-border-subtle">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-0.5 overflow-x-auto px-4 py-1.5">
            {INSPECTOR_NAVIGATION.map((item) => {
              const active =
                item.href === '/inspector' ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-input px-2.5 py-1.5 text-[0.8125rem] leading-none',
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
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/app"
              className="ml-auto flex shrink-0 items-center gap-1 rounded-input px-2.5 py-1.5 text-[0.8125rem] leading-none text-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              GRID-X Control
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">
        <PageTransition className="space-y-5">{children}</PageTransition>
      </main>
    </div>
  );
}

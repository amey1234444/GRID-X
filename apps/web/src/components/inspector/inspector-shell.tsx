'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { INSPECTOR_NAVIGATION, type AuthUser } from '@gridx/shared';

import { NavIcon } from '@/components/app/nav-icon';
import { NotificationBell } from '@/components/app/notification-bell';
import { UserMenu } from '@/components/app/user-menu';
import { Wordmark } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-toggle';
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
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="flex h-14 items-center gap-3 px-4">
          <Wordmark href="/inspector" />
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Inspector
          </Badge>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell inboxHref="/app/notifications" />
            <ThemeToggle />
            <UserMenu user={user} />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t px-4 py-2">
          {INSPECTOR_NAVIGATION.map((item) => {
            const active =
              item.href === '/inspector' ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <NavIcon name={item.icon} className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/app"
            className="ml-auto shrink-0 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            GRID-X Control
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">{children}</main>
    </div>
  );
}

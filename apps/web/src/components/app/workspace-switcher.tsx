'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import type { AuthUser } from '@gridx/shared';
import { Check, ChevronsUpDown, LogOut, Settings, ShieldCheck, UserRound } from 'lucide-react';

import { logoutAction } from '@/app/actions/auth';
import { LogoMark } from '@/components/brand';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * The sidebar's identity block: which workspace you are in and who you are
 * in it. Doubles as the account menu so the header stays free for
 * page-level actions.
 */
export function WorkspaceSwitcher({
  user,
  workspace = 'GRID-X',
  className,
}: {
  user: AuthUser;
  workspace?: string;
  className?: string;
}): React.JSX.Element {
  const [pending, startTransition] = useTransition();
  const role = user.roleCode.replace(/_/g, ' ').toLowerCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'group flex w-full items-center gap-2.5 rounded-input px-2 py-1.5 text-left',
            'transition-colors duration-150 hover:bg-surface-hover',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
            className,
          )}
        >
          <span
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-surface-elevated text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border-strong))]"
            aria-hidden
          >
            <LogoMark className="h-[15px] w-[15px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.8125rem] font-medium leading-tight">{workspace}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-subtle transition-colors group-hover:text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-subtle">Workspace</DropdownMenuLabel>
        <DropdownMenuItem className="gap-2.5">
          <span
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] bg-surface-elevated text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border-strong))]"
            aria-hidden
          >
            <LogoMark className="h-3 w-3" />
          </span>
          <span className="flex-1 truncate">{workspace}</span>
          <Check className="h-3.5 w-3.5 text-primary" />
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="px-2 py-1.5">
          <p className="truncate text-[0.8125rem] font-medium">{user.name}</p>
          <p className="truncate text-[11px] text-subtle">{user.email ?? user.phone}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] capitalize text-muted-foreground">
            <ShieldCheck className="h-3 w-3 opacity-60" />
            {role}
          </p>
          {user.partnerName ? (
            <p className="mt-0.5 truncate text-[11px] text-subtle">{user.partnerName}</p>
          ) : null}
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserRound /> Account &amp; security
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/admin/settings">
            <Settings /> Workspace settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={pending}
          onSelect={(event) => {
            event.preventDefault();
            startTransition(() => {
              void logoutAction();
            });
          }}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import type { AuthUser } from '@gridx/shared';
import { LogOut, User } from 'lucide-react';

import { logoutAction } from '@/app/actions/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function UserMenu({ user }: { user: AuthUser }): React.JSX.Element {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Account menu"
        >
          <Avatar>
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2 py-1.5">
          <p className="truncate text-[0.8125rem] font-medium text-foreground">{user.name}</p>
          <p className="truncate text-[11px] text-subtle">{user.email ?? user.phone}</p>
          <p className="mt-1 text-[11px] capitalize text-muted-foreground">
            {user.roleCode.replace(/_/g, ' ').toLowerCase()}
          </p>
          {user.partnerName ? (
            <p className="mt-0.5 truncate text-[11px] text-subtle">{user.partnerName}</p>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <User /> Account & security
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

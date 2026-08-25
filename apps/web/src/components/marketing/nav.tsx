'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

import { Wordmark } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const links = [
  { label: 'Platform', href: '/platform' },
  { label: 'Partner network', href: '/partners' },
  { label: 'Security', href: '/security' },
  { label: 'Pricing', href: '/pricing' },
];

export function MarketingNav(): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle glass">
      <div className="container flex h-16 items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Wordmark />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:bg-surface-hover hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" asChild>
            <Link href="/partner/login">Partner sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/login">Sign in to GRID-X</Link>
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      <div className={cn('border-t md:hidden', open ? 'block' : 'hidden')}>
        <div className="container flex flex-col gap-1 py-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-3 flex flex-col gap-2">
            <Button variant="outline" asChild>
              <Link href="/partner/login">Partner sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Sign in to GRID-X</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

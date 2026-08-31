'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Menu, X } from 'lucide-react';

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
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-background/88 backdrop-blur-2xl">
      <div className="container flex h-[72px] items-center justify-between gap-6">
        <div className="flex items-center gap-10">
          <Wordmark />
          <nav className="hidden h-[72px] items-center gap-7 lg:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group relative flex h-full items-center text-[0.8125rem] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                {link.label}
                <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-brand transition-transform duration-200 group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <div className="mr-2 hidden items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-subtle xl:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_hsl(var(--success))]" />
            Network operational
          </div>
          <Button variant="ghost" asChild>
            <Link href="/partner/login">Partner sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/login">
              Open GRID-X <ArrowUpRight />
            </Link>
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-input border border-border bg-surface text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className={cn('border-t border-border-subtle md:hidden', open ? 'block' : 'hidden')}>
        <div className="container flex flex-col gap-1 py-5">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="border-b border-border-subtle px-1 py-3 text-[0.875rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
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
              <Link href="/login">Open GRID-X</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

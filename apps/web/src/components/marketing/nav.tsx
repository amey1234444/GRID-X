'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  CircleGauge,
  Factory,
  FileStack,
  Menu,
  Network,
  ScanLine,
  ShieldCheck,
  X,
} from 'lucide-react';

import { Wordmark } from '@/components/brand';
import { cn } from '@/lib/utils';

const links = [
  { label: 'Partners', href: '/partners' },
  { label: 'Security', href: '/security' },
  { label: 'Pricing', href: '/pricing' },
];

const productGroups = [
  {
    title: 'Control the work',
    links: [
      {
        icon: CircleGauge,
        label: 'Plan and allocate',
        detail: 'Match jobs to capability and live capacity.',
        href: '/platform#allocation',
      },
      {
        icon: FileStack,
        label: 'Engineering control',
        detail: 'Release the right drawing revision every time.',
        href: '/platform#drawings',
      },
    ],
  },
  {
    title: 'Verify the outcome',
    links: [
      {
        icon: ScanLine,
        label: 'Quality and evidence',
        detail: 'Inspect dimensions, photos and accepted quantity.',
        href: '/platform#quality',
      },
      {
        icon: ShieldCheck,
        label: 'Audit and payment',
        detail: 'Reconcile material before finance releases payment.',
        href: '/platform#payments',
      },
    ],
  },
];

export function MarketingNav(): React.JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 border-b border-border-subtle bg-background/82 backdrop-blur-2xl"
      onMouseLeave={() => setProductOpen(false)}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/55 to-transparent" />
      <div className="container flex h-[72px] items-center justify-between gap-8">
        <Wordmark compact />

        <nav className="hidden h-full items-center gap-1 lg:flex" aria-label="Primary navigation">
          <button
            type="button"
            className={cn(
              'inline-flex h-10 items-center gap-1 rounded-full px-4 text-[0.8125rem] font-medium transition-colors',
              productOpen
                ? 'bg-surface-hover text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onMouseEnter={() => setProductOpen(true)}
            onClick={() => setProductOpen((value) => !value)}
            aria-expanded={productOpen}
          >
            Product
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', productOpen && 'rotate-180')}
            />
          </button>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex h-10 items-center rounded-full px-4 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/partner/login"
            className="rounded-full px-4 py-2 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Partner log in
          </Link>
          <span className="mx-1 h-5 w-px bg-border" />
          <Link
            href="/login"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-[0.8125rem] font-semibold text-primary-foreground shadow-[0_1px_0_rgb(255_255_255/0.45)_inset,0_8px_24px_-14px_rgb(255_255_255/0.5)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Open GRID-X <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground md:hidden"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          'absolute left-1/2 top-[64px] hidden w-[min(1060px,calc(100%-3rem))] -translate-x-1/2 pt-3 lg:block',
          productOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
          'transition-all duration-200 ease-out-expo',
        )}
      >
        <div className="overflow-hidden rounded-[18px] border border-border-strong bg-[#101010]/95 p-2 shadow-popover backdrop-blur-2xl">
          <div className="grid gap-px overflow-hidden rounded-xl border border-border-subtle bg-border-subtle md:grid-cols-[1fr_1fr_0.72fr]">
            {productGroups.map((group) => (
              <div key={group.title} className="bg-[#121212] p-5">
                <p className="mb-2 px-2 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-subtle">
                  {group.title}
                </p>
                {group.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="group flex gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.04]"
                    onClick={() => setProductOpen(false)}
                  >
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-brand/20 bg-brand/10 text-brand">
                      <link.icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-[0.8125rem] font-semibold text-foreground">
                        {link.label}
                      </span>
                      <span className="mt-1 block text-[0.75rem] leading-5 text-subtle">
                        {link.detail}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ))}
            <div className="relative overflow-hidden bg-[#121212] p-6">
              <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-brand/20 blur-3xl" />
              <Network className="relative h-6 w-6 text-signal" />
              <p className="relative mt-5 text-lg font-semibold tracking-[-0.03em]">
                One live manufacturing network.
              </p>
              <p className="relative mt-2 text-[0.8125rem] leading-5 text-muted-foreground">
                See how jobs, drawings, material, quality and payments stay connected.
              </p>
              <Link
                href="/platform"
                className="relative mt-6 inline-flex items-center gap-2 text-[0.75rem] font-semibold text-brand hover:text-foreground"
                onClick={() => setProductOpen(false)}
              >
                Explore platform <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn('border-t border-border-subtle md:hidden', mobileOpen ? 'block' : 'hidden')}
      >
        <div className="container grid gap-1 py-5">
          <Link
            href="/platform"
            className="flex items-center gap-3 border-b border-border-subtle py-3 text-[0.875rem] font-medium"
            onClick={() => setMobileOpen(false)}
          >
            <Factory className="h-4 w-4 text-brand" /> Product
          </Link>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="border-b border-border-subtle py-3 text-[0.875rem] font-medium text-muted-foreground"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-4 grid gap-2">
            <Link
              href="/partner/login"
              className="rounded-full border border-border px-5 py-3 text-center text-sm font-medium"
            >
              Partner log in
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-foreground px-5 py-3 text-center text-sm font-semibold text-primary-foreground"
            >
              Open GRID-X
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

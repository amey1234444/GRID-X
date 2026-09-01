import Link from 'next/link';
import { ArrowUpRight, Factory, RadioTower, ShieldCheck } from 'lucide-react';

import { Wordmark } from '@/components/brand';

const columns = [
  {
    title: 'Platform',
    links: [
      { label: 'Job allocation', href: '/platform#allocation' },
      { label: 'Drawing control', href: '/platform#drawings' },
      { label: 'Material traceability', href: '/platform#material' },
      { label: 'Quality & rejection', href: '/platform#quality' },
      { label: 'Payments', href: '/platform#payments' },
    ],
  },
  {
    title: 'Network',
    links: [
      { label: 'For partners', href: '/partners' },
      { label: 'Partner app', href: '/partner/login' },
      { label: 'Onboarding', href: '/partners#onboarding' },
      { label: 'Scorecards', href: '/partners#scorecards' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Security', href: '/security' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Sign in', href: '/login' },
    ],
  },
];

export function MarketingFooter(): React.JSX.Element {
  return (
    <footer className="relative overflow-hidden border-t border-border-subtle bg-[#08090b]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/45 to-transparent" />
      <div className="container relative grid gap-12 py-20 lg:grid-cols-[1.5fr_repeat(3,1fr)] lg:py-28">
        <div className="space-y-6">
          <Wordmark />
          <p className="max-w-sm text-[0.875rem] leading-6 text-muted-foreground">
            The operating system for OSWAR&apos;s distributed manufacturing network — one controlled
            flow from job issue to verified payment.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-[0.8125rem] font-medium text-brand transition-colors hover:text-foreground"
          >
            Enter the command center <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {columns.map((column) => (
          <div key={column.title} className="space-y-3">
            <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-subtle">
              {column.title}
            </p>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="relative border-t border-border-subtle">
        <div className="container grid gap-4 py-6 text-xs text-muted-foreground md:grid-cols-[1fr_auto] md:items-center">
          <p>© {new Date().getFullYear()} OSWAR Rotocorp. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[0.625rem] uppercase tracking-[0.08em]">
            <span className="inline-flex items-center gap-1.5">
              <RadioTower className="h-3 w-3 text-success" /> Live network
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-info" /> Audit ready
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Factory className="h-3 w-3 text-warning" /> Built for industry
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

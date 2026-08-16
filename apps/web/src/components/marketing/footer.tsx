import Link from 'next/link';

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
    <footer className="border-t bg-secondary/40">
      <div className="container grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Wordmark />
          <p className="max-w-xs text-sm text-muted-foreground">
            The operating system for OSWAR&apos;s distributed manufacturing network — one controlled
            flow from job issue to verified payment.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {column.title}
            </p>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="container flex flex-col items-center justify-between gap-2 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} OSWAR Rotocorp. All rights reserved.</p>
          <p>Built for controlled, auditable outsourced manufacturing.</p>
        </div>
      </div>
    </footer>
  );
}

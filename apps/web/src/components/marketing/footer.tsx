import Link from 'next/link';

import { LogoMark } from '@/components/brand';

/**
 * The marketing footer.
 *
 * Laid out as a directory rather than a marketing block: the mark sits alone on the left and the
 * link columns run flush across the rest of the width, so the whole site map is legible at a
 * glance. Links are muted and only lift to full contrast on hover — at this density, colour would
 * turn the footer into noise.
 */

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Overview', href: '/platform' },
      { label: 'Allocation', href: '/platform#allocation' },
      { label: 'Drawings', href: '/platform#drawings' },
      { label: 'Material', href: '/platform#material' },
      { label: 'Quality', href: '/platform#quality' },
      { label: 'Payments', href: '/platform#payments' },
    ],
  },
  {
    title: 'Network',
    links: [
      { label: 'For partners', href: '/partners' },
      { label: 'Onboarding', href: '/partners#onboarding' },
      { label: 'Scorecards', href: '/partners#scorecards' },
      { label: 'Partner app', href: '/partner/login' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Security', href: '/security' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Reporting', href: '/platform#insight' },
    ],
  },
  {
    title: 'Access',
    links: [
      { label: 'Sign in', href: '/login' },
      { label: 'Partner log in', href: '/partner/login' },
      { label: 'Reset password', href: '/forgot-password' },
    ],
  },
];

const legal = [
  { label: 'Security', href: '/security' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Partners', href: '/partners' },
];

export function MarketingFooter(): React.JSX.Element {
  return (
    <footer className="border-t border-border-subtle bg-[#080808]">
      <div className="container grid gap-12 py-20 lg:grid-cols-[0.9fr_repeat(4,1fr)] lg:gap-8 lg:py-24">
        <div className="flex flex-col gap-6">
          <Link href="/" aria-label="GRID-X home" className="inline-flex">
            <LogoMark className="h-7 w-7" />
          </Link>
          <p className="max-w-[16rem] text-[0.8125rem] leading-6 text-muted-foreground lg:hidden">
            One controlled flow from job issue to verified payment.
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title} className="flex flex-col gap-4">
            <p className="text-[0.8125rem] font-medium text-foreground">{column.title}</p>
            <ul className="flex flex-col gap-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[0.8125rem] leading-none text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="container flex flex-col gap-4 pb-14 pt-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {legal.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[0.8125rem] text-subtle transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <p className="text-[0.8125rem] text-subtle">
          © {new Date().getFullYear()} OSWAR Rotocorp
        </p>
      </div>
    </footer>
  );
}

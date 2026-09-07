'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { Wordmark } from '@/components/brand';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const links = [
  { label: 'Product', href: '/platform' },
  { label: 'Solutions', href: '/solutions' },
  { label: 'Partners', href: '/partners' },
  { label: 'Rollout', href: '/pricing' },
];
const resources = [
  { label: 'Guides', href: '/resources', detail: 'Practical ways to run a connected network.' },
  {
    label: 'Integrations',
    href: '/integrations',
    detail: 'IMS, imports and reporting boundaries.',
  },
  { label: 'Security', href: '/security', detail: 'Protect access, decisions and records.' },
];

export function MarketingNav(): React.JSX.Element {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setMobileOpen(false);
    setResourcesOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        toggle.current?.focus();
      }
    };
    const onResize = (): void => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [mobileOpen]);
  return (
    <header className="m-nav">
      <div className="m-container m-nav-inner">
        <Wordmark compact />
        <nav className="m-nav-links" aria-label="Primary navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
          <DropdownMenu open={resourcesOpen} onOpenChange={setResourcesOpen}>
            <DropdownMenuTrigger asChild>
              <button type="button">
                Resources
                <ChevronDown size={14} aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="m-nav-menu">
              {resources.map((link) => (
                <DropdownMenuItem asChild key={link.href}>
                  <Link href={link.href} onClick={() => setResourcesOpen(false)}>
                    {link.label}
                    <small>{link.detail}</small>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
        <div className="m-nav-actions">
          <Link href="/partner/login">Partner log in</Link>
          <Link className="m-button" href="/login">
            Open GRID-X
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <button
          ref={toggle}
          className="m-menu-trigger"
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileOpen}
          aria-controls="marketing-mobile-nav"
        >
          {mobileOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
      {mobileOpen && (
        <nav id="marketing-mobile-nav" className="m-mobile-menu" aria-label="Mobile navigation">
          <div className="m-container">
            {[...links, ...resources].map((link) => (
              <Link
                href={link.href}
                key={link.href}
                aria-current={pathname === link.href ? 'page' : undefined}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            ))}
            <div className="m-actions">
              <Link className="m-button" href="/login" onClick={() => setMobileOpen(false)}>
                Open GRID-X
              </Link>
              <Link
                className="m-text-link"
                href="/partner/login"
                onClick={() => setMobileOpen(false)}
              >
                Partner log in
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Inter, Inter_Tight } from 'next/font/google';
import { Toaster } from 'sonner';

import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

/**
 * Headlines run on Inter Tight rather than Inter.
 *
 * At display sizes Inter's generous sidebearings leave the big statements looking loose no matter
 * how far the tracking is pulled in. Inter Tight is drawn for exactly this — narrower sidebearings,
 * the same skeleton — so headings set tight without the letterforms starting to collide, and body
 * copy keeps the wider, more readable Inter.
 */
const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'GRID-X — the operating system for distributed manufacturing',
    template: '%s · GRID-X',
  },
  description:
    'GRID-X connects OSWAR with its MSME manufacturing partners: controlled drawings, allocated jobs, tracked material, verified quality and audited payments in one system.',
  manifest: '/manifest.webmanifest',
  applicationName: 'GRID-X',
  openGraph: {
    title: 'GRID-X — the operating system for distributed manufacturing',
    description:
      'Issue jobs, control drawings, track material, verify quality and approve payments across your entire partner network.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#090909',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${interTight.variable} ${ibmPlexMono.variable} font-sans`}>
        <ThemeProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <Toaster position="top-right" theme="dark" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}

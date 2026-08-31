import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Manrope, Space_Grotesk } from 'next/font/google';
import { Toaster } from 'sonner';

import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

import './globals.css';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const spaceGrotesk = Space_Grotesk({
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
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable} font-sans`}
      >
        <ThemeProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <Toaster position="top-right" theme="dark" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}

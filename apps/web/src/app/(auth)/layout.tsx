import Link from 'next/link';
import { ArrowLeft, Quote } from 'lucide-react';

import { Wordmark } from '@/components/brand';

export default function AuthLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Wordmark />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to site
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Protected by role-based access control, session expiry and full audit logging.
        </p>
      </div>

      <div className="relative hidden overflow-hidden border-l bg-secondary/40 lg:block">
        <div className="pointer-events-none absolute inset-0 grid-pattern opacity-70" aria-hidden />
        <div
          className="pointer-events-none absolute -right-32 top-1/3 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <div className="relative flex h-full flex-col justify-center gap-10 px-16">
          <Quote className="h-8 w-8 text-primary" />
          <p className="text-balance text-2xl font-medium leading-relaxed">
            &ldquo;One job, one revision, one recorded decision. GRID-X replaced the phone calls,
            WhatsApp photos and follow-up spreadsheets with a single controlled flow.&rdquo;
          </p>
          <div className="space-y-1">
            <p className="font-medium">GRID-X Control</p>
            <p className="text-sm text-muted-foreground">
              Job issue → material issued → production → first article → quality accepted → material
              reconciled → payment approved
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-6 border-t pt-8">
            {[
              { value: '20', label: 'Modules' },
              { value: '13', label: 'Roles' },
              { value: '17', label: 'Standard reports' },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="text-2xl font-semibold tracking-tight">{stat.value}</dt>
                <dd className="text-sm text-muted-foreground">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

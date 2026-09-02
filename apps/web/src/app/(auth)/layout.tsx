import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Check, Quote } from 'lucide-react';

import { Wordmark } from '@/components/brand';
import { Reveal } from '@/components/motion';

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
          <Reveal className="w-full max-w-sm" y={12}>
            {children}
          </Reveal>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Protected by role-based access control, session expiry and full audit logging.
        </p>
      </div>

      <div className="auth-proof-panel relative hidden overflow-hidden border-l border-border-subtle lg:block">
        <Image
          src="/media/gridx-network-case-study.webp"
          alt=""
          fill
          sizes="50vw"
          className="auth-proof-media object-cover"
          aria-hidden
        />
        <div className="absolute inset-0 grid-pattern opacity-35" aria-hidden />
        <div className="auth-proof-scrim absolute inset-0" aria-hidden />

        <div className="relative flex min-h-screen flex-col justify-between gap-10 px-10 py-10 xl:px-16 xl:py-14">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[0.5625rem] uppercase tracking-[0.13em] text-white/38">
              Controlled record / live
            </span>
            <span className="flex items-center gap-2 rounded-full border border-success/15 bg-success/[0.04] px-3 py-1.5 font-mono text-[0.5rem] uppercase tracking-[0.09em] text-success">
              <Check className="h-3 w-3" /> Evidence intact
            </span>
          </div>

          <div className="max-w-[700px]">
            <Quote className="h-7 w-7 text-white/24" />
            <p className="mt-8 text-balance font-display text-[clamp(1.75rem,2.5vw,2.7rem)] font-medium leading-[1.14] tracking-[-0.04em]">
              One job, one revision, one recorded decision. The calls, loose photos and follow-up
              spreadsheets become one controlled flow.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <span className="h-px w-10 bg-signal" />
              <div>
                <p className="text-sm font-medium">GRID-X Control</p>
                <p className="mt-1 text-xs text-white/36">One record from allocation to payment</p>
              </div>
            </div>
          </div>

          <div>
            <div className="auth-flow-rail grid grid-cols-7 gap-1" aria-label="Controlled job flow">
              {['Issue', 'Material', 'Produce', 'Article', 'Quality', 'Reconcile', 'Pay'].map(
                (step, index) => (
                  <div key={step} className="relative pt-5">
                    <span
                      className={
                        index === 6
                          ? 'absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-signal'
                          : 'absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-white/45'
                      }
                    />
                    <span className="block font-mono text-[0.45rem] uppercase tracking-[0.06em] text-white/28">
                      0{index + 1}
                    </span>
                    <span className="mt-1 block truncate text-[0.5625rem] text-white/48">
                      {step}
                    </span>
                  </div>
                ),
              )}
            </div>

            <dl className="mt-8 grid grid-cols-3 gap-2">
              {[
                { value: '20', label: 'Operational modules' },
                { value: '13', label: 'Controlled roles' },
                { value: '17', label: 'Standard reports' },
              ].map((stat, index) => (
                <div
                  key={stat.label}
                  className="rounded-[14px] border border-white/[0.08] bg-black/30 p-4 backdrop-blur-md xl:p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <dt className="max-w-[8rem] text-[0.625rem] leading-4 text-white/36">
                      {stat.label}
                    </dt>
                    <span className="font-mono text-[0.45rem] text-white/18">0{index + 1}</span>
                  </div>
                  <dd className="mt-5 text-3xl font-light tracking-[-0.05em]">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

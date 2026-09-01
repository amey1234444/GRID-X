import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Gauge,
  KeyRound,
  Lock,
  ScrollText,
  ServerCog,
  ShieldCheck,
  UserCog,
} from 'lucide-react';

import { AmbientLines } from '@/components/marketing/ambient-lines';
import {
  Eyebrow,
  FeatureBand,
  MetricBand,
  MiniRow,
  MiniSurface,
  Statement,
} from '@/components/marketing/primitives';
import { DisclosureList, type DisclosureItem } from '@/components/marketing/disclosure-list';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion';

export const metadata: Metadata = {
  title: 'Security',
  description:
    'How GRID-X protects drawings, quality decisions and payments: role-based access, controlled drawing grants, an immutable audit trail and throttled credential endpoints.',
};

/**
 * The security page.
 *
 * GRID-X holds three things a manufacturer cannot afford to lose control of — intellectual
 * property in the drawings, the quality record, and the money. This page is organised around those
 * three rather than around a compliance checklist, because a partner unit and a plant head ask
 * about them in exactly that order.
 *
 * Every claim here is one the codebase actually enforces. Nothing aspirational.
 */

const posture = [
  {
    icon: <UserCog />,
    title: 'Guarded at the endpoint',
    detail: 'Permissions are checked by the API, not by hiding a button in the UI.',
  },
  {
    icon: <Lock />,
    title: 'Scoped and expiring',
    detail: 'Drawing access is per job, time-bound and revocable rather than permanent.',
  },
  {
    icon: <ScrollText />,
    title: 'Written down',
    detail: 'Every state change lands in an audit log that nothing in the product can rewrite.',
  },
  {
    icon: <ShieldCheck />,
    title: 'Closed when degraded',
    detail: 'If a control cannot be evaluated, it refuses rather than waving the request through.',
  },
  {
    icon: <Gauge />,
    title: 'Throttled at the door',
    detail: 'Credential endpoints are rate limited per caller, shared across every instance.',
  },
];

const controls = [
  {
    icon: UserCog,
    title: 'Role-based access control',
    lead: 'Thirteen roles, and the API is what enforces them.',
    points: [
      'Thirteen roles from Group Admin to Partner Worker.',
      'Every endpoint is permission-guarded, not screen-hidden.',
      'Partner users only ever see their own unit’s data.',
      'Multi-company access is granted per plant, not inherited.',
    ],
  },
  {
    icon: KeyRound,
    title: 'Authentication',
    lead: 'Credentials are hashed properly and sessions are short-lived.',
    points: [
      'Argon2id password hashing.',
      'Short-lived access tokens with rotating refresh tokens.',
      'OTP sign-in for partner phones and 2FA for senior roles.',
      'Sign-in, OTP and reset endpoints are rate limited per caller.',
    ],
  },
  {
    icon: Lock,
    title: 'Drawing protection',
    lead: 'Your intellectual property leaves under a grant, not a link.',
    points: [
      'Only released revisions are accessible.',
      'Time-bound, job-scoped, revocable access grants.',
      'Watermarked view-only mode and a complete access log.',
      'Superseded revisions lock the moment they are replaced.',
    ],
  },
  {
    icon: ScrollText,
    title: 'Audit trail',
    lead: 'The record of what happened is not editable from inside the product.',
    points: [
      'Immutable audit log of every state change.',
      'Quality and financial records are never silently deleted.',
      'Who did what, when, from which device and IP.',
      'Rate and approval history is kept as revisions, not overwrites.',
    ],
  },
  {
    icon: ServerCog,
    title: 'Infrastructure',
    lead: 'Backups that have actually been restored from.',
    points: [
      'PostgreSQL with daily backups and a tested restore path.',
      'Object storage with versioning and signed, expiring URLs.',
      'Structured logs and error monitoring in production.',
      'Shared rate-limit counters, so scaling out never widens a limit.',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Data boundaries',
    lead: 'Each system stays the owner of what it is responsible for.',
    points: [
      'Multi-company and multi-plant separation.',
      'IMS remains the owner of internal inventory and manufacturing.',
      'GRID-X owns the external distributed manufacturing record.',
      'Partner data never crosses between partner units.',
    ],
  },
];

const assurances = [
  { value: '13', label: 'Roles, each with an explicit permission set' },
  { value: '3 tiers', label: 'Rate limits — sign-in, sign-up and ordinary traffic' },
  { value: 'Argon2id', label: 'Password hashing, with rotating refresh tokens' },
  { value: 'Every write', label: 'Recorded to an immutable audit trail' },
];

/** The questions a plant head or an auditor asks second, indexed rather than buried in prose. */
const questions: DisclosureItem[] = [
  {
    title: 'Who can see a drawing?',
    detail:
      'Only a partner holding a live, job-scoped grant for a released revision. The grant carries an expiry, can be revoked at any time, and every open is written to the access log with the person, device and time.',
  },
  {
    title: 'What happens when a revision changes?',
    detail:
      'The superseded revision locks immediately. A partner who had access to it can no longer open it, and jobs still pointing at it are flagged rather than allowed to continue quietly.',
  },
  {
    title: 'Can an audit record be edited?',
    detail:
      'No. The audit log is append-only from the product’s point of view — there is no screen, action or admin route that rewrites or deletes an entry.',
  },
  {
    title: 'Can one partner see another?',
    detail:
      'No. Partner users are scoped to their own unit at the API, so a partner request for another unit’s job, drawing, material or invoice is refused rather than filtered in the UI.',
  },
  {
    title: 'How are passwords stored?',
    detail:
      'Argon2id, with per-user salts. Sessions use short-lived access tokens and rotating refresh tokens, so a stolen token has a small window and a reused one is detectable.',
  },
  {
    title: 'What stops credential stuffing?',
    detail:
      'Sign-in, OTP and reset endpoints are rate limited per caller in a window shared across every API instance. The counter mixes the submitted identifier into the key, so spoofing a forwarding header does not hand an attacker a fresh allowance.',
  },
  {
    title: 'What happens if a control cannot be evaluated?',
    detail:
      'It refuses. If the shared rate-limit counter is unreachable the guard falls back to a local window rather than opening, and a settings read that fails uses the shipped default rather than skipping the rule.',
  },
  {
    title: 'Where does IMS end and GRID-X begin?',
    detail:
      'IMS stays the owner of internal inventory and in-house manufacturing. GRID-X owns the external distributed manufacturing record and pulls work orders across — neither system silently writes the other’s data.',
  },
];

export default function SecurityPage(): React.JSX.Element {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border-subtle bg-[#080808] py-24 sm:py-32">
        <AmbientLines variant="routes" className="opacity-30" />
        <div className="container relative">
          <Reveal className="max-w-4xl">
            <Eyebrow>Security</Eyebrow>
            <Statement
              as="h1"
              className="mt-7"
              lead="Drawings, quality and money."
              trail="Three things you cannot afford to lose control of — each protected by design rather than by convention."
            />
            <p className="mt-8 max-w-2xl text-[1.0625rem] leading-relaxed text-muted-foreground">
              Distributed manufacturing means your intellectual property leaves the building. GRID-X
              is built on the assumption that access has to be granted narrowly, expire on its own
              and leave a record behind it.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/platform"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                See the product <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-full border border-border-strong bg-surface px-7 text-sm font-semibold transition-colors hover:bg-surface-hover"
              >
                Open GRID-X
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <FeatureBand items={posture} />

      <section className="section-graphite border-b border-border-subtle py-24 sm:py-32">
        <div className="container">
          <Reveal className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
            <h2 className="type-hero">The controls</h2>
            <p className="max-w-2xl text-[clamp(1.25rem,2.2vw,1.75rem)] leading-[1.4] tracking-[-0.03em] text-muted-foreground">
              What is actually enforced, stated plainly enough that you can hold us to it.
            </p>
          </Reveal>

          <StaggerGroup className="mt-20 grid gap-px overflow-hidden rounded-[18px] border border-border-strong bg-border-subtle md:grid-cols-2 lg:grid-cols-3">
            {controls.map((control) => (
              <StaggerItem key={control.title} className="h-full">
                <article className="flex h-full flex-col bg-[#0d0d0d] p-7">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand/25 bg-brand/10 text-brand">
                    <control.icon className="h-4 w-4" />
                  </span>
                  <h3 className="mt-8 font-display text-lg font-medium leading-snug tracking-[-0.03em]">
                    {control.title}
                  </h3>
                  <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-foreground">
                    {control.lead}
                  </p>
                  <ul className="mt-5 space-y-2.5 border-t border-border-subtle pt-5">
                    {control.points.map((point) => (
                      <li
                        key={point}
                        className="flex gap-2.5 text-[0.8125rem] leading-relaxed text-muted-foreground"
                      >
                        <span
                          className="mt-[0.5rem] h-1 w-1 shrink-0 rounded-full bg-subtle-foreground"
                          aria-hidden
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <section className="border-b border-border-subtle bg-[#080808] py-24 sm:py-32">
        <div className="container">
          <Reveal className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-20">
            <div>
              <Eyebrow>Access, in practice</Eyebrow>
              <Statement
                className="mt-7"
                lead="A grant, not a link."
                trail="Every open is attributable to a person, a job and a moment."
              />
              <p className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-muted-foreground">
                A drawing shared as a file is gone the moment it lands. A drawing shared through
                GRID-X is scoped to one job, expires on a date, watermarks itself with who is
                looking, and locks the instant the revision is superseded — and the access log shows
                every one of those events afterwards.
              </p>
            </div>
            <MiniSurface title="Access log / DRG-4471" className="self-start">
              <MiniRow label="Granted — JOB-2291" meta="14 days" tone="success" />
              <MiniRow label="Viewed · Precision Auto" meta="09:41" />
              <MiniRow label="Acknowledged" meta="09:44" tone="success" />
              <MiniRow label="Rev B superseded" meta="locked" tone="warning" />
              <MiniRow label="Grant expires" meta="28 Sep" />
            </MiniSurface>
          </Reveal>

          <Reveal className="mt-20">
            <MetricBand items={assurances} />
          </Reveal>
        </div>
      </section>

      <section className="section-grid border-b border-border-subtle py-24 sm:py-32">
        <div className="container">
          <Reveal className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <Eyebrow>Throttling</Eyebrow>
              <Statement
                className="mt-7"
                lead="Sign-in is tight. Real work is not."
                trail="Three tiers, each tunable without a redeploy."
              />
            </div>
            <div>
              <p className="max-w-xl text-[0.9375rem] leading-relaxed text-muted-foreground">
                Credential endpoints are the ones an attacker iterates, so they get a small
                allowance per caller, counted in a window shared across every API instance — running
                more instances never widens the limit. Ordinary authenticated traffic gets a far
                larger ceiling, because throttling real work only costs the shift floor time. If the
                shared counter cannot be reached, the limit degrades to a local one rather than
                opening.
              </p>
              <div className="mt-8 grid gap-px overflow-hidden rounded-card border border-border-strong bg-border-subtle sm:grid-cols-3">
                {[
                  { tier: 'Sign-in', detail: 'Credential checks — deliberately small.' },
                  { tier: 'Sign-up', detail: 'Anything that sends a message outward.' },
                  { tier: 'Ordinary', detail: 'Everyday authenticated traffic.' },
                ].map((item) => (
                  <div key={item.tier} className="bg-[#0d0d0d] p-5">
                    <p className="type-label">{item.tier}</p>
                    <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-b border-border-subtle bg-[#080808] py-24 sm:py-32">
        <div className="container">
          <Reveal>
            <DisclosureList label="Common questions" items={questions} />
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#080808] py-28 sm:py-36">
        <AmbientLines variant="routes" className="opacity-30" />
        <div className="container relative text-center">
          <Reveal className="mx-auto max-w-4xl">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-signal">
              Controlled by design
            </p>
            <h2 className="mt-8 text-balance font-display text-[clamp(2.5rem,6vw,5rem)] font-medium leading-[0.96] tracking-[-0.06em]">
              Let the work out without losing the record.
            </h2>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Open GRID-X <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/partners"
                className="inline-flex h-12 items-center justify-center rounded-full border border-border-strong bg-surface px-7 text-sm font-semibold transition-colors hover:bg-surface-hover"
              >
                For partner units
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

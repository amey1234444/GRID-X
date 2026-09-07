import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  FileCheck2,
  LockKeyhole,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { MotionLines } from './motion-lines';
import { MarketingImage, type ImageKind } from './imagery';

export function SectionHeading({
  label,
  title,
  description,
  href,
  linkLabel = 'Explore',
}: {
  label: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}): React.JSX.Element {
  return (
    <div className="m-section-heading">
      <div>
        <p className="m-eyebrow">{label}</p>
        <h2>{title}</h2>
      </div>
      {(description || href) && (
        <div className="m-section-intro">
          {description && <p>{description}</p>}
          {href && <TextLink href={href}>{linkLabel}</TextLink>}
        </div>
      )}
    </div>
  );
}

export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <Link className="m-text-link" href={href}>
      {children}
      <ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}

export function PageHero({
  label,
  title,
  accent,
  description,
  primary,
  secondary,
  children,
  centered = false,
}: {
  label: string;
  title: string;
  accent?: string;
  description: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
  children?: ReactNode;
  centered?: boolean;
}): React.JSX.Element {
  return (
    <section className={`m-hero${centered ? ' m-hero-centered' : ''}`}>
      <MotionLines />
      <div className="m-container">
        <div className={children ? 'm-hero-grid' : 'm-hero-copy'}>
          <div>
            <p className="m-eyebrow">{label}</p>
            <h1>
              {title}
              {accent && <span>{accent}</span>}
            </h1>
            <p className="m-hero-description">{description}</p>
            {(primary || secondary) && (
              <div className="m-actions">
                {primary && (
                  <Link href={primary.href} className="m-button">
                    {primary.label}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                )}
                {secondary && (
                  <Link href={secondary.href} className="m-button m-button-secondary">
                    {secondary.label}
                  </Link>
                )}
              </div>
            )}
          </div>
          {children && <div className="m-hero-visual">{children}</div>}
        </div>
      </div>
    </section>
  );
}

export function ClosingCTA({
  label = 'One connected operation',
  title = 'Bring the whole network into focus.',
  description = 'Jobs, drawings, material, quality and payments. One record, from start to finish.',
  partner = false,
}: {
  label?: string;
  title?: string;
  description?: string;
  partner?: boolean;
}): React.JSX.Element {
  return (
    <section className="m-closing m-tone-dark">
      <MotionLines />
      <div className="m-container m-closing-inner">
        <div>
          <p className="m-eyebrow">{label}</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="m-actions">
          <Link className="m-button" href={partner ? '/partner/login' : '/login'}>
            {partner ? 'Open the partner app' : 'Open GRID-X'}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <TextLink href={partner ? '/partners#onboarding' : '/platform'}>
            {partner ? 'Explore onboarding' : 'Explore the platform'}
          </TextLink>
        </div>
      </div>
    </section>
  );
}

export function FAQ({
  items,
  title = 'A little more detail.',
}: {
  items: { title: string; detail: string }[];
  title?: string;
}): React.JSX.Element {
  return (
    <section className="m-section">
      <div className="m-container m-faq-layout">
        <div>
          <p className="m-eyebrow">Questions, answered</p>
          <h2>{title}</h2>
        </div>
        <div className="m-faq">
          {items.map((item) => (
            <details key={item.title}>
              <summary>
                {item.title}
                <ChevronDown size={17} aria-hidden="true" />
              </summary>
              <p>{item.detail}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function EvidenceReceipt({ compact = false }: { compact?: boolean }): React.JSX.Element {
  return (
    <figure className={`m-receipt${compact ? ' m-receipt-compact' : ''}`}>
      <figcaption className="m-window-title">
        <span>
          <FileCheck2 size={16} /> Payment readiness
        </span>
        <span className="m-caption">Illustrative record</span>
      </figcaption>
      <div className="m-receipt-top">
        <span className="m-caption">JOB-2291 / INV-1187</span>
        <h3>
          Evidence in.
          <br />
          <span>Payment ready.</span>
        </h3>
      </div>
      <dl className="m-receipt-checks">
        {[
          ['Accepted quantity', '480 pcs'],
          ['Material reconciled', 'Complete'],
          ['Rate verified', 'Current revision'],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>
              <Check size={15} aria-hidden="true" />
              {label}
            </dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="m-receipt-total">
        <span>Next decision</span>
        <strong>
          Finance approval
          <ArrowRight size={15} aria-hidden="true" />
        </strong>
      </div>
    </figure>
  );
}

export function DrawingReceipt(): React.JSX.Element {
  return (
    <figure className="m-receipt">
      <figcaption className="m-window-title">
        <span>
          <LockKeyhole size={16} /> Drawing access
        </span>
        <span className="m-caption">Illustrative record</span>
      </figcaption>
      <div className="m-receipt-top">
        <span className="m-caption">JOB-2291</span>
        <h3>
          One job.
          <br />
          <span>One released revision.</span>
        </h3>
      </div>
      <div className="m-drawing-record">
        <FileCheck2 size={30} strokeWidth={1.2} aria-hidden="true" />
        <div>
          <strong>DRG-4471</strong>
          <span>Rev C · Released</span>
        </div>
        <span className="m-badge">View only</span>
      </div>
      <dl className="m-receipt-checks">
        {[
          ['Access scope', 'Assigned partner'],
          ['Grant duration', '14 days'],
          ['Previous revision', 'Superseded · locked'],
        ].map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="m-receipt-note">Views and acknowledgements stay on the job record.</p>
    </figure>
  );
}

export function LinkCards({
  items,
}: {
  items: { label: string; title: string; detail: string; href: string; image?: ImageKind }[];
}): React.JSX.Element {
  return (
    <div className={`m-link-cards${items.length === 2 ? ' m-link-cards-pair' : ''}`}>
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="m-link-card">
          {item.image && <MarketingImage kind={item.image} />}
          <span className="m-caption">{item.label}</span>
          <h3>{item.title}</h3>
          <p>{item.detail}</p>
          <span className="m-card-action">
            Explore
            <ArrowUpRight size={17} aria-hidden="true" />
          </span>
        </Link>
      ))}
    </div>
  );
}

export function CoverageLedger(): React.JSX.Element {
  return (
    <div className="m-coverage-ledger">
      {[
        ['14', 'Connected modules', 'From partner allocation to commercial approval.'],
        ['3', 'Focused workspaces', 'Control, partner and inspector.'],
        ['7', 'Partner KPIs', 'Performance with the underlying job records.'],
        ['17', 'Standard reports', 'Operational data with CSV export.'],
      ].map(([value, label, detail]) => (
        <div key={label}>
          <strong>{value}</strong>
          <div>
            <h3>{label}</h3>
            <p>{detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

import { MarketingImage } from '@/components/marketing/imagery';
import type { Metadata } from 'next';
import {
  Check,
  ChevronDown,
  FileLock2,
  KeyRound,
  Layers3,
  ScrollText,
  ShieldCheck,
  UserRoundCog,
} from 'lucide-react';
import {
  ClosingCTA,
  FAQ,
  PageHero,
  SectionHeading,
  TextLink,
} from '@/components/marketing/editorial';

export const metadata: Metadata = {
  title: 'Security',
  description:
    'Explore GRID-X access controls, drawing protection, audit records and the boundaries around partner and company data.',
};
const controls = [
  {
    Icon: UserRoundCog,
    title: 'Access follows responsibility.',
    detail: 'Role permissions define the actions a person can take, with enforcement at the API.',
    points: [
      'Explicit permission sets for operational roles',
      'Partner access scoped to its unit',
      'Company and plant access boundaries',
    ],
  },
  {
    Icon: KeyRound,
    title: 'Protect the sign-in path.',
    detail: 'Password hashing, session controls and throttling support account protection.',
    points: [
      'Argon2id password hashing',
      'Access tokens and rotating refresh tokens',
      'Rate limits for credential endpoints',
    ],
  },
  {
    Icon: FileLock2,
    title: 'Keep drawing access specific.',
    detail: 'Released drawings are shared through grants connected to the job and the partner.',
    points: [
      'Job-scoped, expiring and revocable grants',
      'Revision status and superseded access controls',
      'Watermarked viewing and access records',
    ],
  },
  {
    Icon: ScrollText,
    title: 'Keep the history behind a decision.',
    detail:
      'Audit records connect state changes with the actor and time. Revisions preserve the context of rates and approvals.',
    points: [
      'Actor, time and request context on recorded events',
      'Quality and commercial decision history',
      'Audit entries cannot be edited through the product',
    ],
  },
  {
    Icon: ShieldCheck,
    title: 'Apply limits across the operation.',
    detail: 'Shared rate-limit counters support consistent limits across API instances.',
    points: [
      'Separate limits for credential and ordinary traffic',
      'Fallback handling when the shared counter is unavailable',
      'Configurable operational settings',
    ],
  },
  {
    Icon: Layers3,
    title: 'Keep system ownership clear.',
    detail: 'Company, plant and partner boundaries define the scope of the operational record.',
    points: [
      'Partner requests scoped to the assigned unit',
      'Internal inventory remains under IMS ownership',
      'External manufacturing records belong in GRID-X',
    ],
  },
];
export default function SecurityPage(): React.JSX.Element {
  return (
    <>
      <PageHero
        label="Security and control"
        title="Control what is shared."
        accent="Keep the record behind it."
        description="Drawings, quality decisions and payments need clear boundaries. GRID-X connects access, authority and audit history to the work itself."
        primary={{ href: '#controls', label: 'Explore the controls' }}
        secondary={{ href: '/platform', label: 'See the platform' }}
      >
        <MarketingImage
          kind="precision"
          priority
          caption="Care in the details. Control at every handoff."
        />
      </PageHero>
      <section className="m-section" id="controls">
        <div className="m-container">
          <SectionHeading
            label="Built into the workflow"
            title="Specific controls. Clear responsibilities."
            description="Understand how access and operational records are handled across the manufacturing network."
          />
          <div className="m-security-controls">
            {controls.map(({ Icon, title, detail, points }) => (
              <article key={title} className="m-security-control">
                <Icon size={24} strokeWidth={1.4} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{detail}</p>
                <details className="m-disclosure">
                  <summary>
                    Control details <ChevronDown size={16} aria-hidden="true" />
                  </summary>
                  <ul className="m-check-list">
                    {points.map((point) => (
                      <li key={point}>
                        <Check size={15} aria-hidden="true" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </details>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="m-section m-tone-dark">
        <div className="m-container m-split-story">
          <div>
            <p className="m-eyebrow">Access, in practice</p>
            <h2>A history you can follow.</h2>
            <p>
              A drawing view has context: a person, a job and a revision. The access log connects
              that context to a recorded event.
            </p>
            <TextLink href="/resources/drawing-control">Explore drawing control</TextLink>
          </div>
          <figure className="m-module-record">
            <figcaption className="m-caption">ILLUSTRATIVE ACCESS LOG / DRG-4471</figcaption>
            <h4>The record stays attached.</h4>
            {[
              ['09:12', 'Rev C released', 'Engineering', 'Released'],
              ['09:41', 'Drawing opened', 'Assigned partner', 'Viewed'],
              ['09:44', 'Revision acknowledged', 'Partner owner', 'Recorded'],
              ['10:02', 'Rev B superseded', 'Engineering', 'Locked'],
            ].map(([time, event, actor, status]) => (
              <div className="m-audit-line" key={time}>
                <time>{time}</time>
                <div>
                  {event}
                  <small>{actor}</small>
                </div>
                <span className="m-badge">{status}</span>
              </div>
            ))}
          </figure>
        </div>
      </section>
      <FAQ
        title="Know how the boundaries work."
        items={[
          {
            title: 'Who can open a drawing?',
            detail:
              'Drawing access is connected to a released revision and a live grant for the job. The grant is scoped, can expire and can be revoked. Drawing access events are recorded.',
          },
          {
            title: 'Can one partner access another unit’s records?',
            detail:
              'Partner access is scoped to the assigned unit at the API. A partner role does not grant access to another unit’s jobs, drawings, materials or invoices.',
          },
          {
            title: 'Can users rewrite an audit entry?',
            detail:
              'Audit entries are not editable through the product. Operational changes are recorded as events, and revised rates and approvals retain their history.',
          },
          {
            title: 'What does GRID-X own alongside IMS?',
            detail:
              'GRID-X handles the external distributed manufacturing record. IMS remains responsible for internal inventory and in-house manufacturing, with integration configured around that boundary.',
          },
        ]}
      />
      <ClosingCTA
        title="Put control close to the work."
        description="Explore how the modules connect access, evidence and approval throughout the job lifecycle."
      />
    </>
  );
}

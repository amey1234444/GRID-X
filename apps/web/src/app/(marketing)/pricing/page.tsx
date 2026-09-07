import { ChevronDown } from 'lucide-react';
import { MarketingImage } from '@/components/marketing/imagery';
import type { Metadata } from 'next';
import {
  ClosingCTA,
  FAQ,
  PageHero,
  SectionHeading,
  TextLink,
} from '@/components/marketing/editorial';
import { RolloutComparison } from '@/components/marketing/showcases';
import { rolloutQuestions } from '@/components/marketing/content';

export const metadata: Metadata = {
  title: 'Rollout',
  description:
    'Compare GRID-X rollout scope across Pilot, Network and Group stages. Start with one plant and extend the operational flow.',
};
const stages = [
  {
    label: '01 / Pilot',
    title: 'Prove the core flow.',
    description: 'One company, one plant and the first group of partner units.',
    scope: 'Jobs, drawings, material issue, quality and invoice status.',
    gate: 'A job goes out with a released drawing, returns inspected and is invoiced from accepted quantity.',
  },
  {
    label: '02 / Network',
    title: 'Connect the operation.',
    description: 'Extend the controlled flow across the partner network.',
    scope: 'Capacity, reconciliation, logistics, tooling, reporting and IMS.',
    gate: 'Allocation, material reconciliation and payment approvals follow a shared operational record.',
  },
  {
    label: '03 / Group',
    title: 'Bring every plant together.',
    description: 'A common view across OSWAR Rotocorp, Oswal Engineers and the wider group.',
    scope: 'Company separation, group dashboards and audit configuration.',
    gate: 'Group teams read consolidated results while each plant and company retains its data boundaries.',
  },
];

export default function PricingPage(): React.JSX.Element {
  return (
    <>
      <PageHero
        label="A considered rollout"
        title="Start with one plant."
        accent="Grow with the network."
        description="Prove a complete job flow first. Then extend into deeper controls and group visibility, with a clear outcome at every stage."
        primary={{ href: '#scope', label: 'Compare rollout scope' }}
        secondary={{ href: '/platform', label: 'Explore the product' }}
        centered
      />
      <section className="m-section" id="scope">
        <div className="m-container">
          <SectionHeading
            label="Three stages"
            title="The right scope, in the right order."
            description="Start with a working foundation. Add deeper controls as your operation grows."
          />
          <div className="m-rollout-cards">
            {stages.map((stage, i) => (
              <article
                key={stage.label}
                className={`m-rollout-card${i === 1 ? ' m-tone-dark' : ''}`}
              >
                <div className="m-rollout-top">
                  <span className="m-caption">{stage.label}</span>
                  {i === 1 && <span className="m-badge">Full platform</span>}
                </div>
                <div className="m-rollout-progress" aria-label={`Stage ${i + 1} of 3`}>
                  {[0, 1, 2].map((part) => (
                    <span key={part} data-filled={part <= i} />
                  ))}
                </div>
                <h3>{stage.title}</h3>
                <p>{stage.description}</p>
                <div className="m-rollout-scope">
                  Includes<strong>{stage.scope}</strong>
                </div>
                <details className="m-disclosure">
                  <summary>
                    When to move forward <ChevronDown size={16} aria-hidden="true" />
                  </summary>
                  <p>{stage.gate}</p>
                </details>
              </article>
            ))}
          </div>
          <RolloutComparison />
        </div>
      </section>
      <section className="m-section m-tone-soft">
        <div className="m-container m-split-story">
          <div>
            <p className="m-eyebrow">Before the first job</p>
            <h2>Build on a prepared foundation.</h2>
            <p>
              Start with partner profiles, components, released drawings and rate cards. Use
              validated imports where appropriate, and make the ownership of each record clear.
            </p>
            <TextLink href="/resources/partner-onboarding">Read the onboarding guide</TextLink>
            <br />
            <TextLink href="/integrations">Explore imports and integrations</TextLink>
          </div>
          <MarketingImage
            kind="precision"
            caption="A considered start makes the next step clearer."
          />
        </div>
      </section>
      <FAQ items={rolloutQuestions} title="Plan the rollout with clarity." />
      <ClosingCTA
        title="Build from a working first plant."
        description="Explore the modules and decide which operational flow should go live first."
      />
    </>
  );
}

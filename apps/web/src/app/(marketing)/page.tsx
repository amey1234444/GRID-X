import { Check, FileCheck2, Layers3, Network } from 'lucide-react';
import {
  ClosingCTA,
  CoverageLedger,
  EvidenceReceipt,
  LinkCards,
  PageHero,
  SectionHeading,
  TextLink,
} from '@/components/marketing/editorial';
import { ProductFilm } from '@/components/marketing/product-film';
import { RoleExplorer, WorkflowExplorer } from '@/components/marketing/showcases';

export default function MarketingHomePage(): React.JSX.Element {
  return (
    <>
      <PageHero
        label="GRID-X / Distributed manufacturing"
        title="Your manufacturing network."
        accent="Working as one."
        description="Connect every partner, job and decision. From the released drawing to the approved payment, keep the work and its evidence together."
        primary={{ href: '/login', label: 'Open GRID-X' }}
        secondary={{ href: '/platform', label: 'Explore the platform' }}
        centered
      />
      <section className="m-home-workflow">
        <div className="m-container">
          <div className="m-home-intro">
            <h2>From issued job to verified payment.</h2>
            <p>Explore the four decisions that move a job forward.</p>
          </div>
          <WorkflowExplorer />
        </div>
      </section>
      <div className="m-container m-department-line">
        <strong>A shared record across</strong>
        {[
          'Production',
          'Engineering',
          'Quality',
          'Materials',
          'Logistics',
          'Finance',
          'Partners',
        ].map((team) => (
          <span key={team}>{team}</span>
        ))}
      </div>
      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            label="Connected by design"
            title="The whole operation, on the same page."
            description="Give every handoff a clear record. Everyone can see what is released, what has moved and what needs a decision."
          />
          <div className="m-principles">
            <article className="m-principle">
              <div className="m-principle-top">
                <Layers3 size={22} strokeWidth={1.4} aria-hidden="true" />
                <span className="m-caption">01 / Shared control</span>
              </div>
              <h3>One control layer</h3>
              <p>
                Replace scattered calls, sheets and private updates with one operational record.
              </p>
              <div className="m-principle-data">
                <span className="m-badge">Job</span>
                <span className="m-badge">Drawing</span>
                <span className="m-badge">Material</span>
              </div>
            </article>
            <article className="m-principle">
              <div className="m-principle-top">
                <Network size={22} strokeWidth={1.4} aria-hidden="true" />
                <span className="m-caption">02 / Shared context</span>
              </div>
              <h3>Every partner connected</h3>
              <p>
                Plants and partner units work from the same released job, revision and material
                state.
              </p>
              <div className="m-principle-data">
                <span className="m-badge">Control</span>
                <span className="m-badge">Partner</span>
                <span className="m-badge">Inspector</span>
              </div>
            </article>
            <article className="m-principle">
              <div className="m-principle-top">
                <FileCheck2 size={22} strokeWidth={1.4} aria-hidden="true" />
                <span className="m-caption">03 / Recorded evidence</span>
              </div>
              <h3>Evidence moves the work</h3>
              <p>Approvals follow recorded quantity, quality and custody evidence at each gate.</p>
              <div className="m-principle-data">
                <span className="m-badge">
                  <Check size={12} aria-hidden="true" />
                  Verified
                </span>
                <span className="m-badge">Ready for approval</span>
              </div>
            </article>
          </div>
        </div>
      </section>
      <ProductFilm
        id="network-film"
        eyebrow="One continuous record"
        title="Follow the work. Keep the context."
        description="Allocation, engineering, material custody, inspection and payment are connected parts of the same manufacturing operation."
      />
      <section className="m-section">
        <div className="m-container m-split-story">
          <div>
            <p className="m-eyebrow">Evidence before approval</p>
            <h2>Make the next decision clear.</h2>
            <p>
              Bring the accepted quantity, material trail and applicable rate into one view. Finance
              can see what is ready and what still needs attention.
            </p>
            <div className="m-story-points">
              <div>
                <Check />
                See which checks have passed.
              </div>
              <div>
                <Check />
                Trace a deduction to its source.
              </div>
              <div>
                <Check />
                Keep the next approval visible to both teams.
              </div>
            </div>
            <TextLink href="/platform#payments">Explore commercials and payments</TextLink>
          </div>
          <EvidenceReceipt />
        </div>
      </section>
      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            label="Made for the people doing the work"
            title="Three workspaces. One operation."
            description="Each role gets the tools and context it needs, connected to the same job record."
          />
          <RoleExplorer />
        </div>
      </section>
      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            label="Operational coverage"
            title="Depth across the full job lifecycle."
            description="Connected modules support the work between the plant, partner and payment."
          />
          <CoverageLedger />
        </div>
      </section>
      <section className="m-section">
        <div className="m-container">
          <SectionHeading label="Explore GRID-X" title="Find your next step." />
          <LinkCards
            items={[
              {
                label: 'For partner units',
                title: 'Work with a clearer picture.',
                detail: 'See drawings, material, payments and your standing in the network.',
                href: '/partners',
              },
              {
                label: 'Rollout',
                title: 'Start with one plant.',
                detail: 'Prove the core flow before extending it across the network and group.',
                href: '/pricing',
              },
              {
                label: 'Practical guides',
                title: 'Make the record useful.',
                detail: 'Explore drawing control, reconciliation and partner onboarding.',
                href: '/resources',
              },
            ]}
          />
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}

import { FileCheck2, Layers3, Network } from 'lucide-react';
import {
  ClosingCTA,
  CoverageLedger,
  LinkCards,
  PageHero,
  SectionHeading,
} from '@/components/marketing/editorial';
import { MarketingImage } from '@/components/marketing/imagery';
import { ProductFilm } from '@/components/marketing/product-film';
import { RoleExplorer, WorkflowExplorer } from '@/components/marketing/showcases';

export default function MarketingHomePage(): React.JSX.Element {
  return (
    <>
      <PageHero
        label="GRID-X / Distributed manufacturing"
        title="Your manufacturing network."
        accent="Working as one."
        description="Bring every partner, job and decision into focus. One shared record, from released drawing to approved payment."
        primary={{ href: '/login', label: 'Open GRID-X' }}
        secondary={{ href: '/platform', label: 'Explore the platform' }}
      >
        <MarketingImage kind="network" priority caption="The connections behind every component." />
      </PageHero>
      <section className="m-section m-tone-soft">
        <div className="m-container">
          <SectionHeading
            label="From first job to final approval"
            title="See the work move forward."
            description="Four connected decisions. Explore the record behind each one."
          />
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
            </article>
            <article className="m-principle">
              <div className="m-principle-top">
                <FileCheck2 size={22} strokeWidth={1.4} aria-hidden="true" />
                <span className="m-caption">03 / Recorded evidence</span>
              </div>
              <h3>Evidence moves the work</h3>
              <p>Approvals follow recorded quantity, quality and custody evidence at each gate.</p>
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
                image: 'workshop',
              },
              {
                label: 'Rollout',
                title: 'Start with one plant.',
                detail: 'Prove the core flow before extending it across the network and group.',
                href: '/pricing',
                image: 'network',
              },
              {
                label: 'Practical guides',
                title: 'Make the record useful.',
                detail: 'Explore drawing control, reconciliation and partner onboarding.',
                href: '/resources',
                image: 'precision',
              },
            ]}
          />
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}

import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import {
  ClosingCTA,
  EvidenceReceipt,
  LinkCards,
  PageHero,
  SectionHeading,
  TextLink,
} from '@/components/marketing/editorial';
import { RoleExplorer } from '@/components/marketing/showcases';

export const metadata: Metadata = {
  title: 'Solutions',
  description:
    'GRID-X workflows for production, engineering, quality, materials and finance, connected across your manufacturing partners.',
};
const solutions = [
  {
    id: 'production',
    label: '01 / Production and engineering',
    title: 'Release work with the right context.',
    detail:
      'Bring partner eligibility, available capacity and the released drawing together before the job leaves the plant.',
    points: [
      'Match the job to partner capability and capacity',
      'Apply required outsourcing authorisation',
      'Track released revisions and partner acknowledgements',
    ],
    question: 'What is ready to release?',
    rows: [
      ['Partner capability', 'Eligible'],
      ['Drawing revision', 'Released'],
      ['Job acceptance', 'Recorded'],
    ],
    href: '/platform#allocation',
    link: 'Explore allocation and engineering',
  },
  {
    id: 'quality',
    label: '02 / Quality and materials',
    title: 'Keep acceptance connected to evidence.',
    detail:
      'Follow material custody and measured quality from partner receipt to the inspected output.',
    points: [
      'Record received, consumed and returned quantities',
      'Inspect actual values against the plan',
      'Keep rejection, rework and corrective actions traceable',
    ],
    question: 'What is ready to accept?',
    rows: [
      ['Received quantity', 'Acknowledged'],
      ['Inspection results', 'Recorded'],
      ['Rework disposition', 'Visible'],
    ],
    href: '/platform#quality',
    link: 'Explore quality and materials',
  },
  {
    id: 'finance',
    label: '03 / Finance and network management',
    title: 'See the basis for every approval.',
    detail:
      'Tie an invoice to accepted quantity, the applicable rate and the reconciled material record.',
    points: [
      'Follow deductions and incentives to their source',
      'Track invoice status and payment ageing',
      'Review partner performance and group visibility',
    ],
    question: 'What is ready to approve?',
    rows: [
      ['Accepted quantity', 'Verified'],
      ['Material variance', 'Resolved'],
      ['Applicable rate', 'Confirmed'],
    ],
    href: '/platform#payments',
    link: 'Explore commercials and reporting',
  },
];
export default function SolutionsPage(): React.JSX.Element {
  return (
    <>
      <PageHero
        label="Solutions / Across the operation"
        title="Different responsibilities."
        accent="A common picture."
        description="Connect the decisions made by production, engineering, quality, materials and finance to the same partner job."
        primary={{ href: '#workflows', label: 'Explore team workflows' }}
        secondary={{ href: '/platform', label: 'See all modules' }}
      >
        <EvidenceReceipt />
      </PageHero>
      <section className="m-section" id="workflows">
        <div className="m-container">
          <SectionHeading
            label="Built around the decision"
            title="Make every handoff easier to trust."
            description="Start with the question your team needs to answer, then follow the records that support it."
          />
          {solutions.map((solution) => (
            <article key={solution.id} id={solution.id} className="m-module-story">
              <div>
                <p className="m-eyebrow">{solution.label}</p>
                <h3>{solution.title}</h3>
                <p>{solution.detail}</p>
                <ul className="m-check-list">
                  {solution.points.map((point) => (
                    <li key={point}>
                      <Check size={15} aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
                <div className="m-actions">
                  <TextLink href={solution.href}>{solution.link}</TextLink>
                </div>
              </div>
              <figure className="m-module-record">
                <figcaption className="m-caption">WORKFLOW CHECKPOINT</figcaption>
                <h4>{solution.question}</h4>
                {solution.rows.map(([label, value]) => (
                  <div key={label} className="m-data-row">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
                <p className="m-caption" style={{ marginTop: 20 }}>
                  Illustrative decision checklist.
                </p>
              </figure>
            </article>
          ))}
        </div>
      </section>
      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            label="On screen and on the floor"
            title="A focused workspace for each role."
            description="Go from the whole network to an assigned job or an inspection queue, with the same underlying context."
          />
          <RoleExplorer />
        </div>
      </section>
      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            label="Make it work for your network"
            title="Connect the people and the systems."
          />
          <LinkCards
            items={[
              {
                label: 'Partner operations',
                title: 'Bring the partner into the record.',
                detail: 'Explore onboarding, mobile workflows and scorecards.',
                href: '/partners',
              },
              {
                label: 'System integration',
                title: 'Keep ownership clear.',
                detail: 'Understand IMS, data imports and reporting boundaries.',
                href: '/integrations',
              },
              {
                label: 'Rollout',
                title: 'Build on a working flow.',
                detail: 'Compare the scope of Pilot, Network and Group stages.',
                href: '/pricing',
              },
            ]}
          />
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}

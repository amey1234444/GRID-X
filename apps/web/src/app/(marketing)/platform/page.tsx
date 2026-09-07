import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, ChevronDown } from 'lucide-react';
import { capabilities, moduleRows, productModules } from '@/components/marketing/content';
import {
  ClosingCTA,
  CoverageLedger,
  EvidenceReceipt,
  PageHero,
  SectionHeading,
} from '@/components/marketing/editorial';
import { RoleExplorer } from '@/components/marketing/showcases';

export const metadata: Metadata = {
  title: 'Product',
  description:
    'Explore GRID-X: partner allocation, drawing control, material reconciliation, inspection, payments and operational reporting.',
};

export default function PlatformPage(): React.JSX.Element {
  return (
    <>
      <PageHero
        label="The GRID-X platform"
        title="Every handoff."
        accent="One connected record."
        description="Run the external manufacturing lifecycle in one place. Keep allocation, drawings, material, quality and payment connected from the first job to the final approval."
        primary={{ href: '#modules', label: 'Explore the modules' }}
        secondary={{ href: '/solutions', label: 'Find your workflow' }}
      >
        <EvidenceReceipt compact />
      </PageHero>
      <div className="m-container">
        <nav className="m-module-nav" aria-label="Product modules">
          {productModules.map((module) => (
            <Link key={module.id} href={`#${module.id}`}>
              {
                (
                  {
                    allocation: 'Allocation',
                    drawings: 'Drawings',
                    material: 'Material',
                    quality: 'Quality',
                    payments: 'Payments',
                    insight: 'Reporting',
                  } as Record<string, string>
                )[module.id]
              }
            </Link>
          ))}
        </nav>
      </div>
      <section className="m-section" id="modules">
        <div className="m-container">
          <SectionHeading
            label="The full lifecycle"
            title="Built around how work moves."
            description="Explore what each module does, the control it applies and the records behind the decision."
          />
          <div>
            {productModules.map((module, index) => (
              <article key={module.id} id={module.id} className="m-module-story">
                <div>
                  <div className="m-module-icon">
                    <span className="m-module-number">
                      {String(index + 1).padStart(2, '0')} / {module.label}
                    </span>
                  </div>
                  <h3>{module.title}</h3>
                  <p>{module.detail}</p>
                  <ul className="m-check-list">
                    {module.points.map((point) => (
                      <li key={point}>
                        <Check size={15} aria-hidden="true" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <figure className="m-module-record">
                  <figcaption className="m-caption">
                    ILLUSTRATIVE RECORD / {module.id.toUpperCase()}
                  </figcaption>
                  <h4>{module.title}</h4>
                  {moduleRows[module.id].map((row) => (
                    <div className="m-data-row" key={row.label}>
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                    </div>
                  ))}
                  <blockquote>{module.rule}</blockquote>
                </figure>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            label="The supporting work"
            title="The details between the milestones."
            description="Planning, clarifications, logistics and tooling stay close to the jobs they support."
          />
          <div className="m-capability-list">
            {capabilities.map((item) => (
              <details key={item.title}>
                <summary>
                  {item.title}
                  <ChevronDown size={15} aria-hidden="true" />
                </summary>
                <p>{item.detail}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            label="Designed around responsibility"
            title="The right depth for every role."
            description="Control, partner and inspector workspaces give each person a focused view of the shared operation."
          />
          <RoleExplorer />
        </div>
      </section>
      <section className="m-section">
        <div className="m-container">
          <CoverageLedger />
        </div>
      </section>
      <ClosingCTA title="Connect the work from end to end." />
    </>
  );
}

import type { Metadata } from 'next';
import { ChevronDown } from 'lucide-react';
import { capabilities } from '@/components/marketing/content';
import {
  ClosingCTA,
  CoverageLedger,
  PageHero,
  SectionHeading,
} from '@/components/marketing/editorial';
import { MarketingImage } from '@/components/marketing/imagery';
import { ModuleExplorer } from '@/components/marketing/module-explorer';
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
        description="Connect allocation, drawings, material, quality and payment. One continuous record, from the first job to the final approval."
        primary={{ href: '#modules', label: 'Explore the modules' }}
        secondary={{ href: '/solutions', label: 'Find your workflow' }}
      >
        <MarketingImage
          kind="precision"
          priority
          caption="Precision in the part. Clarity in the process."
        />
      </PageHero>
      <section className="m-section" id="modules">
        <div className="m-container">
          <SectionHeading
            label="The full lifecycle"
            title="Built around how work moves."
            description="Explore what each module does, the control it applies and the records behind the decision."
          />
          <ModuleExplorer />
        </div>
      </section>
      <section className="m-section m-tone-soft">
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

import type { Metadata } from 'next';
import {
  ClosingCTA,
  LinkCards,
  PageHero,
  SectionHeading,
  TextLink,
} from '@/components/marketing/editorial';
import { guides } from '@/components/marketing/guides';

export const metadata: Metadata = {
  title: 'Guides',
  description:
    'Practical GRID-X guides for partner onboarding, drawing control and material reconciliation.',
};
export default function ResourcesPage(): React.JSX.Element {
  return (
    <>
      <PageHero
        label="The GRID-X field guide"
        title="Good operations start"
        accent="with a clear record."
        description="Practical explanations of the handoffs that matter. Explore partner onboarding, drawing revisions and material reconciliation."
        centered
      />
      <section className="m-section">
        <div className="m-container">
          <article className="m-resource-feature">
            <div>
              <p className="m-eyebrow">Start here / Partner onboarding</p>
              <h2>From a business profile to a working first job.</h2>
              <p>
                Prepare the record, validate capability and use a trial order to establish a clear
                operating flow.
              </p>
              <TextLink href="/resources/partner-onboarding">Read the onboarding guide</TextLink>
            </div>
            <div className="m-checklist-preview">
              {[
                'Prepare the business record',
                'Declare the working capability',
                'Complete the assessment',
                'Run a controlled trial',
                'Review the approval category',
              ].map((step, i) => (
                <div key={step}>
                  <span>0{i + 1}</span>
                  {step}
                </div>
              ))}
            </div>
          </article>
          <SectionHeading
            label="Practical reading"
            title="Understand the work between the steps."
          />
          <LinkCards
            items={guides.map((guide) => ({
              label: guide.category,
              title: guide.title,
              detail: guide.description,
              href: `/resources/${guide.slug}`,
            }))}
          />
        </div>
      </section>
      <ClosingCTA
        title="Put the principles into the workflow."
        description="See how GRID-X connects these records across the partner manufacturing lifecycle."
      />
    </>
  );
}

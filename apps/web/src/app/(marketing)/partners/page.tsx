import type { Metadata } from 'next';
import { ChevronDown, Gauge, Languages, Smartphone, Wallet, WifiOff } from 'lucide-react';
import {
  ClosingCTA,
  FAQ,
  PageHero,
  SectionHeading,
  TextLink,
} from '@/components/marketing/editorial';
import { MarketingImage } from '@/components/marketing/imagery';
import {
  OnboardingJourney,
  PartnerWorkspace,
  PartnerRecordExplorer,
} from '@/components/marketing/showcases';

export const metadata: Metadata = {
  title: 'For partners',
  description:
    'A clearer way for GRID-X manufacturing partners to see assigned jobs, drawings, material, payment status, onboarding and scorecards.',
};
const benefits = [
  {
    Icon: Smartphone,
    title: 'Your work, on your phone',
    detail:
      'Open the partner app from the browser. Jobs, drawings and milestones stay within reach on the shop floor.',
  },
  {
    Icon: WifiOff,
    title: 'Built for weak signals',
    detail: 'Milestones save on the handset and sync when the connection returns.',
  },
  {
    Icon: Wallet,
    title: 'Payment details you can follow',
    detail: 'See accepted quantity, deductions, invoice status and scheduled payment dates.',
  },
  {
    Icon: Gauge,
    title: 'Know where you stand',
    detail:
      'Track quality, delivery, material efficiency and responsiveness through your scorecard.',
  },
  {
    Icon: Languages,
    title: 'Hindi and English',
    detail: 'Use the partner experience in the language your team works in.',
  },
];

export default function PartnersPage(): React.JSX.Element {
  return (
    <>
      <PageHero
        label="For manufacturing partners"
        title="Clear work."
        accent="A shared picture."
        description="The same job information the plant has, on the phone in your pocket. Know what to make, which drawing to use and where your payment stands."
        primary={{ href: '/partner/login', label: 'Open the partner app' }}
        secondary={{ href: '#onboarding', label: 'How onboarding works' }}
      >
        <MarketingImage kind="workshop" priority caption="Built for the people making the parts." />
      </PageHero>
      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            label="Made for the shop floor"
            title="Less chasing. More clarity."
            description="Useful information, close to the work. Every benefit supports a decision you make during the day."
          />
          <div className="m-partner-benefit-layout">
            <div className="m-benefit-accordion">
              {benefits.map(({ Icon, title, detail }, i) => (
                <details key={title} open={i === 0}>
                  <summary>
                    <Icon size={20} aria-hidden="true" />
                    <span>{title}</span>
                    <ChevronDown size={16} aria-hidden="true" />
                  </summary>
                  <p>{detail}</p>
                </details>
              ))}
            </div>
            <div className="m-record-stage">
              <PartnerWorkspace />
            </div>
          </div>
        </div>
      </section>
      <section className="m-section m-tone-soft">
        <div className="m-container">
          <PartnerRecordExplorer />
        </div>
      </section>
      <section className="m-section" id="onboarding">
        <div className="m-container">
          <SectionHeading
            label="Joining the network"
            title="Five steps. A clear path forward."
            description="Explore what each step needs and what it creates. From your business profile to your approval category."
          />
          <OnboardingJourney />
        </div>
      </section>
      <section className="m-section m-tone-dark" id="scorecards">
        <div className="m-container m-split-story">
          <div>
            <p className="m-eyebrow">03 / Visible performance</p>
            <h2>Your score has a record behind it.</h2>
            <p>
              Seven KPIs inform the partner scorecard. Review the underlying jobs and see how
              quality, delivery, material efficiency and responsiveness contribute.
            </p>
            <TextLink href="/partner/login">Open your partner workspace</TextLink>
          </div>
          <figure className="m-module-record">
            <figcaption className="m-caption">ILLUSTRATIVE SCORECARD / SELECTED KPIs</figcaption>
            <h4>Performance you can follow</h4>
            {[
              ['Quality', 96],
              ['Delivery', 91],
              ['Material efficiency', 88],
              ['Responsiveness', 74],
            ].map(([label, value]) => (
              <div className="m-score-row" key={label}>
                <span>{label}</span>
                <strong>{value} / 100</strong>
                <div className="m-score-track" aria-hidden="true">
                  <span style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
            <div className="m-data-row">
              <span>Category</span>
              <strong>Certified</strong>
            </div>
            <p className="m-caption">
              Four of seven KPIs shown. Example scores, not live partner performance.
            </p>
          </figure>
        </div>
      </section>
      <FAQ
        items={[
          {
            title: 'Do I need to install a separate application?',
            detail:
              'The partner experience works from a browser and can be installed from the browser on supported devices. You do not need an app-store installation to start.',
          },
          {
            title: 'What happens when the signal drops?',
            detail:
              'Supported milestones and photos queue on the handset for synchronization when connectivity returns. Keep the app and its local data available until pending updates have synchronized.',
          },
          {
            title: 'How do I understand a deduction?',
            detail:
              'An invoice shows accepted quantity and the applied deductions. The relevant inspection or material reconciliation record provides the reason behind the adjustment.',
          },
          {
            title: 'Where can I see payment progress?',
            detail:
              'Use the partner workspace to follow invoice status, accepted quantity, deductions and a scheduled payment date when one has been set.',
          },
        ]}
      />
      <ClosingCTA
        partner
        title="See today’s work with a clearer picture."
        description="Sign in with your registered partner account to view your jobs, drawings, material and payment status."
      />
    </>
  );
}

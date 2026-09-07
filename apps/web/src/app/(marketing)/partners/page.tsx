import type { Metadata } from 'next';
import { Check, Gauge, Languages, Smartphone, Wallet, WifiOff } from 'lucide-react';
import {
  ClosingCTA,
  DrawingReceipt,
  FAQ,
  PageHero,
  SectionHeading,
  TextLink,
} from '@/components/marketing/editorial';
import { OnboardingJourney, PartnerWorkspace } from '@/components/marketing/showcases';

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
        <PartnerWorkspace />
      </PageHero>
      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            label="Made for the shop floor"
            title="Less chasing. More clarity."
            description="Useful information, close to the work. Every benefit supports a decision you make during the day."
          />
          <div className="m-benefits">
            {benefits.map(({ Icon, title, detail }) => (
              <article key={title} className="m-benefit">
                <Icon size={21} strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="m-section">
        <div className="m-container m-split-story">
          <div>
            <p className="m-eyebrow">01 / Clear instructions</p>
            <h2>The released drawing, every time.</h2>
            <p>
              Open the revision released for your job. When a revision is superseded, the previous
              one locks and the record keeps the change visible.
            </p>
            <div className="m-story-points">
              <div>
                <Check />
                Job-specific drawing access.
              </div>
              <div>
                <Check />
                Views and acknowledgements on record.
              </div>
              <div>
                <Check />
                Revision status your team can check.
              </div>
            </div>
            <TextLink href="/resources/drawing-control">Read the drawing control guide</TextLink>
          </div>
          <DrawingReceipt />
        </div>
      </section>
      <section className="m-section">
        <div className="m-container m-split-story">
          <div>
            <p className="m-eyebrow">02 / Shared material record</p>
            <h2>Record what actually arrived.</h2>
            <p>
              Acknowledge the received weight and record shortage or damage at receipt. Keep the
              difference visible where it occurred.
            </p>
            <p>
              Consumption, scrap and unused returns stay connected to the job for reconciliation.
            </p>
            <TextLink href="/resources/material-reconciliation">
              Understand material reconciliation
            </TextLink>
          </div>
          <figure className="m-module-record">
            <figcaption className="m-caption">ILLUSTRATIVE RECEIPT / CH-8842</figcaption>
            <h4>Acknowledged at the partner unit</h4>
            {[
              ['Issued weight', '1,240 kg'],
              ['Received weight', '1,232 kg'],
              ['Receipt difference', '8 kg'],
              ['Variance status', 'Recorded at receipt'],
            ].map(([label, value]) => (
              <div className="m-data-row" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
            <blockquote>
              The received quantity and the issued quantity remain visible together.
            </blockquote>
          </figure>
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
      <section className="m-section" id="scorecards">
        <div className="m-container m-split-story">
          <div>
            <p className="m-eyebrow">03 / Visible performance</p>
            <h2>Your score has a record behind it.</h2>
            <p>
              Seven KPIs inform the partner scorecard. Review the underlying jobs and see how
              quality, delivery, material efficiency and responsiveness contribute.
            </p>
            <p>
              Category reviews use the same operational evidence. Your team can see where
              improvement matters.
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

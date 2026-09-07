import type { Metadata } from 'next';
import { ArrowRight, Database, FileInput, FileOutput, RefreshCw } from 'lucide-react';
import { ClosingCTA, FAQ, PageHero, SectionHeading } from '@/components/marketing/editorial';

export const metadata: Metadata = {
  title: 'Integrations',
  description:
    'Connect GRID-X with IMS work orders, validated master-data imports and CSV reporting while keeping system ownership clear.',
};
const exchanges = [
  {
    Icon: RefreshCw,
    title: 'Work order handoff',
    detail:
      'Bring configured IMS work orders and sales orders into the external manufacturing flow. Keep the source reference with the GRID-X job.',
  },
  {
    Icon: FileInput,
    title: 'Validated imports',
    detail:
      'Load components, items, partner records and rate cards through the supported import workflows. Row-level validation helps identify records that need correction.',
  },
  {
    Icon: FileOutput,
    title: 'Reports and exports',
    detail:
      'Use standard reports to inspect operational data and export CSV files for finance, audit and analysis.',
  },
  {
    Icon: Database,
    title: 'Clear record ownership',
    detail:
      'Keep internal inventory and in-house manufacturing in IMS. Use GRID-X for partner allocation, released drawings, external material custody, quality and commercials.',
  },
];
export default function IntegrationsPage(): React.JSX.Element {
  return (
    <>
      <PageHero
        label="Integrations and data flow"
        title="Connected systems."
        accent="Clear ownership."
        description="Bring the right records into the partner workflow. Keep IMS responsible for internal operations while GRID-X coordinates external manufacturing."
        primary={{ href: '#data-flow', label: 'Explore the data flow' }}
        secondary={{ href: '/pricing', label: 'See rollout scope' }}
        centered
      />
      <section className="m-section" id="data-flow">
        <div className="m-container">
          <SectionHeading
            label="The operational boundary"
            title="Each system has a clear job."
            description="Agree which records cross the boundary and which system owns the resulting decision."
          />
          <div className="m-system-boundary">
            <div>
              <p className="m-caption">INTERNAL OPERATIONS</p>
              <h3>IMS</h3>
              <p>
                Internal inventory, work orders and in-house manufacturing stay with the existing
                system of record.
              </p>
              <div className="m-boundary-fields">
                <span className="m-badge">Work orders</span>
                <span className="m-badge">Sales orders</span>
                <span className="m-badge">Internal stock</span>
              </div>
            </div>
            <ArrowRight size={23} aria-label="Configured work order handoff to GRID-X" />
            <div>
              <p className="m-caption">EXTERNAL MANUFACTURING</p>
              <h3>GRID-X</h3>
              <p>
                The partner job carries allocation, drawing access, material custody, inspection and
                commercial status.
              </p>
              <div className="m-boundary-fields">
                <span className="m-badge">Partner job</span>
                <span className="m-badge">Evidence</span>
                <span className="m-badge">Approval</span>
              </div>
            </div>
          </div>
          <p className="m-table-footnote">
            Integration fields, mappings and synchronization are configured for the deployment.
          </p>
        </div>
      </section>
      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            label="Ways the record moves"
            title="Bring in context. Carry out insight."
            description="Use the integration and import capabilities relevant to your operation."
          />
          <div className="m-integration-rows">
            {exchanges.map(({ Icon, title, detail }) => (
              <article className="m-integration-row" key={title}>
                <Icon size={23} strokeWidth={1.5} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <FAQ
        title="Plan the connection deliberately."
        items={[
          {
            title: 'Does GRID-X replace IMS?',
            detail:
              'GRID-X is designed around external distributed manufacturing. IMS remains the owner of internal inventory and in-house manufacturing. The connection brings relevant work into the partner workflow.',
          },
          {
            title: 'Can we start with existing spreadsheets?',
            detail:
              'Supported master-data imports include components, items, partners and rate cards. Prepare records in the required format and use the validation results to correct rejected rows.',
          },
          {
            title: 'Is IMS connected automatically?',
            detail:
              'The integration needs deployment-specific configuration and field mapping. Confirm the source records, identifiers, access and synchronization behavior before using it in production.',
          },
          {
            title: 'Can finance use the reporting data elsewhere?',
            detail:
              'Standard reports support CSV export, allowing finance and audit teams to work with the reported data in their existing analysis tools.',
          },
        ]}
      />
      <ClosingCTA
        title="Connect the next part of the operation."
        description="Explore the modules that turn source records into a controlled partner workflow."
      />
    </>
  );
}

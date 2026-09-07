export interface GuideSection {
  id: string;
  title: string;
  paragraphs: string[];
  points?: string[];
}
export interface Guide {
  slug: string;
  category: string;
  title: string;
  description: string;
  sections: GuideSection[];
  related: string;
}

export const guides: Guide[] = [
  {
    slug: 'partner-onboarding',
    category: 'Network operations',
    title: 'A clearer path from partner registration to the first job.',
    description:
      'Prepare the business record, validate capability and use a trial order to connect the partner to the operating flow.',
    related: '/partners#onboarding',
    sections: [
      {
        id: 'prepare',
        title: 'Start with a reusable business record.',
        paragraphs: [
          'Partner onboarding starts with information that will be used again: the business identity, the people responsible, registration details and payment information. Keeping these together reduces repeated entry as the relationship moves from review to production.',
          'Confirm that the information belongs to the correct partner unit before using the record for allocation or commercial processing.',
        ],
        points: [
          'Capture the business name and primary contacts.',
          'Record Udyam, GST and relevant business details.',
          'Check the bank details used by the commercial workflow.',
        ],
      },
      {
        id: 'capability',
        title: 'Describe the limits as clearly as the capabilities.',
        paragraphs: [
          'A useful capability declaration explains what a partner can make and the conditions under which it can make it. Processes alone are not enough; sizes, tolerances, equipment and available capacity shape whether a job is a good fit.',
          'Use the declaration to support allocation decisions. Keep declared capability distinct from the evidence gathered during assessment.',
        ],
        points: [
          'List processes, machines and relevant working ranges.',
          'Include tolerances, manpower and capacity information.',
          'Keep the declaration current when the unit changes equipment or scope.',
        ],
      },
      {
        id: 'assessment',
        title: 'Connect the declaration to the floor.',
        paragraphs: [
          'The audit reviews the declared capability against the operation. It covers capability, quality systems, safety and housekeeping, with findings kept on the partner record.',
          'Record the outcome and any follow-up actions clearly enough that the next reviewer can understand the status without repeating the entire conversation.',
        ],
      },
      {
        id: 'trial',
        title: 'Use a trial to prove the working relationship.',
        paragraphs: [
          'A trial order tests more than whether a part can be made. It exercises the handoffs: a released drawing, an acknowledged job, recorded material, an inspection result and a clear disposition.',
          'Use first-article approval before increasing the scope. Keep trial results connected to the decision about the partner’s approval category.',
        ],
        points: [
          'Issue the job with the correct released revision.',
          'Capture receipt and production information against that job.',
          'Record inspection and first-article decisions.',
          'Resolve follow-up actions before expanding the allocation.',
        ],
      },
      {
        id: 'review',
        title: 'Keep approval connected to performance.',
        paragraphs: [
          'Approval is part of an ongoing relationship. Trial approved, approved, certified and strategic categories describe different positions in the network, and the category can evolve as the underlying evidence changes.',
          'Review the scorecard alongside its source jobs. A performance number is more useful when the team can identify what contributed to it and what needs to improve.',
        ],
      },
    ],
  },
  {
    slug: 'drawing-control',
    category: 'Engineering control',
    title: 'Keep the released revision with the work.',
    description:
      'A practical guide to drawing release, job-scoped access, acknowledgement and revision history across partner manufacturing.',
    related: '/platform#drawings',
    sections: [
      {
        id: 'release',
        title: 'Make release status explicit.',
        paragraphs: [
          'A drawing can exist without being ready for production. GRID-X distinguishes draft, under review, approved, released and superseded states so the status of a revision can be checked before it reaches a partner.',
          'Treat the released revision as the reference for the assigned job. Approval and release are different points in the lifecycle, and the record should make both visible.',
        ],
      },
      {
        id: 'scope',
        title: 'Connect access to the assigned job.',
        paragraphs: [
          'A drawing grant provides context around access. It identifies the released revision, the job and the partner that needs it, rather than leaving the scope implicit in a shared file.',
          'Time-bound grants, revocation and watermarked viewing support that boundary. Review who needs access when the job or partner assignment changes.',
        ],
        points: [
          'Confirm the job and partner associated with the grant.',
          'Set the appropriate access duration.',
          'Check that the accessible revision is released.',
          'Review or revoke access when the assignment ends.',
        ],
      },
      {
        id: 'acknowledge',
        title: 'Record what the partner has seen.',
        paragraphs: [
          'A view and an acknowledgement answer different questions. The view records that the drawing was opened; acknowledgement provides a recorded response to the released information.',
          'Keep those events with the job. They help engineering and production understand which revision was available and what was acknowledged when the work moved forward.',
        ],
      },
      {
        id: 'revision',
        title: 'Treat a revision change as an operational event.',
        paragraphs: [
          'When a revision is superseded, the earlier release should no longer be the working reference. GRID-X keeps the revision history and applies access controls to the superseded version.',
          'Review the affected jobs and their acknowledgements as part of the change. A new file alone does not explain the operational consequences to the people already making the parts.',
        ],
        points: [
          'Identify jobs associated with the changed revision.',
          'Confirm the status of the replacement release.',
          'Check partner access and acknowledgement of the new revision.',
          'Preserve the previous revision and access history for reference.',
        ],
      },
      {
        id: 'history',
        title: 'Use the access history to resolve questions.',
        paragraphs: [
          'The access log connects an event to a person, revision, job and time. That makes it possible to inspect the record when a question arises about what information was available.',
          'Use the recorded sequence to understand the issue before deciding the next action. Keep clarifications connected to the job and revision so the answer remains available to the rest of the team.',
        ],
      },
    ],
  },
  {
    slug: 'material-reconciliation',
    category: 'Materials and finance',
    title: 'Follow every kilogram through the job.',
    description:
      'Connect issue, receipt, consumption, scrap and returns so the material record supports a clear commercial decision.',
    related: '/platform#material',
    sections: [
      {
        id: 'issue',
        title: 'Start the trail at material issue.',
        paragraphs: [
          'The issue challan connects the quantity sent to the partner and the job. Heat or batch information, weight and an expected return date help define what is under partner custody.',
          'Keep the reference available to the people receiving the material and the people reconciling it. A shared starting point makes the later comparison meaningful.',
        ],
      },
      {
        id: 'receipt',
        title: 'Record the quantity that arrived.',
        paragraphs: [
          'The partner acknowledgement records what actually arrived. If the quantity differs from the issued weight, or the material is damaged, record the difference at receipt.',
          'Issued and received quantities should remain distinguishable. A receipt difference has a specific place in the trail; it should not become an unexplained number at invoice time.',
        ],
        points: [
          'Confirm the challan and job reference.',
          'Record the received quantity.',
          'Capture shortage or damage at receipt.',
          'Keep the discrepancy and its resolution connected to the record.',
        ],
      },
      {
        id: 'account',
        title: 'Account for consumption and returns.',
        paragraphs: [
          'As the job progresses, connect material consumption, scrap and unused returns to the same record. Each movement explains part of the issued quantity.',
          'For illustration, a job issued 1,240 kg. Recorded consumption of 1,192 kg and scrap return of 34 kg account for 1,226 kg, leaving a 14 kg variance. The remaining quantity still needs an explanation; the arithmetic alone does not determine who is responsible.',
        ],
        points: [
          'Issued: 1,240 kg.',
          'Consumed: 1,192 kg.',
          'Scrap returned: 34 kg.',
          'Unused returned: 0 kg.',
          'Unexplained variance: 14 kg.',
        ],
      },
      {
        id: 'resolve',
        title: 'Resolve the variance before the approval.',
        paragraphs: [
          'Reconciliation compares the issued quantity with the quantities explained by the job. Review the source movements and receipt record when a variance remains.',
          'Where a deduction applies, keep the recorded reason and supporting evidence with the commercial record. This gives both teams something concrete to review.',
        ],
      },
      {
        id: 'payment',
        title: 'Carry the evidence into the invoice.',
        paragraphs: [
          'Material is one part of the payment decision. Accepted quantity, the applicable rate and the reconciliation record together provide the context needed for invoice verification.',
          'Keep the next approval and its status visible. The partner can follow the invoice while finance can inspect the records supporting the decision.',
        ],
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((guide) => guide.slug === slug);
}

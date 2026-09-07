export const productModules = [
  {
    id: 'allocation',
    iconName: 'Layers',
    label: 'Module 01 — 02',
    title: 'Demand, jobs and allocation',
    rule: 'A job cannot be released to a partner who is not eligible to make it.',
    detail:
      'Jobs are raised by hand or pulled from IMS work orders. GRID-X ranks eligible partners on capability, live capacity, quality history, distance and rate, and refuses an allocation that would put a Class A component outside without documented authorisation.',
    points: [
      'Jobs created manually or pulled from IMS work orders and sales orders.',
      'Recommendation scores capability, live capacity, quality history, distance and rate.',
      'Class A components need explicit outsourcing authorisation before allocation.',
      'Acceptance, decline reasons and re-allocation are all recorded against the job.',
    ],
  },
  {
    id: 'drawings',
    iconName: 'FileLock2',
    label: 'Module 03',
    title: 'Drawing and revision control',
    rule: 'Only a released revision can reach a shop floor.',
    detail:
      'Drawings move through draft, review, approved, released and superseded. Access is granted per job, time-bound and watermarked, and every open is written to the access log — so "they were working to an old print" stops being an argument nobody can settle.',
    points: [
      'Draft, under review, approved, released and superseded revision lifecycle.',
      'Only released revisions attach to a job or open for a partner.',
      'Time-bound, job-scoped access grants with watermarked view-only mode.',
      'Every view, download and acknowledgement stored in the drawing access log.',
    ],
  },
  {
    id: 'material',
    iconName: 'PackageSearch',
    label: 'Module 06',
    title: 'Material issue and reconciliation',
    rule: 'Every kilogram issued has to be explained before an invoice clears.',
    detail:
      'Issue challans carry heat and batch numbers, weight and an expected return date. The partner acknowledges what actually arrived. Consumption, scrap and unused return are tracked per job, and reconciliation gates the invoice rather than becoming a month-end argument.',
    points: [
      'Challan-based issue with heat and batch numbers, weight and expected return date.',
      'Partner acknowledges received weight and records shortage or damage.',
      'Consumption, scrap return and unused return tracked per job and item.',
      'Reconciliation compares issued against consumed before an invoice can be approved.',
    ],
  },
  {
    id: 'quality',
    iconName: 'ClipboardCheck',
    label: 'Module 08 — 09',
    title: 'Quality, rejection and rework',
    rule: 'Acceptance requires measured evidence, not a phone call.',
    detail:
      'Inspection plans carry characteristics, tolerances and instruments. Inspectors record actual values against them from the floor, with photographs. A rejection raises a non-conformance, feeds the scorecard and opens a corrective action when the same defect repeats.',
    points: [
      'Inspection plans with measured characteristics, tolerances and instruments.',
      'First article, in-process, final and pre-dispatch inspection types.',
      'Rejections raise non-conformances, rework orders and corrective actions.',
      'Deviation approvals are explicit and permanently auditable.',
    ],
  },
  {
    id: 'payments',
    iconName: 'Wallet',
    label: 'Module 11',
    title: 'Commercials and payments',
    rule: 'You pay for accepted quantity at the rate that was actually in force.',
    detail:
      'Rate cards are held per partner and component with full revision history. Invoices are built from accepted quantity only, then pass quantity, quality and material verification before finance approval — so the number that leaves matches the number that was made.',
    points: [
      'Rate master per partner and component with revision history and approvals.',
      'Invoices built from accepted quantity only, with deductions and incentives.',
      'Quantity, quality and material verification gates before finance approval.',
      'Payment scheduling with invoice and payment ageing reports.',
    ],
  },
  {
    id: 'insight',
    iconName: 'Gauge',
    label: 'Module 12 — 14',
    title: 'Dashboards, scorecards and reports',
    rule: 'The same numbers everywhere, or they are not numbers.',
    detail:
      'Every dashboard reads the same operational record the screens write to. Seven KPIs score each partner continuously and drive category changes, and seventeen standard reports export to CSV for finance and audit without anyone rekeying a figure.',
    points: [
      'Management, operations, quality, finance and partner dashboards.',
      'Seven-KPI partner scorecards driving category and level changes.',
      'Seventeen standard reports including avoided capex and partner concentration.',
      'CSV export on every report for finance and audit use.',
    ],
  },
];

export const moduleRows: Record<string, { label: string; value: string; tone?: string }[]> = {
  allocation: [
    { label: 'Precision Auto', value: '94 / ready', tone: 'live' },
    { label: 'Shakti Works', value: '81 / ready', tone: 'live' },
    { label: 'Metro Fabricators', value: 'class blocked', tone: 'warning' },
  ],
  drawings: [
    { label: 'DRG-4471 / Rev C', value: 'released', tone: 'live' },
    { label: 'Partner acknowledgement', value: '09:41', tone: 'live' },
    { label: 'Rev B', value: 'superseded', tone: 'neutral' },
  ],
  material: [
    { label: 'Issued', value: '1,240 kg', tone: 'neutral' },
    { label: 'Consumed + scrap', value: '1,226 kg', tone: 'live' },
    { label: 'Variance', value: '14 kg', tone: 'warning' },
  ],
  quality: [
    { label: 'Ø 24.00 ±0.05', value: '24.02', tone: 'live' },
    { label: 'Surface finish', value: 'pass', tone: 'live' },
    { label: 'Concentricity', value: 'reject', tone: 'warning' },
  ],
  payments: [
    { label: 'Quantity gate', value: 'passed', tone: 'live' },
    { label: 'Material gate', value: 'passed', tone: 'live' },
    { label: 'Finance approval', value: 'pending 2d', tone: 'warning' },
  ],
  insight: [
    { label: 'On-time delivery', value: '94.2%', tone: 'live' },
    { label: 'Acceptance rate', value: '98.6%', tone: 'live' },
    { label: 'Items needing action', value: '3', tone: 'warning' },
  ],
};

export const capabilities = [
  {
    title: 'Capacity planning',
    detail:
      'Declared machine and manpower capacity per partner, drawn down by live allocations so the next job is ranked against what is actually free.',
  },
  {
    title: 'Planning board',
    detail:
      'A single board across every partner and job, showing what is late, what is at risk and what has no drawing released yet.',
  },
  {
    title: 'Clarifications',
    detail:
      'A partner question is raised against the job and the drawing revision, so the answer lands on the record instead of in one person’s inbox.',
  },
  {
    title: 'Delay register',
    detail:
      'Delays are recorded with a reason and an owner, and feed the responsiveness KPI on the partner scorecard.',
  },
  {
    title: 'Logistics',
    detail:
      'Pickups, deliveries, shipments and vehicles tracked against the jobs they carry, with dispatch and receipt both acknowledged.',
  },
  {
    title: 'Tooling',
    detail:
      'Company-owned tooling issued to partners, with custody, condition and return tracked like any other issued asset.',
  },
  {
    title: 'Scrap and returns',
    detail:
      'Scrap return and unused material return are recorded per job and priced into reconciliation rather than written off.',
  },
  {
    title: 'Incentives and deductions',
    detail:
      'Rule-based incentives and evidence-backed deductions are applied to the invoice, each traceable to the record that caused it.',
  },
  {
    title: 'Notifications',
    detail:
      'Allocation, rejection, clarification and payment events reach the people responsible, in app and on the partner handset.',
  },
  {
    title: 'Bulk import',
    detail:
      'Components, items, partners and rates load from CSV with per-row validation, so onboarding does not start with retyping.',
  },
  {
    title: 'Audit log',
    detail:
      'Every state change is written with actor, time, device and IP, and nothing in the product can rewrite it afterwards.',
  },
  {
    title: 'IMS integration',
    detail:
      'Work orders and sales orders pull through from IMS, which stays the owner of internal inventory and manufacturing.',
  },
];

export const rolloutQuestions = [
  {
    title: 'Why is this sequenced rather than priced per seat?',
    detail:
      'The value of GRID-X is a complete operational flow. Each stage is scoped so that the system is usable at the end of it, rather than becoming useful only once everything ships.',
  },
  {
    title: 'What has to be true before stage two starts?',
    detail:
      'A job issued in GRID-X reaches a partner with a released drawing, comes back inspected, and gets invoiced from accepted quantity — without anyone maintaining a parallel spreadsheet.',
  },
  {
    title: 'Do partner units pay anything?',
    detail:
      'No. The partner app is part of the platform. Partner units need a browser and a phone; there is no licence, no store install and no hardware to buy.',
  },
  {
    title: 'What happens to the data already in spreadsheets?',
    detail:
      'Components, items, partners and rate cards load through the bulk import, which validates per row and reports what it rejected rather than failing the whole file.',
  },
  {
    title: 'How does this sit alongside IMS?',
    detail:
      'IMS stays the system of record for internal inventory and in-house manufacturing. GRID-X owns the external distributed manufacturing record and pulls work orders across the boundary.',
  },
  {
    title: 'Can a stage be reordered?',
    detail:
      'Within limits. Logistics and tooling can move earlier if the operation needs them, but drawing control and material custody have to land first — everything downstream depends on the record they create.',
  },
];

export type Language = 'EN' | 'HI';

/** Hindi/English strings for the partner application (Section 8). */
export const PARTNER_STRINGS = {
  home: { EN: 'Home', HI: 'होम' },
  jobs: { EN: 'Jobs', HI: 'काम' },
  drawings: { EN: 'Drawings', HI: 'ड्रॉइंग' },
  material: { EN: 'Material', HI: 'माल' },
  inspections: { EN: 'Inspections', HI: 'जाँच' },
  invoices: { EN: 'Invoices', HI: 'बिल' },
  scorecard: { EN: 'Scorecard', HI: 'स्कोर' },
  support: { EN: 'Support', HI: 'मदद' },
  score: { EN: 'Score', HI: 'स्कोर' },
  newJobs: { EN: 'New jobs', HI: 'नए काम' },
  activeJobs: { EN: 'Active jobs', HI: 'चालू काम' },
  awaitingMaterial: { EN: 'Material to acknowledge', HI: 'माल की पुष्टि' },
  pendingInspections: { EN: 'Inspections pending', HI: 'जाँच बाकी' },
  paymentsDue: { EN: 'Payments due', HI: 'भुगतान बाकी' },
  accept: { EN: 'Accept', HI: 'स्वीकार' },
  decline: { EN: 'Decline', HI: 'अस्वीकार' },
  updateProgress: { EN: 'Update progress', HI: 'प्रगति भेजें' },
  askQuestion: { EN: 'Ask a question', HI: 'सवाल पूछें' },
  offerForInspection: { EN: 'Offer for inspection', HI: 'जाँच के लिए दें' },
  dueDate: { EN: 'Due date', HI: 'अंतिम तारीख' },
  quantity: { EN: 'Quantity', HI: 'मात्रा' },

  // Job list and detail
  jobNumber: { EN: 'Job number', HI: 'काम नंबर' },
  component: { EN: 'Component', HI: 'पुर्ज़ा' },
  status: { EN: 'Status', HI: 'स्थिति' },
  rate: { EN: 'Rate', HI: 'दर' },
  accepted: { EN: 'Accepted', HI: 'स्वीकृत' },
  rejected: { EN: 'Rejected', HI: 'अस्वीकृत' },
  pending: { EN: 'Pending', HI: 'बाकी' },
  noJobs: { EN: 'No jobs yet', HI: 'अभी कोई काम नहीं' },
  viewDrawing: { EN: 'View drawing', HI: 'ड्रॉइंग देखें' },
  deliverTo: { EN: 'Deliver to', HI: 'यहाँ पहुँचाएँ' },
  overdue: { EN: 'Overdue', HI: 'देर हो चुकी' },
  dueToday: { EN: 'Due today', HI: 'आज तक' },

  // Material
  materialReceived: { EN: 'Confirm material received', HI: 'माल मिलने की पुष्टि' },
  challan: { EN: 'Challan', HI: 'चालान' },
  issuedOn: { EN: 'Issued on', HI: 'भेजा गया' },
  weight: { EN: 'Weight', HI: 'वज़न' },
  noMaterial: { EN: 'Nothing to acknowledge', HI: 'पुष्टि के लिए कुछ नहीं' },

  // Inspection and rework
  requestInspection: { EN: 'Request inspection', HI: 'जाँच के लिए कहें' },
  inspectionResult: { EN: 'Result', HI: 'नतीजा' },
  reworkNeeded: { EN: 'Rework needed', HI: 'दोबारा काम' },
  reworkInstructions: { EN: 'What to correct', HI: 'क्या ठीक करना है' },
  defect: { EN: 'Defect', HI: 'खराबी' },
  quantityAffected: { EN: 'Quantity affected', HI: 'कितने पुर्ज़े' },
  noInspections: { EN: 'No inspections pending', HI: 'कोई जाँच बाकी नहीं' },

  // Invoices and payment
  raiseInvoice: { EN: 'Raise invoice', HI: 'बिल भेजें' },
  invoiceNumber: { EN: 'Invoice number', HI: 'बिल नंबर' },
  amount: { EN: 'Amount', HI: 'रकम' },
  deductions: { EN: 'Deductions', HI: 'कटौती' },
  incentives: { EN: 'Incentives', HI: 'प्रोत्साहन' },
  netPayable: { EN: 'Net payable', HI: 'कुल देय' },
  paymentStatus: { EN: 'Payment status', HI: 'भुगतान की स्थिति' },
  onHold: { EN: 'On hold', HI: 'रोका गया' },
  holdReason: { EN: 'Why it is held', HI: 'क्यों रोका गया' },
  paid: { EN: 'Paid', HI: 'भुगतान हो गया' },
  noInvoices: { EN: 'No invoices yet', HI: 'अभी कोई बिल नहीं' },

  // Scorecard
  category: { EN: 'Category', HI: 'श्रेणी' },
  period: { EN: 'Period', HI: 'अवधि' },
  notRatedYet: { EN: 'Not rated yet', HI: 'अभी रेटिंग नहीं' },
  notEnoughWork: {
    EN: 'Not enough completed work to rate this period',
    HI: 'इस अवधि में रेटिंग के लिए पूरा काम कम है',
  },

  // Support and clarifications
  yourQuestion: { EN: 'Your question', HI: 'आपका सवाल' },
  answer: { EN: 'Answer', HI: 'जवाब' },
  awaitingAnswer: { EN: 'Waiting for an answer', HI: 'जवाब का इंतज़ार' },
  send: { EN: 'Send', HI: 'भेजें' },

  // Offline and sync
  offline: { EN: 'You are offline', HI: 'आप ऑफ़लाइन हैं' },
  savedOnPhone: {
    EN: 'Saved on your phone. It will send automatically when you are back online.',
    HI: 'फ़ोन में सुरक्षित है। नेटवर्क आते ही अपने आप भेज दिया जाएगा।',
  },
  waitingToSend: { EN: 'Waiting to send', HI: 'भेजना बाकी' },
  sending: { EN: 'Sending…', HI: 'भेजा जा रहा है…' },
  sent: { EN: 'Sent', HI: 'भेज दिया' },
  photosWaiting: { EN: 'Photographs waiting to upload', HI: 'फ़ोटो भेजना बाकी' },

  // Common actions
  save: { EN: 'Save', HI: 'सुरक्षित करें' },
  cancel: { EN: 'Cancel', HI: 'रद्द करें' },
  retry: { EN: 'Try again', HI: 'फिर कोशिश करें' },
  remarks: { EN: 'Remarks', HI: 'टिप्पणी' },
  photographs: { EN: 'Photographs', HI: 'फ़ोटो' },
  required: { EN: 'Required', HI: 'ज़रूरी' },
  somethingWentWrong: { EN: 'Something went wrong', HI: 'कुछ गड़बड़ हुई' },
} as const;

export type PartnerStringKey = keyof typeof PARTNER_STRINGS;

export function t(key: PartnerStringKey, language: Language): string {
  return PARTNER_STRINGS[key][language];
}

/**
 * Status values a partner reads on every screen.
 *
 * Page copy is already bilingual, but statuses were rendered by humanising the enum — so a Hindi
 * user still met "Awaiting Partner Acceptance" on the one field they look at most. Anything not
 * listed here falls back to the humanised English, which is better than an empty badge.
 */
export const STATUS_HI: Record<string, string> = {
  // Job status (Module 4)
  DRAFT: 'मसौदा',
  AWAITING_PARTNER_ACCEPTANCE: 'स्वीकृति बाकी',
  ACCEPTED: 'स्वीकृत',
  MATERIAL_PENDING: 'माल बाकी',
  MATERIAL_ISSUED: 'माल भेजा गया',
  IN_PRODUCTION: 'बन रहा है',
  INSPECTION_REQUESTED: 'जाँच माँगी',
  UNDER_INSPECTION: 'जाँच चल रही है',
  REWORK: 'दोबारा काम',
  QUALITY_ACCEPTED: 'जाँच में पास',
  DISPATCHED: 'भेज दिया',
  RECEIVED: 'मिल गया',
  CLOSED: 'पूरा हुआ',
  CANCELLED: 'रद्द',

  // Invoice status (Module 11)
  RAISED: 'भेजा गया',
  QUANTITY_VERIFIED: 'मात्रा जाँची',
  QUALITY_VERIFIED: 'गुणवत्ता जाँची',
  MATERIAL_RECONCILED: 'माल मिलान हुआ',
  FINANCE_APPROVED: 'वित्त से मंज़ूर',
  PAYMENT_SCHEDULED: 'भुगतान तय',
  PAID: 'भुगतान हो गया',
  HELD: 'रोका गया',
  REJECTED: 'अस्वीकृत',

  // Inspection decision (Module 8)
  ACCEPTED_WITH_DEVIATION: 'छूट के साथ स्वीकृत',
  REWORK_REQUIRED: 'दोबारा काम ज़रूरी',
  HOLD_FOR_ENGINEERING_REVIEW: 'इंजीनियरिंग जाँच तक रोका',

  // Clarification status (Module 7)
  OPEN: 'खुला',
  ANSWERED: 'जवाब मिला',

  // Partner category (Module 12)
  A: 'श्रेणी A',
  B: 'श्रेणी B',
  C: 'श्रेणी C',
  D: 'श्रेणी D',
  SUSPENDED: 'निलंबित',
};

/** Translates a status for display, falling back to the caller's humanised English. */
export function statusLabel(status: string, language: Language, fallback: string): string {
  if (language !== 'HI') return fallback;
  return STATUS_HI[status] ?? fallback;
}

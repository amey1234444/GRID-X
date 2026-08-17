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
} as const;

export type PartnerStringKey = keyof typeof PARTNER_STRINGS;

export function t(key: PartnerStringKey, language: Language): string {
  return PARTNER_STRINGS[key][language];
}

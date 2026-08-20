import { AllocationRecommendation, KpiCode, PartnerCategory } from './enums';

/** Module 12 — suggested score formula weights (total 100%). */
export const KPI_WEIGHTS: Record<KpiCode, number> = {
  FIRST_PASS_QUALITY: 30,
  ON_TIME_IN_FULL_DELIVERY: 25,
  MATERIAL_UTILISATION: 15,
  REWORK_RESPONSE: 10,
  CAPACITY_RELIABILITY: 10,
  DOCUMENTATION_DISCIPLINE: 5,
  SAFETY_AND_COMPLIANCE: 5,
};

export const KPI_LABELS: Record<KpiCode, string> = {
  FIRST_PASS_QUALITY: 'First-pass quality',
  ON_TIME_IN_FULL_DELIVERY: 'On-time-in-full delivery',
  MATERIAL_UTILISATION: 'Material utilisation',
  REWORK_RESPONSE: 'Rework response',
  CAPACITY_RELIABILITY: 'Capacity reliability',
  DOCUMENTATION_DISCIPLINE: 'Documentation discipline',
  SAFETY_AND_COMPLIANCE: 'Safety and compliance',
};

export interface KpiInput {
  code: KpiCode;
  /** KPI achievement as a percentage, 0-100 */
  value: number;
}

export interface ScorecardResult {
  totalScore: number;
  category: PartnerCategory;
  recommendation: AllocationRecommendation;
  kpis: Array<{ code: KpiCode; weight: number; value: number; weighted: number }>;
  /**
   * False when the period carried too little work to judge the partner on. The score is still
   * computed and stored so the history is unbroken, but it must not be read as a verdict.
   */
  hasSufficientData: boolean;
  /** Why the score is not a verdict, when it is not. Null once there is enough evidence. */
  insufficientDataReason: string | null;
}

/**
 * How much work a partner must have completed in a period before the score means anything.
 *
 * Every KPI falls back to 100 when there is nothing to measure — no rejections means perfect
 * quality, no late jobs means perfect delivery. Without a floor a brand-new partner scores 100,
 * lands in category A and is recommended for *more* work on the strength of having done none.
 */
export const MIN_JOBS_FOR_RATING = 3;

export interface ScorecardEvidence {
  jobsCompleted: number;
  quantityOffered: number;
}

/** Module 12 — A: 90–100, B: 80–89, C: 70–79, D: below 70, Suspended: critical violation */
export function categoryForScore(score: number, criticalViolation = false): PartnerCategory {
  if (criticalViolation) return 'SUSPENDED';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  return 'D';
}

export function recommendationForCategory(category: PartnerCategory): AllocationRecommendation {
  switch (category) {
    case 'A':
      return 'INCREASE_ALLOCATION';
    case 'B':
      return 'MAINTAIN_ALLOCATION';
    case 'C':
      return 'DEVELOPMENT_PLAN';
    case 'D':
      return 'REDUCE_ALLOCATION';
    case 'SUSPENDED':
    default:
      return 'SUSPEND_PARTNER';
  }
}

export function computeScorecard(
  inputs: KpiInput[],
  criticalViolation = false,
  evidence?: ScorecardEvidence,
): ScorecardResult {
  const kpis = (Object.keys(KPI_WEIGHTS) as KpiCode[]).map((code) => {
    const weight = KPI_WEIGHTS[code];
    const raw = inputs.find((i) => i.code === code)?.value ?? 0;
    const value = clamp(raw, 0, 100);
    return { code, weight, value, weighted: round2((value * weight) / 100) };
  });

  const totalScore = round2(kpis.reduce((sum, k) => sum + k.weighted, 0));
  const category = categoryForScore(totalScore, criticalViolation);

  // No evidence supplied means the caller is scoring something other than a live period — a
  // what-if, a test — and is not asking for the floor to be applied.
  const insufficientDataReason = evidence ? insufficientDataFor(evidence) : null;
  const hasSufficientData = insufficientDataReason === null;

  // A critical violation suspends a partner on its own merits and is never waved through for
  // want of volume; everything else waits for enough work to judge.
  const recommendation =
    hasSufficientData || criticalViolation
      ? recommendationForCategory(category)
      : 'MAINTAIN_ALLOCATION';

  return {
    totalScore,
    category,
    recommendation,
    kpis,
    hasSufficientData,
    insufficientDataReason,
  };
}

/** The sentence to show instead of a verdict, or null when the period stands on its own. */
export function insufficientDataFor(evidence: ScorecardEvidence): string | null {
  if (evidence.jobsCompleted >= MIN_JOBS_FOR_RATING && evidence.quantityOffered > 0) return null;
  if (evidence.jobsCompleted === 0) {
    return 'No jobs were completed in this period, so there is nothing to rate yet.';
  }
  if (evidence.quantityOffered <= 0) {
    return 'No quantity was offered for inspection in this period, so quality cannot be rated yet.';
  }
  return `Only ${evidence.jobsCompleted} of ${MIN_JOBS_FOR_RATING} jobs needed to rate a partner were completed in this period.`;
}

/**
 * Categories ranked best to worst, so a month-on-month move can be judged as a rise or a fall.
 * Used to decide when the `PARTNER_RATING_REDUCED` alert of Section 13 should fire.
 */
const CATEGORY_RANK: Record<PartnerCategory, number> = {
  A: 4,
  B: 3,
  C: 2,
  D: 1,
  SUSPENDED: 0,
};

export function categoryDropped(previous: PartnerCategory, next: PartnerCategory): boolean {
  return CATEGORY_RANK[next] < CATEGORY_RANK[previous];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

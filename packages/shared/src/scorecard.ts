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

export function computeScorecard(inputs: KpiInput[], criticalViolation = false): ScorecardResult {
  const kpis = (Object.keys(KPI_WEIGHTS) as KpiCode[]).map((code) => {
    const weight = KPI_WEIGHTS[code];
    const raw = inputs.find((i) => i.code === code)?.value ?? 0;
    const value = clamp(raw, 0, 100);
    return { code, weight, value, weighted: round2((value * weight) / 100) };
  });

  const totalScore = round2(kpis.reduce((sum, k) => sum + k.weighted, 0));
  const category = categoryForScore(totalScore, criticalViolation);

  return { totalScore, category, recommendation: recommendationForCategory(category), kpis };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

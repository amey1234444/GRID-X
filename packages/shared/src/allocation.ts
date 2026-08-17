import { round2 } from './scorecard';

/**
 * Module 4 — allocation logic.
 * The system recommends partners; the planner makes the final decision.
 */
export interface AllocationFactorWeights {
  approvedCapability: number;
  partnerRating: number;
  availableCapacity: number;
  deliveryPerformance: number;
  distance: number;
  currentWorkload: number;
  conversionCost: number;
  qualityScore: number;
  concentrationRisk: number;
}

export const ALLOCATION_WEIGHTS: AllocationFactorWeights = {
  approvedCapability: 20,
  partnerRating: 15,
  availableCapacity: 15,
  deliveryPerformance: 12,
  distance: 8,
  currentWorkload: 10,
  conversionCost: 8,
  qualityScore: 7,
  concentrationRisk: 5,
};

export const ALLOCATION_FACTOR_LABELS: Record<keyof AllocationFactorWeights, string> = {
  approvedCapability: 'Approved capability',
  partnerRating: 'Partner rating',
  availableCapacity: 'Available capacity',
  deliveryPerformance: 'Delivery performance',
  distance: 'Distance',
  currentWorkload: 'Current workload',
  conversionCost: 'Conversion cost',
  qualityScore: 'Quality score',
  concentrationRisk: 'Concentration risk',
};

export interface AllocationInput {
  /** Partner is approved for the component and the required process */
  hasApprovedCapability: boolean;
  /** Partner scorecard total, 0-100 */
  partnerRating: number;
  /** Free capacity hours available in the planning window */
  freeCapacityHours: number;
  /** Hours the job needs */
  requiredHours: number;
  /** On-time delivery percentage, 0-100 */
  onTimeDeliveryPercent: number;
  /** Road distance in km */
  distanceKm: number;
  /** Open jobs currently with the partner */
  openJobs: number;
  maxOpenJobs: number;
  /** Quoted or contracted conversion rate for the component */
  conversionRate: number;
  /** Lowest conversion rate among candidates, used to normalise cost */
  bestConversionRate: number;
  /** First-pass quality percentage, 0-100 */
  firstPassQualityPercent: number;
  /** Share of total network value already given to this partner, 0-100 */
  networkSharePercent: number;
}

export interface AllocationScore {
  total: number;
  breakdown: Array<{ factor: keyof AllocationFactorWeights; label: string; score: number; weight: number; weighted: number }>;
  blockers: string[];
}

const MAX_SCORING_DISTANCE_KM = 400;
const CONCENTRATION_LIMIT_PERCENT = 25;

export function scorePartnerForJob(input: AllocationInput): AllocationScore {
  const factors: Record<keyof AllocationFactorWeights, number> = {
    approvedCapability: input.hasApprovedCapability ? 100 : 0,
    partnerRating: clamp01to100(input.partnerRating),
    availableCapacity:
      input.requiredHours <= 0
        ? 100
        : clamp01to100((input.freeCapacityHours / input.requiredHours) * 100),
    deliveryPerformance: clamp01to100(input.onTimeDeliveryPercent),
    distance: clamp01to100(
      100 - (Math.min(input.distanceKm, MAX_SCORING_DISTANCE_KM) / MAX_SCORING_DISTANCE_KM) * 100,
    ),
    currentWorkload:
      input.maxOpenJobs <= 0
        ? 0
        : clamp01to100(100 - (input.openJobs / input.maxOpenJobs) * 100),
    conversionCost:
      input.conversionRate <= 0 || input.bestConversionRate <= 0
        ? 50
        : clamp01to100((input.bestConversionRate / input.conversionRate) * 100),
    qualityScore: clamp01to100(input.firstPassQualityPercent),
    concentrationRisk: clamp01to100(
      100 - (Math.min(input.networkSharePercent, CONCENTRATION_LIMIT_PERCENT * 2) / (CONCENTRATION_LIMIT_PERCENT * 2)) * 100,
    ),
  };

  const breakdown = (Object.keys(ALLOCATION_WEIGHTS) as Array<keyof AllocationFactorWeights>).map(
    (factor) => {
      const weight = ALLOCATION_WEIGHTS[factor];
      const score = round2(factors[factor]);
      return {
        factor,
        label: ALLOCATION_FACTOR_LABELS[factor],
        score,
        weight,
        weighted: round2((score * weight) / 100),
      };
    },
  );

  const blockers: string[] = [];
  if (!input.hasApprovedCapability) blockers.push('Not an approved partner for this component');
  if (input.requiredHours > 0 && input.freeCapacityHours < input.requiredHours)
    blockers.push('Declared free capacity is lower than the job requirement');
  if (input.maxOpenJobs > 0 && input.openJobs >= input.maxOpenJobs)
    blockers.push('Partner is at its maximum open-job limit');
  if (input.networkSharePercent > CONCENTRATION_LIMIT_PERCENT)
    blockers.push(`Concentration risk: partner already holds ${round2(input.networkSharePercent)}% of network value`);

  return {
    total: round2(breakdown.reduce((sum, b) => sum + b.weighted, 0)),
    breakdown,
    blockers,
  };
}

function clamp01to100(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
}

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

// ---------------------------------------------------------------------------
// Module 2 — outsourcing eligibility
// ---------------------------------------------------------------------------

/**
 * Below this an engineer has judged the component a poor candidate for outsourcing — tooling too
 * specialised, tolerances too tight, or the drawing not stable enough to hand out.
 */
export const MIN_OUTSOURCING_ELIGIBILITY = 40;

export interface EligibilityVerdict {
  /** Whether the component can be outsourced without a documented reason. */
  eligible: boolean;
  score: number;
  /** Plain explanation for the planner. Null when the component is eligible. */
  reason: string | null;
}

/**
 * Module 2 records an outsourcing eligibility score against every component. It exists so a
 * component can be judged unsuitable for the network on engineering grounds, separately from its
 * criticality class — a Class C part with a 15 is still a part nobody outside should be making.
 */
export function outsourcingEligibility(score: number | null | undefined): EligibilityVerdict {
  // A component nobody has scored yet has not been judged unsuitable — it has not been judged at
  // all, and an unmade judgement must not read as a refusal.
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return { eligible: true, score: MIN_OUTSOURCING_ELIGIBILITY, reason: null };
  }
  if (score >= MIN_OUTSOURCING_ELIGIBILITY) {
    return { eligible: true, score, reason: null };
  }
  return {
    eligible: false,
    score,
    reason:
      `This component scores ${score} for outsourcing eligibility, below the ${MIN_OUTSOURCING_ELIGIBILITY} ` +
      'the network expects. Engineering has judged it a poor candidate to send out.',
  };
}

// ---------------------------------------------------------------------------
// Module 4 — distance
// ---------------------------------------------------------------------------

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance between two points, in kilometres.
 *
 * Distance is one of the nine factors the allocation engine ranks partners on, and it was being
 * typed in by hand while the coordinates sat unused on the record. A hand-entered figure is not
 * only easy to get wrong — it can be understated to make a partner rank better.
 *
 * This is straight-line distance. Road distance is longer, so the figure is scaled by a factor
 * that reflects typical road networks; it is an estimate either way, and a consistent estimate
 * ranks partners fairly, which is what the allocation engine needs.
 */
export function haversineKm(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Roads are not straight; this is the usual planning allowance over great-circle distance. */
export const ROAD_DISTANCE_FACTOR = 1.3;

/** Coordinates only count when both are present and inside the valid ranges. */
export function isUsableCoordinate(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    // 0,0 is in the Atlantic: it is a default that was never filled in, not a location.
    !(latitude === 0 && longitude === 0)
  );
}

/**
 * Road distance from the plant to a partner, or null when either end lacks usable coordinates —
 * in which case the caller keeps whatever was entered by hand.
 */
export interface MaybeCoordinates {
  latitude?: number | null;
  longitude?: number | null;
}

export function roadDistanceKm(
  plant: MaybeCoordinates | null | undefined,
  partner: MaybeCoordinates | null | undefined,
): number | null {
  if (!isUsableCoordinate(plant?.latitude, plant?.longitude)) return null;
  if (!isUsableCoordinate(partner?.latitude, partner?.longitude)) return null;

  const straight = haversineKm(plant as Coordinates, partner as Coordinates);
  return round2(straight * ROAD_DISTANCE_FACTOR);
}

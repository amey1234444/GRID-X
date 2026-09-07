import { InspectionLevel, InspectionType } from './enums';

/**
 * Module 8 — how much of a lot must actually be measured.
 *
 * Inspection plans structured *what* to measure — characteristic, specification, tolerance,
 * instrument — and left *how many* as a free-text sampling plan nobody could enforce. An inspector
 * could record one sample against a 500-piece batch and the record looked complete. The component's
 * inspection level had the same problem: `LEVEL_4_CRITICAL_100_PERCENT` did not cause anything to
 * be inspected 100%, and `LEVEL_2_SAMPLING` derived no sample size.
 */

export interface SamplingRule {
  /** Share of the offered quantity that must be measured. */
  percent: number;
  /** Floor, so a small lot still gets a meaningful number of pieces measured. */
  minimum: number;
  source: 'PLAN' | 'INSPECTION_LEVEL';
  label: string;
}

/** Default sampling for each inspection level, used when a plan does not state its own. */
const LEVEL_SAMPLING: Record<InspectionLevel, { percent: number; minimum: number; label: string }> =
  {
    LEVEL_1_VISUAL: { percent: 5, minimum: 1, label: 'Visual — 5% of the lot' },
    LEVEL_2_SAMPLING: { percent: 10, minimum: 3, label: 'Sampling — 10% of the lot, at least 3' },
    LEVEL_3_FULL_DIMENSIONAL: {
      percent: 20,
      minimum: 5,
      label: 'Full dimensional — 20% of the lot, at least 5',
    },
    LEVEL_4_CRITICAL_100_PERCENT: {
      percent: 100,
      minimum: 1,
      label: 'Critical — every piece',
    },
  };

/**
 * The sampling rule in force for an inspection: the plan's own figures where it states them,
 * otherwise the component's inspection level.
 */
export function samplingRule(
  inspectionLevel: InspectionLevel,
  plan?: { samplePercent?: number | null; minSampleSize?: number | null } | null,
): SamplingRule {
  if (plan && (plan.samplePercent != null || plan.minSampleSize != null)) {
    const percent = plan.samplePercent ?? 0;
    const minimum = plan.minSampleSize ?? 0;
    return {
      percent,
      minimum,
      source: 'PLAN',
      label:
        percent > 0 && minimum > 0
          ? `${percent}% of the lot, at least ${minimum}`
          : percent > 0
            ? `${percent}% of the lot`
            : `at least ${minimum} pieces`,
    };
  }
  const level = LEVEL_SAMPLING[inspectionLevel];
  return { ...level, source: 'INSPECTION_LEVEL' };
}

/**
 * How many distinct pieces must be measured for a given offered quantity.
 *
 * Never more than the lot itself — a rule asking for 5 pieces out of a batch of 3 would be
 * unsatisfiable, and a first article is a single piece by definition.
 */
export function requiredSampleSize(
  offeredQuantity: number,
  rule: SamplingRule,
  inspectionType?: InspectionType,
): number {
  if (inspectionType === 'FIRST_ARTICLE') return 1;
  if (offeredQuantity <= 0) return 0;
  const byPercent = Math.ceil((offeredQuantity * rule.percent) / 100);
  return Math.min(offeredQuantity, Math.max(byPercent, rule.minimum, 1));
}

export interface SamplingCompliance {
  requiredSamples: number;
  recordedSamples: number;
  satisfied: boolean;
  shortfall: number;
  rule: SamplingRule;
}

/**
 * Whether the results recorded satisfy the sampling rule.
 *
 * Counts *distinct sample numbers*, not result rows: measuring six characteristics on one piece is
 * one piece inspected, however many rows it produces. Getting that wrong would let a plan with many
 * characteristics be satisfied by a single sample.
 */
export function samplingCompliance(
  offeredQuantity: number,
  sampleNumbers: number[],
  rule: SamplingRule,
  inspectionType?: InspectionType,
): SamplingCompliance {
  const requiredSamples = requiredSampleSize(offeredQuantity, rule, inspectionType);
  const recordedSamples = new Set(sampleNumbers).size;
  return {
    requiredSamples,
    recordedSamples,
    satisfied: recordedSamples >= requiredSamples,
    shortfall: Math.max(0, requiredSamples - recordedSamples),
    rule,
  };
}

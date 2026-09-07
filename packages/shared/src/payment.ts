import { AdjustmentType } from './enums';
import { round2 } from './scorecard';

/**
 * Module 11 — payment calculation.
 *
 *   Payment = Accepted Quantity × Conversion Rate
 *             + Quality Incentive
 *             + On-Time Delivery Incentive
 *             − Rework Deduction
 *             − Material Shortage Deduction
 *             − Approved Penalty
 */
export interface PaymentAdjustment {
  type: AdjustmentType;
  label: string;
  amount: number;
}

export interface PaymentLine {
  jobId: string;
  jobNumber?: string;
  acceptedQuantity: number;
  conversionRate: number;
  amount: number;
}

export interface PaymentCalculation {
  lines: PaymentLine[];
  basicAmount: number;
  incentives: PaymentAdjustment[];
  deductions: PaymentAdjustment[];
  incentiveAmount: number;
  deductionAmount: number;
  taxAmount: number;
  netAmount: number;
}

export const INCENTIVE_SET: AdjustmentType[] = [
  'QUALITY_INCENTIVE',
  'ON_TIME_DELIVERY_INCENTIVE',
  'OTHER_INCENTIVE',
];

export function isIncentive(type: AdjustmentType): boolean {
  return INCENTIVE_SET.includes(type);
}

export function calculatePayment(
  lines: PaymentLine[],
  adjustments: PaymentAdjustment[] = [],
  taxPercent = 0,
): PaymentCalculation {
  const normalisedLines = lines.map((line) => ({
    ...line,
    amount: round2(line.acceptedQuantity * line.conversionRate),
  }));

  const basicAmount = round2(normalisedLines.reduce((sum, l) => sum + l.amount, 0));

  const incentives = adjustments.filter((a) => isIncentive(a.type));
  const deductions = adjustments.filter((a) => !isIncentive(a.type));

  const incentiveAmount = round2(incentives.reduce((sum, a) => sum + Math.abs(a.amount), 0));
  const deductionAmount = round2(deductions.reduce((sum, a) => sum + Math.abs(a.amount), 0));

  const taxableAmount = basicAmount + incentiveAmount - deductionAmount;
  const taxAmount = round2((taxableAmount * taxPercent) / 100);

  return {
    lines: normalisedLines,
    basicAmount,
    incentives,
    deductions,
    incentiveAmount,
    deductionAmount,
    taxAmount,
    netAmount: round2(taxableAmount + taxAmount),
  };
}

/** Default incentive rules used when a partner has no explicit rule configured. */
export const DEFAULT_QUALITY_INCENTIVE_PERCENT = 2;
export const DEFAULT_OTD_INCENTIVE_PERCENT = 2;
export const DEFAULT_REWORK_DEDUCTION_PERCENT = 5;

// ---------------------------------------------------------------------------
// Module 11 — earning the incentive half of the payment formula
// ---------------------------------------------------------------------------

/** A rule as configured by procurement, reduced to what the calculation needs. */
export interface IncentiveRule {
  id: string;
  type: AdjustmentType;
  name: string;
  percentage?: number | null;
  fixedAmount?: number | null;
  /** Performance the partner must reach for this rule to pay. Null means award by hand. */
  thresholdPercent?: number | null;
}

/** What the invoiced jobs actually achieved, against which rules are judged. */
export interface IncentivePerformance {
  /** Accepted ÷ (accepted + rejected), as a percentage. Null when nothing was inspected. */
  firstPassQualityPercent: number | null;
  /** Jobs completed on or before the due date, as a percentage. Null when none are comparable. */
  onTimeDeliveryPercent: number | null;
}

/** Which measured percentage a rule is judged against; null means it cannot be judged. */
function metricFor(type: AdjustmentType, performance: IncentivePerformance): number | null {
  if (type === 'QUALITY_INCENTIVE') return performance.firstPassQualityPercent;
  if (type === 'ON_TIME_DELIVERY_INCENTIVE') return performance.onTimeDeliveryPercent;
  return null;
}

export interface EarnedIncentive extends PaymentAdjustment {
  ruleId: string;
  /** What the partner achieved, for showing alongside the amount. */
  measuredPercent: number;
  thresholdPercent: number;
}

/**
 * Works out which incentive rules the invoiced jobs have earned.
 *
 * A rule pays only when its metric can be measured and reaches the threshold, so a partner with no
 * inspected work earns nothing rather than earning by default — the same reasoning as the
 * scorecard's minimum-evidence floor. Percentage rules are taken on the basic amount; a rule
 * carrying both a percentage and a fixed amount pays the sum of the two, which is how procurement
 * expresses "2% plus a flat bonus".
 */
export function earnedIncentives(
  rules: IncentiveRule[],
  performance: IncentivePerformance,
  basicAmount: number,
): EarnedIncentive[] {
  const earned: EarnedIncentive[] = [];

  for (const rule of rules) {
    if (!isIncentive(rule.type)) continue;
    if (rule.thresholdPercent === null || rule.thresholdPercent === undefined) continue;

    const measured = metricFor(rule.type, performance);
    if (measured === null) continue;
    if (measured < rule.thresholdPercent) continue;

    const fromPercentage = rule.percentage ? (basicAmount * rule.percentage) / 100 : 0;
    const amount = round2(fromPercentage + (rule.fixedAmount ?? 0));
    if (amount <= 0) continue;

    earned.push({
      ruleId: rule.id,
      type: rule.type,
      label: `${rule.name} — ${measured.toFixed(1)}% against ${rule.thresholdPercent}% required`,
      amount,
      measuredPercent: measured,
      thresholdPercent: rule.thresholdPercent,
    });
  }

  return earned;
}

/**
 * First-pass quality and on-time delivery over the jobs being invoiced.
 *
 * Both are deliberately null rather than 100 when there is nothing to measure, so an incentive is
 * never paid on the strength of absent evidence.
 */
export function performanceForJobs(
  jobs: {
    acceptedQuantity: number;
    rejectedQuantity: number;
    dueDate: Date | string | null;
    completedAt: Date | string | null;
  }[],
): IncentivePerformance {
  const inspected = jobs.reduce((sum, job) => sum + job.acceptedQuantity + job.rejectedQuantity, 0);
  const accepted = jobs.reduce((sum, job) => sum + job.acceptedQuantity, 0);

  const comparable = jobs.filter((job) => job.dueDate !== null && job.completedAt !== null);
  const onTime = comparable.filter(
    (job) => new Date(job.completedAt as Date) <= new Date(job.dueDate as Date),
  );

  return {
    firstPassQualityPercent: inspected > 0 ? round2((accepted / inspected) * 100) : null,
    onTimeDeliveryPercent:
      comparable.length > 0 ? round2((onTime.length / comparable.length) * 100) : null,
  };
}

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

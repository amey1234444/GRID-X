import { calculatePayment, categoryForScore, computeScorecard } from '@gridx/shared';

/**
 * The money and scorecard maths is shared between API and web and drives what a
 * partner actually gets paid, so it is pinned down here rather than left to
 * manual checking.
 */
describe('calculatePayment', () => {
  // `amount` is recomputed by calculatePayment from quantity × rate.
  const lines = [
    { jobId: 'job-1', acceptedQuantity: 100, conversionRate: 12.5, amount: 0 },
    { jobId: 'job-2', acceptedQuantity: 40, conversionRate: 30, amount: 0 },
  ];

  it('pays only for accepted quantity', () => {
    const result = calculatePayment(lines);
    expect(result.basicAmount).toBe(2450);
    expect(result.netAmount).toBe(2450);
  });

  it('adds incentives, subtracts deductions and taxes the net of both', () => {
    const result = calculatePayment(
      lines,
      [
        { type: 'QUALITY_INCENTIVE', amount: 100, label: 'zero rejections' },
        { type: 'REWORK_DEDUCTION', amount: 150, label: 'rework GXRW-0001' },
      ],
      18,
    );

    expect(result.incentiveAmount).toBe(100);
    expect(result.deductionAmount).toBe(150);
    // (2450 + 100 - 150) = 2400 taxable, 18% = 432
    expect(result.taxAmount).toBe(432);
    expect(result.netAmount).toBe(2832);
  });

  it('treats a deduction as a deduction whichever sign it arrives with', () => {
    const negative = calculatePayment(lines, [
      { type: 'MATERIAL_SHORTAGE_DEDUCTION', amount: -200, label: 'shortage' },
    ]);
    const positive = calculatePayment(lines, [
      { type: 'MATERIAL_SHORTAGE_DEDUCTION', amount: 200, label: 'shortage' },
    ]);
    expect(negative.netAmount).toBe(positive.netAmount);
    expect(negative.netAmount).toBe(2250);
  });

  it('returns zero for an invoice with no lines', () => {
    const result = calculatePayment([], [], 18);
    expect(result.basicAmount).toBe(0);
    expect(result.netAmount).toBe(0);
  });
});

describe('computeScorecard', () => {
  it('weights KPIs into a single score and category', () => {
    const perfect = computeScorecard([
      { code: 'FIRST_PASS_QUALITY', value: 100 },
      { code: 'ON_TIME_IN_FULL_DELIVERY', value: 100 },
      { code: 'MATERIAL_UTILISATION', value: 100 },
      { code: 'REWORK_RESPONSE', value: 100 },
      { code: 'CAPACITY_RELIABILITY', value: 100 },
      { code: 'DOCUMENTATION_DISCIPLINE', value: 100 },
      { code: 'SAFETY_AND_COMPLIANCE', value: 100 },
    ]);
    expect(perfect.totalScore).toBe(100);
    expect(perfect.category).toBe('A');
  });

  it('scores a missing KPI as zero rather than skipping its weight', () => {
    // FIRST_PASS_QUALITY carries 30 of the 100 points.
    const result = computeScorecard([
      { code: 'ON_TIME_IN_FULL_DELIVERY', value: 100 },
      { code: 'MATERIAL_UTILISATION', value: 100 },
      { code: 'REWORK_RESPONSE', value: 100 },
      { code: 'CAPACITY_RELIABILITY', value: 100 },
      { code: 'DOCUMENTATION_DISCIPLINE', value: 100 },
      { code: 'SAFETY_AND_COMPLIANCE', value: 100 },
    ]);
    expect(result.totalScore).toBe(70);
    expect(result.category).toBe('C');
  });

  it('clamps out-of-range KPI values instead of inflating the score', () => {
    const result = computeScorecard([{ code: 'FIRST_PASS_QUALITY', value: 500 }]);
    expect(result.totalScore).toBeLessThanOrEqual(100);
    expect(result.totalScore).toBe(30);
  });

  it('suspends on a critical violation regardless of score', () => {
    const result = computeScorecard([{ code: 'FIRST_PASS_QUALITY', value: 100 }], true);
    expect(result.category).toBe('SUSPENDED');
    expect(result.recommendation).toBe('SUSPEND_PARTNER');
  });
});

describe('categoryForScore', () => {
  it.each([
    [95, 'A'],
    [90, 'A'],
    [85, 'B'],
    [80, 'B'],
    [75, 'C'],
    [70, 'C'],
    [69.9, 'D'],
    [0, 'D'],
  ])('maps %s to category %s', (score, expected) => {
    expect(categoryForScore(score as number)).toBe(expected);
  });
});

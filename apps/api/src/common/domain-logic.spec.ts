import {
  calculatePayment,
  categoryForScore,
  computeScorecard,
  outsourcingEligibility,
  requiresFirstArticle,
  responsibilityForDelay,
} from '@gridx/shared';

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

  describe('the minimum-evidence floor', () => {
    // Every KPI falls back to 100 when there is nothing to measure, so a partner who has done no
    // work scores 100. Without the floor that reads as a category A performance.
    const noWork = { jobsCompleted: 0, quantityOffered: 0 };

    it('does not recommend more work for a partner who has done none', () => {
      const result = computeScorecard([], false, noWork);
      expect(result.hasSufficientData).toBe(false);
      expect(result.recommendation).toBe('MAINTAIN_ALLOCATION');
      expect(result.insufficientDataReason).toMatch(/No jobs were completed/);
    });

    it('still records the score, so the history is unbroken', () => {
      const result = computeScorecard([{ code: 'FIRST_PASS_QUALITY', value: 100 }], false, noWork);
      expect(result.totalScore).toBe(30);
      expect(result.category).toBe('D');
    });

    it('holds the recommendation until the minimum job count is reached', () => {
      const result = computeScorecard([], false, { jobsCompleted: 2, quantityOffered: 40 });
      expect(result.hasSufficientData).toBe(false);
      expect(result.insufficientDataReason).toMatch(/Only 2 of 3 jobs/);
    });

    it('rates a partner once there is enough behind them', () => {
      const result = computeScorecard(
        [
          { code: 'FIRST_PASS_QUALITY', value: 100 },
          { code: 'ON_TIME_IN_FULL_DELIVERY', value: 100 },
          { code: 'MATERIAL_UTILISATION', value: 100 },
          { code: 'REWORK_RESPONSE', value: 100 },
          { code: 'CAPACITY_RELIABILITY', value: 100 },
          { code: 'DOCUMENTATION_DISCIPLINE', value: 100 },
          { code: 'SAFETY_AND_COMPLIANCE', value: 100 },
        ],
        false,
        { jobsCompleted: 5, quantityOffered: 120 },
      );
      expect(result.hasSufficientData).toBe(true);
      expect(result.recommendation).toBe('INCREASE_ALLOCATION');
      expect(result.insufficientDataReason).toBeNull();
    });

    it('suspends a critical violation even on thin evidence', () => {
      const result = computeScorecard([], true, noWork);
      expect(result.category).toBe('SUSPENDED');
      expect(result.recommendation).toBe('SUSPEND_PARTNER');
    });

    it('applies no floor when the caller is scoring a what-if', () => {
      expect(computeScorecard([]).hasSufficientData).toBe(true);
    });
  });
});

describe('responsibilityForDelay', () => {
  // Module 7 exists to tell partner-caused delay from OSWAR-caused delay. Recording every delay
  // against the partner, as the milestone form used to, defeats that and skews the scorecard.
  it.each([
    ['DRAWING_CLARIFICATION', 'OSWAR'],
    ['OSWAR_APPROVAL_PENDING', 'OSWAR'],
    ['MACHINE_BREAKDOWN', 'PARTNER'],
    ['LABOUR_SHORTAGE', 'PARTNER'],
    ['PARTNER_PLANNING_FAILURE', 'PARTNER'],
    ['POWER_ISSUE', 'EXTERNAL'],
    ['TRANSPORT_DELAY', 'EXTERNAL'],
  ] as const)('assigns %s to %s', (reason, owner) => {
    expect(responsibilityForDelay(reason)).toBe(owner);
  });

  it('blames a material shortage on whoever undertook to supply the material', () => {
    expect(responsibilityForDelay('MATERIAL_SHORTAGE', 'OSWAR_SUPPLIED')).toBe('OSWAR');
    expect(responsibilityForDelay('MATERIAL_SHORTAGE', 'PARTNER_SUPPLIED')).toBe('PARTNER');
  });

  it('falls back to the reason default when the job is not known', () => {
    expect(responsibilityForDelay('MATERIAL_SHORTAGE')).toBe('OSWAR');
  });
});

describe('requiresFirstArticle', () => {
  it('always gates controlled-outsourcing components', () => {
    expect(requiresFirstArticle('LEVEL_1_VISUAL', 'CLASS_A')).toBe(true);
    expect(requiresFirstArticle('LEVEL_1_VISUAL', 'CLASS_B')).toBe(true);
  });

  it('waives visual-only work on lower criticality', () => {
    expect(requiresFirstArticle('LEVEL_1_VISUAL', 'CLASS_C')).toBe(false);
    expect(requiresFirstArticle('LEVEL_1_VISUAL', 'CLASS_D')).toBe(false);
  });

  it('gates anything that is actually measured', () => {
    expect(requiresFirstArticle('LEVEL_2_SAMPLING', 'CLASS_D')).toBe(true);
    expect(requiresFirstArticle('LEVEL_3_FULL_DIMENSIONAL', 'CLASS_D')).toBe(true);
    expect(requiresFirstArticle('LEVEL_4_CRITICAL_100_PERCENT', 'CLASS_D')).toBe(true);
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

describe('outsourcingEligibility', () => {
  // Module 2 records this score against every component. It is a separate judgement from
  // criticality: a low-class part can still be one engineering does not want sent out.
  it('allows a component scored at or above the floor', () => {
    expect(outsourcingEligibility(40).eligible).toBe(true);
    expect(outsourcingEligibility(85).eligible).toBe(true);
  });

  it('refuses one scored below it, and says why', () => {
    const verdict = outsourcingEligibility(15);
    expect(verdict.eligible).toBe(false);
    expect(verdict.reason).toMatch(/scores 15/);
    expect(verdict.reason).toMatch(/poor candidate/);
  });

  it('treats an unscored component as unjudged rather than refused', () => {
    expect(outsourcingEligibility(undefined).eligible).toBe(true);
    expect(outsourcingEligibility(null).eligible).toBe(true);
    expect(outsourcingEligibility(Number.NaN).eligible).toBe(true);
  });

  it('gives an eligible component no reason to show', () => {
    expect(outsourcingEligibility(70).reason).toBeNull();
  });
});

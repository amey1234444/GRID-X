import { earnedIncentives, performanceForJobs, type IncentiveRule } from '@gridx/shared';

/**
 * Module 11 pays incentives as well as taking deductions. These pin down the half of the formula
 * that previously never executed: rules existed, were editable, and were never once evaluated.
 */

const qualityRule: IncentiveRule = {
  id: 'r1',
  type: 'QUALITY_INCENTIVE',
  name: 'First-pass quality bonus',
  percentage: 2,
  thresholdPercent: 98,
};

const deliveryRule: IncentiveRule = {
  id: 'r2',
  type: 'ON_TIME_DELIVERY_INCENTIVE',
  name: 'On-time delivery bonus',
  fixedAmount: 500,
  thresholdPercent: 95,
};

describe('performanceForJobs', () => {
  const due = new Date('2026-08-10');

  it('measures first-pass quality across the invoiced jobs', () => {
    const result = performanceForJobs([
      { acceptedQuantity: 98, rejectedQuantity: 2, dueDate: due, completedAt: due },
    ]);
    expect(result.firstPassQualityPercent).toBe(98);
  });

  it('measures on-time delivery against each job s own due date', () => {
    const late = new Date('2026-08-14');
    const result = performanceForJobs([
      { acceptedQuantity: 10, rejectedQuantity: 0, dueDate: due, completedAt: due },
      { acceptedQuantity: 10, rejectedQuantity: 0, dueDate: due, completedAt: late },
    ]);
    expect(result.onTimeDeliveryPercent).toBe(50);
  });

  it('counts delivery on the due date itself as on time', () => {
    const result = performanceForJobs([
      { acceptedQuantity: 1, rejectedQuantity: 0, dueDate: due, completedAt: due },
    ]);
    expect(result.onTimeDeliveryPercent).toBe(100);
  });

  it('reports nothing measurable rather than a perfect score', () => {
    const result = performanceForJobs([
      { acceptedQuantity: 0, rejectedQuantity: 0, dueDate: null, completedAt: null },
    ]);
    expect(result.firstPassQualityPercent).toBeNull();
    expect(result.onTimeDeliveryPercent).toBeNull();
  });
});

describe('earnedIncentives', () => {
  const perfect = { firstPassQualityPercent: 100, onTimeDeliveryPercent: 100 };

  it('pays a percentage rule on the basic amount', () => {
    const [earned] = earnedIncentives([qualityRule], perfect, 100_000);
    expect(earned.amount).toBe(2000);
    expect(earned.type).toBe('QUALITY_INCENTIVE');
  });

  it('pays a fixed rule at its face value', () => {
    const [earned] = earnedIncentives([deliveryRule], perfect, 100_000);
    expect(earned.amount).toBe(500);
  });

  it('adds the two together when a rule carries both', () => {
    const both: IncentiveRule = { ...qualityRule, fixedAmount: 250 };
    const [earned] = earnedIncentives([both], perfect, 100_000);
    expect(earned.amount).toBe(2250);
  });

  it('withholds the rule when performance is below the threshold', () => {
    const below = { firstPassQualityPercent: 97.9, onTimeDeliveryPercent: 100 };
    expect(earnedIncentives([qualityRule], below, 100_000)).toEqual([]);
  });

  it('pays when performance lands exactly on the threshold', () => {
    const exact = { firstPassQualityPercent: 98, onTimeDeliveryPercent: 100 };
    expect(earnedIncentives([qualityRule], exact, 100_000)).toHaveLength(1);
  });

  it('withholds every rule when there is nothing to measure', () => {
    const nothing = { firstPassQualityPercent: null, onTimeDeliveryPercent: null };
    expect(earnedIncentives([qualityRule, deliveryRule], nothing, 100_000)).toEqual([]);
  });

  it('leaves a rule with no threshold to be awarded by hand', () => {
    const manual: IncentiveRule = { ...qualityRule, thresholdPercent: null };
    expect(earnedIncentives([manual], perfect, 100_000)).toEqual([]);
  });

  it('never treats a deduction type as an incentive', () => {
    const deduction: IncentiveRule = {
      id: 'r3',
      type: 'REWORK_DEDUCTION',
      name: 'Rework',
      percentage: 5,
      thresholdPercent: 0,
    };
    expect(earnedIncentives([deduction], perfect, 100_000)).toEqual([]);
  });

  it('explains what was achieved against what was required', () => {
    const [earned] = earnedIncentives([qualityRule], perfect, 100_000);
    expect(earned.label).toContain('100.0%');
    expect(earned.label).toContain('98%');
  });

  it('skips a rule that would pay nothing', () => {
    const empty: IncentiveRule = { ...qualityRule, percentage: 0, fixedAmount: 0 };
    expect(earnedIncentives([empty], perfect, 100_000)).toEqual([]);
  });
});

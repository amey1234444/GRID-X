import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ScorecardsService } from './scorecards.service';

/** The month that has just ended, in the server's timezone. */
export function previousMonth(now = new Date()): { periodMonth: number; periodYear: number } {
  const month = now.getMonth(); // 0-indexed, so this is already last month's 1-indexed number
  return month === 0
    ? { periodMonth: 12, periodYear: now.getFullYear() - 1 }
    : { periodMonth: month, periodYear: now.getFullYear() };
}

/**
 * Module 12 and Section 22 — "each partner should receive a monthly score" and "partner scorecards
 * are automatically calculated". Scores the month that has just closed, for every active partner,
 * on the first of the month.
 *
 * Computing is idempotent: the score row is upserted on (partner, year, month), so a re-run
 * overwrites rather than duplicating. That makes a manual re-run after late data entry safe.
 */
@Injectable()
export class ScorecardsScheduler {
  private readonly logger = new Logger(ScorecardsScheduler.name);

  constructor(private readonly scorecards: ScorecardsService) {}

  // 02:00 on the 1st of every month — after month-end data entry, before the working day.
  @Cron('0 2 1 * *', { name: 'monthly-partner-scorecards' })
  async runMonthlyScorecards(): Promise<number> {
    const period = previousMonth();
    this.logger.log(
      `Computing partner scorecards for ${period.periodMonth}/${period.periodYear}`,
    );
    try {
      const results = await this.scorecards.compute(null, period);
      this.logger.log(`Published ${results.length} partner scorecard(s)`);
      return results.length;
    } catch (error) {
      // A failed month must not take the API down; the run can be repeated from the UI.
      this.logger.error(
        `Monthly scorecard run failed for ${period.periodMonth}/${period.periodYear}: ${String(error)}`,
      );
      return 0;
    }
  }
}

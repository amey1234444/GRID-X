import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ImsService } from './ims.service';

/**
 * Section 10 — keeps the outbound half of the IMS boundary honest.
 *
 * Facts GRID-X owes IMS (job status, material issued, rejected quantities, conversion cost,
 * invoices, completion dates) are logged the moment they happen and delivered here. Running on a
 * schedule rather than inline means an IMS outage delays the sync instead of blocking production.
 */
@Injectable()
export class ImsScheduler {
  private readonly logger = new Logger(ImsScheduler.name);

  constructor(private readonly ims: ImsService) {}

  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'ims-outbound-retry' })
  async retryOutbound(): Promise<void> {
    if (!this.ims.status().configured) return;
    try {
      await this.ims.retryFailedPushes();
    } catch (error) {
      // A failed sweep must not take the API down; the next tick tries again.
      this.logger.error(`IMS outbound retry sweep failed: ${String(error)}`);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SchedulerLockService } from '../common/scheduler-lock.service';
import { ImsService } from './ims.service';

/**
 * Section 10 — keeps both halves of the IMS boundary honest.
 *
 * Outbound: facts GRID-X owes IMS (job status, material issued, rejected quantities, conversion
 * cost, invoices, completion dates) are logged the moment they happen and delivered here. Running
 * on a schedule rather than inline means an IMS outage delays the sync instead of blocking
 * production.
 *
 * Inbound: masters (companies, items, products) are pulled incrementally, so a component added in
 * IMS this morning is available to a planner this afternoon without anyone clicking anything. Only
 * the direct-database driver enables this by default — an incremental read over HTTP depends on
 * the IMS honouring a `since` parameter, which is its choice to make, not ours to assume.
 */
@Injectable()
export class ImsScheduler {
  private readonly logger = new Logger(ImsScheduler.name);

  constructor(
    private readonly ims: ImsService,
    private readonly locks: SchedulerLockService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'ims-outbound-retry' })
  async retryOutbound(): Promise<void> {
    if (!this.ims.status().configured) return;

    // Two instances sweeping together would hand IMS the same fact twice and burn the retry
    // budget at double rate (Section 18 — scalability).
    await this.locks.runExclusively('ims-outbound-retry', 540, async () => {
      try {
        await this.ims.retryFailedPushes();
      } catch (error) {
        // A failed sweep must not take the API down; the next tick tries again.
        this.logger.error(`IMS outbound retry sweep failed: ${String(error)}`);
      }
    });
  }

  @Cron(CronExpression.EVERY_30_MINUTES, { name: 'ims-inbound-sync' })
  async syncInbound(): Promise<void> {
    const status = this.ims.status();
    if (!status.configured || !status.inboundSyncEnabled) return;

    await this.locks.runExclusively('ims-inbound-sync', 1740, async () => {
      try {
        const summaries = await this.ims.syncAll();
        const changed = summaries.reduce(
          (total, summary) => total + summary.created + summary.updated,
          0,
        );
        if (changed > 0) {
          this.logger.log(
            `IMS inbound sync: ${summaries
              .map((s) => `${s.entity} +${s.created}/~${s.updated}`)
              .join(', ')}`,
          );
        }
      } catch (error) {
        this.logger.error(`IMS inbound sync sweep failed: ${String(error)}`);
      }
    });
  }
}

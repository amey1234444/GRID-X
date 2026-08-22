import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Makes scheduled work safe to run on more than one API instance (Section 18 — scalability).
 *
 * Every cron job in GRID-X does something that must happen exactly once a period: publish a
 * month's scorecards, send an overdue-milestone alert, push a delivery to IMS. Nest's scheduler
 * fires on every instance that is running, so the moment the API is scaled past one the same work
 * is done two or three times over — duplicate scorecards, partners alerted repeatedly, IMS handed
 * the same fact twice.
 *
 * A run claims a named lock before doing anything. The claim is a single conditional UPDATE, so
 * two instances racing cannot both win, and it carries an expiry so an instance that dies
 * mid-run releases the lock instead of blocking that job for ever.
 */
@Injectable()
export class SchedulerLockService {
  private readonly logger = new Logger(SchedulerLockService.name);
  /** Identifies this process in the lock row, so a stuck lock names its holder. */
  private readonly instanceId = process.env.RENDER_INSTANCE_ID ?? randomUUID();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs `work` only if this instance wins the lock.
   *
   * `leaseSeconds` should comfortably exceed the job's normal runtime: too short and a second
   * instance may start while the first is still going.
   */
  async runExclusively(
    name: string,
    leaseSeconds: number,
    work: () => Promise<void>,
  ): Promise<boolean> {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + leaseSeconds * 1000);

    if (!(await this.claim(name, now, lockedUntil))) {
      this.logger.debug(`${name} is running on another instance; skipping`);
      return false;
    }

    try {
      await work();
      return true;
    } finally {
      // Release early so a retry is not made to wait out the whole lease.
      await this.prisma.schedulerLock
        .update({
          where: { name },
          data: { lockedUntil: new Date(), lastRunAt: new Date() },
        })
        .catch(() => {
          /* the lease expiring is a sufficient fallback */
        });
    }
  }

  /**
   * Takes the lock if it is free or expired.
   *
   * The insert races against other instances on the primary key, and the update is guarded on
   * `lockedUntil` so only one instance can move a live lock. Both losing cases are ordinary.
   */
  private async claim(name: string, now: Date, lockedUntil: Date): Promise<boolean> {
    try {
      await this.prisma.schedulerLock.create({
        data: { name, holder: this.instanceId, lockedUntil },
      });
      return true;
    } catch {
      // The row already exists, so fall through to taking it over if the lease has lapsed.
    }

    const taken = await this.prisma.schedulerLock.updateMany({
      where: { name, lockedUntil: { lte: now } },
      data: { holder: this.instanceId, lockedUntil },
    });
    return taken.count === 1;
  }
}

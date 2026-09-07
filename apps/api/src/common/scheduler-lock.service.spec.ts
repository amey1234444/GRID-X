import { SchedulerLockService } from './scheduler-lock.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Section 18 asks the architecture to scale. Nest's scheduler fires on every running instance, so
 * without a claim the monthly scorecard run publishes twice on two instances and every partner is
 * notified twice. These cover the claim itself.
 */
interface Row {
  name: string;
  holder: string;
  lockedUntil: Date;
}

/** A stand-in for the lock table that enforces the same primary key and guarded update. */
function lockTable(seed: Row[] = []) {
  const rows = new Map<string, Row>(seed.map((row) => [row.name, row]));
  return {
    rows,
    prisma: {
      schedulerLock: {
        create: ({ data }: { data: Row }) => {
          if (rows.has(data.name)) return Promise.reject(new Error('unique constraint'));
          rows.set(data.name, { ...data });
          return Promise.resolve(data);
        },
        updateMany: ({
          where,
          data,
        }: {
          where: { name: string; lockedUntil: { lte: Date } };
          data: Partial<Row>;
        }) => {
          const row = rows.get(where.name);
          if (!row || row.lockedUntil > where.lockedUntil.lte) {
            return Promise.resolve({ count: 0 });
          }
          rows.set(where.name, { ...row, ...data });
          return Promise.resolve({ count: 1 });
        },
        update: ({ where, data }: { where: { name: string }; data: Partial<Row> }) => {
          const row = rows.get(where.name);
          if (row) rows.set(where.name, { ...row, ...data });
          return Promise.resolve(row);
        },
      },
    } as unknown as PrismaService,
  };
}

describe('SchedulerLockService', () => {
  it('runs the work when the lock is free', async () => {
    const table = lockTable();
    const service = new SchedulerLockService(table.prisma);
    const work = jest.fn().mockResolvedValue(undefined);

    await expect(service.runExclusively('nightly', 60, work)).resolves.toBe(true);
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('lets only one of two instances run the same job', async () => {
    const table = lockTable();
    const first = new SchedulerLockService(table.prisma);
    const second = new SchedulerLockService(table.prisma);

    const ran: string[] = [];
    // The second claim is attempted while the first still holds the lease.
    await first.runExclusively('scorecards', 600, async () => {
      ran.push('first');
      await second.runExclusively('scorecards', 600, async () => {
        ran.push('second');
      });
    });

    expect(ran).toEqual(['first']);
  });

  it('takes over a lock whose lease has lapsed, so a crash does not block the job for ever', async () => {
    const table = lockTable([
      { name: 'ims', holder: 'dead-instance', lockedUntil: new Date(Date.now() - 60_000) },
    ]);
    const service = new SchedulerLockService(table.prisma);
    const work = jest.fn().mockResolvedValue(undefined);

    await expect(service.runExclusively('ims', 300, work)).resolves.toBe(true);
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('will not take over a lock that is still live', async () => {
    const table = lockTable([
      { name: 'ims', holder: 'other-instance', lockedUntil: new Date(Date.now() + 60_000) },
    ]);
    const service = new SchedulerLockService(table.prisma);
    const work = jest.fn().mockResolvedValue(undefined);

    await expect(service.runExclusively('ims', 300, work)).resolves.toBe(false);
    expect(work).not.toHaveBeenCalled();
  });

  it('releases the lock even when the work throws', async () => {
    const table = lockTable();
    const service = new SchedulerLockService(table.prisma);

    await expect(
      service.runExclusively('alerts', 600, () => Promise.reject(new Error('sweep failed'))),
    ).rejects.toThrow('sweep failed');

    // Released, so the next tick is not made to wait out the lease.
    expect(table.rows.get('alerts')!.lockedUntil.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('lets the next run proceed after a release', async () => {
    const table = lockTable();
    const service = new SchedulerLockService(table.prisma);

    await service.runExclusively('alerts', 600, async () => {});
    await expect(service.runExclusively('alerts', 600, async () => {})).resolves.toBe(true);
  });
});

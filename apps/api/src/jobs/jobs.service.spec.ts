import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PERMISSIONS } from '@gridx/shared';
import { JobsService } from './jobs.service';
import { RequestUser } from '../common/request-user';

const OSWAR = 'company-oswar';
const OSWAL = 'company-oswal';

function user(overrides: Partial<RequestUser> = {}): RequestUser {
  return {
    id: 'user-planner',
    name: 'Planner',
    email: 'planner@oswar.example',
    phone: null,
    userType: 'INTERNAL',
    roleCode: 'OPERATIONS_HEAD',
    permissions: [PERMISSIONS.JOB_CREATE, PERMISSIONS.JOB_ALLOCATE],
    partnerId: null,
    companyIds: [OSWAR],
    defaultCompanyId: OSWAR,
    ...overrides,
  };
}

const gridxHead = user({
  id: 'user-head',
  roleCode: 'GRIDX_HEAD',
  permissions: [PERMISSIONS.JOB_CREATE, PERMISSIONS.JOB_CLASS_A_OVERRIDE],
});

/** Each model is a bag of jest mocks standing in for the Prisma delegate. */
type PrismaMock = Record<string, Record<string, jest.Mock>>;

interface Mocks {
  prisma: PrismaMock;
  capacity: Record<string, jest.Mock>;
  files: Record<string, jest.Mock>;
  notifications: Record<string, jest.Mock>;
}

function build(overrides: PrismaMock = {}): { service: JobsService } & Mocks {
  const prisma: PrismaMock = {
    component: { findUniqueOrThrow: jest.fn() },
    gridJob: { findUniqueOrThrow: jest.fn(), create: jest.fn(), update: jest.fn() },
    jobMilestone: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
    jobDelay: { create: jest.fn() },
    inspection: { findFirst: jest.fn().mockResolvedValue(null) },
    ...overrides,
  };
  const capacity = {
    estimatedHours: jest.fn().mockResolvedValue(12),
    processForComponent: jest.fn().mockResolvedValue('process-1'),
    reserve: jest.fn(),
    release: jest.fn().mockResolvedValue(1),
  };
  const files = { attachPhotographs: jest.fn(), photographsFor: jest.fn().mockResolvedValue([]) };
  const notifications = { notify: jest.fn() };
  const audit = { record: jest.fn() };
  const sequence = { next: jest.fn().mockResolvedValue('JOB-00001') };
  const ims = { pushInBackground: jest.fn() };
  // Module 3 — the acknowledgement gate. Satisfied by default so milestone tests exercise the
  // milestone rules; the gate itself is covered where it is enforced.
  const drawings = { assertRevisionAcknowledged: jest.fn().mockResolvedValue(undefined) };

  const service = new JobsService(
    prisma as never,
    audit as never,
    sequence as never,
    files as never,
    notifications as never,
    capacity as never,
    ims as never,
    drawings as never,
  );
  return { service, prisma, capacity, files, notifications };
}

describe('JobsService — Class A authorisation (Module 2)', () => {
  it('refuses a Class A job with no documented reason', async () => {
    const { service, prisma } = build();
    prisma.component.findUniqueOrThrow.mockResolvedValue({
      id: 'c1',
      companyId: OSWAR,
      criticality: 'CLASS_A',
    });

    await expect(
      service.create(user(), { componentId: 'c1', companyId: OSWAR } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuses a Class A job when the actor lacks senior authorisation, reason or not', async () => {
    const { service, prisma } = build();
    prisma.component.findUniqueOrThrow.mockResolvedValue({
      id: 'c1',
      companyId: OSWAR,
      criticality: 'CLASS_A',
    });

    await expect(
      service.create(user(), {
        componentId: 'c1',
        companyId: OSWAR,
        classAOverrideReason: 'Capacity crunch',
      } as never),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows a Class A job when a holder of job:class_a_override documents the reason', async () => {
    const { service, prisma } = build();
    prisma.component.findUniqueOrThrow.mockResolvedValue({
      id: 'c1',
      companyId: OSWAR,
      criticality: 'CLASS_A',
    });
    prisma.gridJob.create.mockResolvedValue({ id: 'j1', companyId: OSWAR, jobNumber: 'JOB-00001' });

    await expect(
      service.create(gridxHead, {
        componentId: 'c1',
        companyId: OSWAR,
        classAOverrideReason: 'Authorised by the GRID-X Head for the Nagpur trial',
      } as never),
    ).resolves.toMatchObject({ id: 'j1' });
    expect(prisma.gridJob.create).toHaveBeenCalled();
  });

  it('leaves Class C components alone', async () => {
    const { service, prisma } = build();
    prisma.component.findUniqueOrThrow.mockResolvedValue({
      id: 'c1',
      companyId: OSWAR,
      criticality: 'CLASS_C',
    });
    prisma.gridJob.create.mockResolvedValue({ id: 'j1', companyId: OSWAR, jobNumber: 'JOB-00001' });

    await expect(
      service.create(user(), { componentId: 'c1', companyId: OSWAR } as never),
    ).resolves.toMatchObject({ id: 'j1' });
  });
});

describe('JobsService — company isolation (Section 4)', () => {
  it('refuses to raise a job for a company the planner is not linked to', async () => {
    const { service } = build();
    await expect(
      service.create(user(), { componentId: 'c1', companyId: OSWAL } as never),
    ).rejects.toThrow(ForbiddenException);
  });

  it('refuses to raise a job against another company s component', async () => {
    const { service, prisma } = build();
    prisma.component.findUniqueOrThrow.mockResolvedValue({
      id: 'c1',
      companyId: OSWAL,
      criticality: 'CLASS_C',
    });

    await expect(
      service.create(user(), { componentId: 'c1', companyId: OSWAR } as never),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('JobsService — first article gate (Section 2)', () => {
  const job = {
    id: 'j1',
    companyId: OSWAR,
    partnerId: 'partner-1',
    dueDate: new Date('2026-12-31'),
    component: { inspectionLevel: 'LEVEL_3_FULL_DIMENSIONAL', criticality: 'CLASS_C' },
  };

  function withJob(extra: Record<string, unknown> = {}) {
    const mocks = build();
    mocks.prisma.gridJob.findUniqueOrThrow.mockResolvedValue({ ...job, ...extra });
    mocks.prisma.jobMilestone.create.mockResolvedValue({ id: 'm1', type: 'BATCH_25_PERCENT' });
    return mocks;
  }

  const partner = user({
    userType: 'PARTNER',
    roleCode: 'PARTNER_SUPERVISOR',
    partnerId: 'partner-1',
    companyIds: [],
    defaultCompanyId: null,
  });

  it('blocks batch progress when no first article has been raised', async () => {
    const { service } = withJob();
    await expect(
      service.updateMilestone(partner, 'j1', { type: 'BATCH_25_PERCENT' } as never),
    ).rejects.toThrow(/Request a first-article inspection/);
  });

  it('explains that the first article is still under inspection when one is open', async () => {
    const { service, prisma } = withJob();
    prisma.inspection.findFirst
      .mockResolvedValueOnce(null) // no accepted first article
      .mockResolvedValueOnce({ id: 'i1' }); // but one is in flight

    await expect(
      service.updateMilestone(partner, 'j1', { type: 'BATCH_READY_FOR_INSPECTION' } as never),
    ).rejects.toThrow(/still under inspection/);
  });

  it('allows batch progress once a first article is accepted', async () => {
    const { service, prisma } = withJob();
    prisma.inspection.findFirst.mockResolvedValueOnce({ id: 'i1' });

    await expect(
      service.updateMilestone(partner, 'j1', { type: 'BATCH_25_PERCENT' } as never),
    ).resolves.toMatchObject({ id: 'm1' });
  });

  it('never gates the milestones that come before the first article', async () => {
    const { service, prisma } = withJob();
    prisma.jobMilestone.create.mockResolvedValue({ id: 'm2', type: 'FIRST_PIECE_READY' });
    prisma.gridJob.update.mockResolvedValue({ id: 'j1', status: 'IN_PRODUCTION' });

    await expect(
      service.updateMilestone(partner, 'j1', {
        type: 'FIRST_PIECE_READY',
        // This milestone carries photographic evidence in its own right (Module 7).
        photographFileIds: ['file-1'],
      } as never),
    ).resolves.toBeDefined();
    expect(prisma.inspection.findFirst).not.toHaveBeenCalled();
  });

  it('waives the gate for level 1 visual work on a low-criticality component', async () => {
    const { service, prisma } = withJob({
      component: { inspectionLevel: 'LEVEL_1_VISUAL', criticality: 'CLASS_D' },
    });

    await expect(
      service.updateMilestone(partner, 'j1', { type: 'BATCH_25_PERCENT' } as never),
    ).resolves.toBeDefined();
    expect(prisma.inspection.findFirst).not.toHaveBeenCalled();
  });

  it('keeps the gate for a Class B component even at level 1', async () => {
    const { service } = withJob({
      component: { inspectionLevel: 'LEVEL_1_VISUAL', criticality: 'CLASS_B' },
    });

    await expect(
      service.updateMilestone(partner, 'j1', { type: 'BATCH_25_PERCENT' } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('replays an offline milestone without re-judging the gate', async () => {
    const { service, prisma } = withJob();
    prisma.jobMilestone.findUnique.mockResolvedValue({ id: 'm-existing' });

    await expect(
      service.updateMilestone(partner, 'j1', {
        type: 'BATCH_25_PERCENT',
        clientRequestId: 'offline-abc123',
      } as never),
    ).resolves.toMatchObject({ id: 'm-existing' });
    expect(prisma.inspection.findFirst).not.toHaveBeenCalled();
  });
});

describe('JobsService — progress evidence (Module 7)', () => {
  const job = {
    id: 'j1',
    companyId: OSWAR,
    partnerId: 'partner-1',
    materialResponsibility: 'OSWAR_SUPPLIED',
    dueDate: new Date('2026-12-31'),
    component: { inspectionLevel: 'LEVEL_1_VISUAL', criticality: 'CLASS_D' },
  };
  const partner = user({
    userType: 'PARTNER',
    roleCode: 'PARTNER_SUPERVISOR',
    partnerId: 'partner-1',
    companyIds: [],
    defaultCompanyId: null,
  });

  function withJob() {
    const mocks = build();
    mocks.prisma.gridJob.findUniqueOrThrow.mockResolvedValue(job);
    mocks.prisma.jobMilestone.create.mockResolvedValue({ id: 'm1' });
    mocks.prisma.gridJob.update.mockResolvedValue({ id: 'j1' });
    return mocks;
  }

  it('refuses a milestone that needs a photograph without one', async () => {
    const { service } = withJob();
    await expect(
      service.updateMilestone(partner, 'j1', { type: 'MATERIAL_RECEIVED' } as never),
    ).rejects.toThrow(/photograph is required/i);
  });

  it('refuses when the client sends an empty photograph list', async () => {
    const { service } = withJob();
    await expect(
      service.updateMilestone(partner, 'j1', {
        type: 'DISPATCHED',
        photographFileIds: [],
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts the milestone once evidence is attached', async () => {
    const { service, files } = withJob();
    await expect(
      service.updateMilestone(partner, 'j1', {
        type: 'MATERIAL_RECEIVED',
        photographFileIds: ['file-1'],
      } as never),
    ).resolves.toBeDefined();
    expect(files.attachPhotographs).toHaveBeenCalled();
  });

  it('leaves milestones that carry no evidence requirement alone', async () => {
    const { service } = withJob();
    await expect(
      service.updateMilestone(partner, 'j1', { type: 'BATCH_25_PERCENT' } as never),
    ).resolves.toBeDefined();
  });

  it('attributes an OSWAR-caused delay to OSWAR, not to whoever reported it', async () => {
    const { service, prisma } = withJob();
    await service.updateMilestone(partner, 'j1', {
      type: 'BATCH_25_PERCENT',
      delayReason: 'OSWAR_APPROVAL_PENDING',
    } as never);

    expect(prisma.jobDelay.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ responsibility: 'OSWAR' }),
      }),
    );
  });

  it('still attributes a partner-caused delay to the partner', async () => {
    const { service, prisma } = withJob();
    await service.updateMilestone(partner, 'j1', {
      type: 'BATCH_25_PERCENT',
      delayReason: 'MACHINE_BREAKDOWN',
    } as never);

    expect(prisma.jobDelay.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ responsibility: 'PARTNER' }),
      }),
    );
  });
});

describe('JobsService — capacity release (Module 5)', () => {
  it('gives the hours back when a job is cancelled', async () => {
    const { service, prisma, capacity } = build();
    prisma.gridJob.findUniqueOrThrow.mockResolvedValue({
      id: 'j1',
      companyId: OSWAR,
      partnerId: 'partner-1',
      status: 'IN_PRODUCTION',
    });
    prisma.gridJob.update.mockResolvedValue({ id: 'j1', status: 'CANCELLED' });

    await service.cancel(user(), 'j1', 'Customer pulled the order');
    expect(capacity.release).toHaveBeenCalledWith('j1');
  });
});

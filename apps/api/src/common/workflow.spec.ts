import { BadRequestException } from '@nestjs/common';
import { assertTransition } from './workflow';

type JobStatus = 'DRAFT' | 'ALLOCATED' | 'IN_PRODUCTION' | 'CLOSED';

const JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  DRAFT: ['ALLOCATED'],
  ALLOCATED: ['IN_PRODUCTION'],
  IN_PRODUCTION: ['CLOSED'],
  CLOSED: [],
};

describe('assertTransition', () => {
  it('permits a declared transition', () => {
    expect(() => assertTransition('Job', 'DRAFT', 'ALLOCATED', JOB_TRANSITIONS)).not.toThrow();
  });

  it('rejects skipping a stage', () => {
    expect(() => assertTransition('Job', 'DRAFT', 'CLOSED', JOB_TRANSITIONS)).toThrow(
      BadRequestException,
    );
  });

  it('rejects moving backwards', () => {
    expect(() => assertTransition('Job', 'CLOSED', 'DRAFT', JOB_TRANSITIONS)).toThrow(
      BadRequestException,
    );
  });

  it('treats a no-op transition as allowed so repeated saves are idempotent', () => {
    expect(() => assertTransition('Job', 'CLOSED', 'CLOSED', JOB_TRANSITIONS)).not.toThrow();
  });

  it('names the entity and the allowed targets in the error', () => {
    expect(() => assertTransition('Job', 'DRAFT', 'IN_PRODUCTION', JOB_TRANSITIONS)).toThrow(
      /Job cannot move from DRAFT to IN_PRODUCTION\. Allowed: ALLOCATED/,
    );
  });

  it('reports "none" from a terminal state', () => {
    expect(() => assertTransition('Job', 'CLOSED', 'ALLOCATED', JOB_TRANSITIONS)).toThrow(
      /Allowed: none/,
    );
  });
});

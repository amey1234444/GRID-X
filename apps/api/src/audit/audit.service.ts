import { Injectable } from '@nestjs/common';
import { Prisma } from '@gridx/db';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../common/request-user';

export interface AuditInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  companyId?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Section 18: every create, update and status change is written to an immutable audit log.
 * Financial and quality records are never deleted, only superseded, so the log is the history.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(actor: RequestUser | null, input: AuditInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: actor?.id ?? null,
        actorLabel: actor ? `${actor.name} (${actor.roleCode})` : 'SYSTEM',
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        companyId: input.companyId ?? actor?.defaultCompanyId ?? null,
        before: input.before ?? undefined,
        after: input.after ?? undefined,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }
}

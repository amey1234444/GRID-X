import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type SequenceKey =
  | 'PARTNER'
  | 'JOB'
  | 'CHALLAN'
  | 'INSPECTION'
  | 'NC'
  | 'CA'
  | 'REWORK'
  | 'SHIPMENT'
  | 'INVOICE'
  | 'EC'
  | 'TOOL';

const DEFAULT_PREFIX: Record<SequenceKey, string> = {
  PARTNER: 'GXP',
  JOB: 'GXJ',
  CHALLAN: 'GXC',
  INSPECTION: 'GXI',
  NC: 'GXNC',
  CA: 'GXCA',
  REWORK: 'GXRW',
  SHIPMENT: 'GXS',
  INVOICE: 'GXINV',
  EC: 'GXEC',
  TOOL: 'GXT',
};

/** Human readable, gap-free document numbers (job numbers, challans, invoice numbers). */
@Injectable()
export class SequenceService {
  constructor(private readonly prisma: PrismaService) {}

  async next(key: SequenceKey): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const sequence =
        (await tx.numberSequence.findUnique({ where: { key } })) ??
        (await tx.numberSequence.create({ data: { key, prefix: DEFAULT_PREFIX[key] } }));
      await tx.numberSequence.update({
        where: { id: sequence.id },
        data: { nextValue: sequence.nextValue + 1 },
      });
      return `${sequence.prefix}-${String(sequence.nextValue).padStart(sequence.padding, '0')}`;
    });
  }
}

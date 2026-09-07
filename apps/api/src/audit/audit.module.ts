import { Global, Module } from '@nestjs/common';
import { SettingsService } from '../common/settings.service';
import { AuditService } from './audit.service';
import { SequenceService } from './sequence.service';

/**
 * Cross-cutting services every module needs: the audit trail, document numbering, and the system
 * settings the configurable rules read.
 */
@Global()
@Module({
  providers: [AuditService, SequenceService, SettingsService],
  exports: [AuditService, SequenceService, SettingsService],
})
export class AuditModule {}

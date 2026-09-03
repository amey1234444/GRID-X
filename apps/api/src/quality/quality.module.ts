import { Module } from '@nestjs/common';
import { DrawingsModule } from '../drawings/drawings.module';
import { JobsModule } from '../jobs/jobs.module';
import { QualityController } from './quality.controller';
import { QualityService } from './quality.service';

@Module({
  // Module 3: work may not be offered for inspection against an unacknowledged revision.
  imports: [JobsModule, DrawingsModule],
  controllers: [QualityController],
  providers: [QualityService],
  exports: [QualityService],
})
export class QualityModule {}

import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { QualityController } from './quality.controller';
import { QualityService } from './quality.service';

@Module({
  imports: [JobsModule],
  controllers: [QualityController],
  providers: [QualityService],
  exports: [QualityService],
})
export class QualityModule {}

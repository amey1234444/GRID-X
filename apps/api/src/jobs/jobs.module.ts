import { Module } from '@nestjs/common';
import { CapacityModule } from '../capacity/capacity.module';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  // Module 5: allocating a job reserves the partner's declared hours, so jobs depends on capacity.
  imports: [CapacityModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}

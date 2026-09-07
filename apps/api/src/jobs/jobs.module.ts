import { Module } from '@nestjs/common';
import { CapacityModule } from '../capacity/capacity.module';
import { DrawingsModule } from '../drawings/drawings.module';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [
    // Module 5: allocating a job reserves the partner's declared hours, so jobs depends on capacity.
    CapacityModule,
    // Module 3: a partner cannot report production against a revision they have not acknowledged.
    DrawingsModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}

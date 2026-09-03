import { Global, Module } from '@nestjs/common';
import { SchedulerLockService } from '../common/scheduler-lock.service';
import { DatabaseImsDriver } from './drivers/database.driver';
import { DisabledImsDriver } from './drivers/disabled.driver';
import { HttpImsDriver } from './drivers/http.driver';
import { ImsController } from './ims.controller';
import { ImsDatabaseService } from './ims-database.service';
import { ImsScheduler } from './ims.scheduler';
import { ImsService } from './ims.service';

/**
 * Global because the modules that produce outbound facts — jobs, materials, quality, commercials —
 * all need to queue a push, and threading the import through each of them buys nothing.
 *
 * All three transports are constructed regardless of `IMS_DRIVER`: they are cheap (the database
 * pool is opened lazily on first query, not on boot), and having them all present is what lets
 * `IMS_WRITE_MODE=http` post facts while reads still come from the database.
 */
@Global()
@Module({
  controllers: [ImsController],
  providers: [
    ImsDatabaseService,
    DatabaseImsDriver,
    HttpImsDriver,
    DisabledImsDriver,
    ImsService,
    ImsScheduler,
    SchedulerLockService,
  ],
  exports: [ImsService, ImsDatabaseService],
})
export class ImsModule {}

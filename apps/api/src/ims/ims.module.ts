import { Global, Module } from '@nestjs/common';
import { ImsController } from './ims.controller';
import { ImsScheduler } from './ims.scheduler';
import { ImsService } from './ims.service';

/**
 * Global because the modules that produce outbound facts — jobs, materials, quality, commercials —
 * all need to queue a push, and threading the import through each of them buys nothing.
 */
@Global()
@Module({
  controllers: [ImsController],
  providers: [ImsService, ImsScheduler],
  exports: [ImsService],
})
export class ImsModule {}

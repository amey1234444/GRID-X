import { Module } from '@nestjs/common';
import { ImsController } from './ims.controller';
import { ImsService } from './ims.service';

@Module({
  controllers: [ImsController],
  providers: [ImsService],
  exports: [ImsService],
})
export class ImsModule {}

import { SchedulerLockService } from '../common/scheduler-lock.service';
import { Global, Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, AlertsService, SchedulerLockService],
  exports: [NotificationsService, AlertsService],
})
export class NotificationsModule {}

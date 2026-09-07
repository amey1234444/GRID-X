import { Module } from '@nestjs/common';
import { SentryService } from '../common/sentry.service';
import { HealthController } from './health.controller';

@Module({ controllers: [HealthController], providers: [SentryService] })
export class HealthModule {}

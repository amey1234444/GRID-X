import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { FilesModule } from './files/files.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionsGuard } from './auth/permissions.guard';
import { RateLimitGuard } from './common/rate-limit.guard';
import { SchedulerLockService } from './common/scheduler-lock.service';
import { SentryService } from './common/sentry.service';
import { PartnersModule } from './partners/partners.module';
import { MastersModule } from './masters/masters.module';
import { DrawingsModule } from './drawings/drawings.module';
import { JobsModule } from './jobs/jobs.module';
import { CapacityModule } from './capacity/capacity.module';
import { MaterialsModule } from './materials/materials.module';
import { QualityModule } from './quality/quality.module';
import { LogisticsModule } from './logistics/logistics.module';
import { CommercialsModule } from './commercials/commercials.module';
import { ToolingModule } from './tooling/tooling.module';
import { ScorecardsModule } from './scorecards/scorecards.module';
import { DashboardsModule } from './dashboards/dashboards.module';
import { ReportsModule } from './reports/reports.module';
import { ImsModule } from './ims/ims.module';
import { ImportsModule } from './imports/imports.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    JwtModule.register({}),
    PrismaModule,
    AuditModule,
    FilesModule,
    NotificationsModule,
    AuthModule,
    PartnersModule,
    MastersModule,
    DrawingsModule,
    JobsModule,
    CapacityModule,
    MaterialsModule,
    QualityModule,
    LogisticsModule,
    CommercialsModule,
    ToolingModule,
    ScorecardsModule,
    DashboardsModule,
    ReportsModule,
    ImsModule,
    ImportsModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    // Rate limiting runs first: credential stuffing should be rejected before
    // any token parsing or database work happens.
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    SentryService,
    SchedulerLockService,
  ],
  exports: [SentryService, SchedulerLockService],
})
export class AppModule {}

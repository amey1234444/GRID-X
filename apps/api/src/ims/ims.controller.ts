import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gridx/shared';
import { z } from 'zod';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { zodBody } from '../common/zod-validation.pipe';
import { RequestUser } from '../common/request-user';
import {
  IMS_INBOUND_ENTITIES,
  IMS_OUTBOUND_ENTITIES,
  IMS_PERSISTED_ENTITIES,
} from './ims.contract';
import { ImsService } from './ims.service';

const pullSchema = z.object({
  entity: z.enum(IMS_INBOUND_ENTITIES),
  records: z.array(z.unknown()).optional(),
  /** Read only rows changed since the stored watermark, rather than the whole table. */
  incremental: z.coerce.boolean().optional(),
});

const pushSchema = z.object({
  entity: z.enum(IMS_OUTBOUND_ENTITIES),
  recordRef: z.string().cuid(),
});

const logQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

const orderQuerySchema = z.object({
  entity: z.enum(['sales-orders', 'work-orders']).default('work-orders'),
  search: z.string().trim().min(1).optional(),
});

const previewQuerySchema = z.object({
  entity: z.enum(IMS_INBOUND_ENTITIES),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const stockQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

const cursorSchema = z.object({ entity: z.enum(IMS_INBOUND_ENTITIES) });

@ApiTags('IMS integration')
@Controller('ims')
export class ImsController {
  constructor(private readonly ims: ImsService) {}

  @Get('status')
  @RequirePermissions(PERMISSIONS.IMS_SYNC)
  status() {
    return this.ims.status();
  }

  /** Live probe: can GRID-X actually reach the IMS right now, and how quickly. */
  @Get('health')
  @RequirePermissions(PERMISSIONS.IMS_SYNC)
  health() {
    return this.ims.health();
  }

  @Get('entities')
  @RequirePermissions(PERMISSIONS.IMS_SYNC)
  entities() {
    return {
      inbound: IMS_INBOUND_ENTITIES,
      outbound: IMS_OUTBOUND_ENTITIES,
      persisted: IMS_PERSISTED_ENTITIES,
    };
  }

  /** The table/column mapping the direct driver reads through. */
  @Get('mapping')
  @RequirePermissions(PERMISSIONS.IMS_SYNC)
  mapping() {
    return this.ims.mapping();
  }

  /**
   * The mapping checked against the live IMS schema — which tables exist, which mapped columns
   * are missing, and what else the table has. This is the first thing to look at when a sync
   * returns nothing.
   */
  @Get('introspect')
  @RequirePermissions(PERMISSIONS.IMS_SYNC)
  introspect() {
    return this.ims.introspect();
  }

  /** Reads rows without persisting them, to confirm a mapping before enabling the sync. */
  @Get('preview')
  @RequirePermissions(PERMISSIONS.IMS_SYNC)
  preview(@Query(zodBody(previewQuerySchema)) query: z.infer<typeof previewQuerySchema>) {
    return this.ims.preview(query.entity, query.limit);
  }

  @Get('logs')
  @RequirePermissions(PERMISSIONS.IMS_SYNC)
  logs(@Query(zodBody(logQuerySchema)) query: z.infer<typeof logQuerySchema>) {
    return this.ims.listLogs(query.limit);
  }

  /** Per-entity incremental watermarks, so an operator can see how current each master is. */
  @Get('cursors')
  @RequirePermissions(PERMISSIONS.IMS_SYNC)
  cursors() {
    return this.ims.cursors();
  }

  @Post('cursors/reset')
  @RequirePermissions(PERMISSIONS.IMS_SYNC)
  resetCursor(@Body(zodBody(cursorSchema)) body: z.infer<typeof cursorSchema>) {
    return this.ims.resetCursor(body.entity);
  }

  @Post('pull')
  @RequirePermissions(PERMISSIONS.IMS_SYNC)
  pull(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(pullSchema)) body: z.infer<typeof pullSchema>,
  ) {
    return this.ims.pull(user, body.entity, body.records, { incremental: body.incremental });
  }

  /** Pulls every entity in `IMS_SYNC_ENTITIES` incrementally, without waiting for the scheduler. */
  @Post('sync')
  @RequirePermissions(PERMISSIONS.IMS_SYNC)
  sync(@CurrentUser() user: RequestUser) {
    return this.ims.syncAll(user);
  }

  @Post('push')
  @RequirePermissions(PERMISSIONS.IMS_SYNC)
  push(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(pushSchema)) body: z.infer<typeof pushSchema>,
  ) {
    return this.ims.push(user, body.entity, body.recordRef);
  }

  /** Replays outbound facts IMS has not accepted yet, without waiting for the scheduler. */
  @Post('retry')
  @RequirePermissions(PERMISSIONS.IMS_SYNC)
  retry() {
    return this.ims.retryFailedPushes();
  }

  /**
   * Module 4 — orders a planner can raise a job against. Read live from IMS; only the reference
   * is ever stored on the GRID-X job.
   */
  @Get('orders')
  @RequirePermissions(PERMISSIONS.JOB_CREATE)
  orders(@Query(zodBody(orderQuerySchema)) query: z.infer<typeof orderQuerySchema>) {
    return this.ims.lookupOrders(query.entity, query.search);
  }

  /**
   * Module 6 — live IMS stock, so a stores user can see whether a job's material exists before
   * raising an issue. Read-through: GRID-X never stores an IMS warehouse balance.
   */
  @Get('stock')
  @RequirePermissions(PERMISSIONS.MATERIAL_READ)
  stock(@Query(zodBody(stockQuerySchema)) query: z.infer<typeof stockQuerySchema>) {
    return this.ims.readStock(query.search, query.limit);
  }
}

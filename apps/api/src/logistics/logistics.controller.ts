import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  PERMISSIONS,
  createShipmentSchema,
  createVehicleSchema,
  paginationSchema,
  proofOfDeliverySchema,
  updateShipmentStatusSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { zodBody } from '../common/zod-validation.pipe';
import { RequestUser } from '../common/request-user';
import { LogisticsService } from './logistics.service';

const shipmentQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  statuses: z.string().optional(),
  direction: z.string().optional(),
  partnerId: z.string().optional(),
  pickupOverdue: z.coerce.boolean().optional(),
  deliveryOverdue: z.coerce.boolean().optional(),
});

@ApiTags('Logistics')
@Controller('logistics')
export class LogisticsController {
  constructor(private readonly logistics: LogisticsService) {}

  @Get('shipments')
  @RequirePermissions(PERMISSIONS.SHIPMENT_READ)
  list(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(shipmentQuerySchema)) query: z.infer<typeof shipmentQuerySchema>,
  ) {
    return this.logistics.list(user, query);
  }

  @Get('shipments/:id')
  @RequirePermissions(PERMISSIONS.SHIPMENT_READ)
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.logistics.findOne(user, id);
  }

  @Post('shipments')
  @RequirePermissions(PERMISSIONS.SHIPMENT_MANAGE)
  create(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(createShipmentSchema)) body: z.infer<typeof createShipmentSchema>,
  ) {
    return this.logistics.create(user, body);
  }

  @Patch('shipments/:id/status')
  @RequirePermissions(PERMISSIONS.SHIPMENT_MANAGE)
  updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(updateShipmentStatusSchema)) body: z.infer<typeof updateShipmentStatusSchema>,
  ) {
    return this.logistics.updateStatus(user, id, body);
  }

  @Post('shipments/:id/proof-of-delivery')
  @RequirePermissions(PERMISSIONS.SHIPMENT_MANAGE)
  pod(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(proofOfDeliverySchema)) body: z.infer<typeof proofOfDeliverySchema>,
  ) {
    return this.logistics.recordProofOfDelivery(user, id, body);
  }

  @Get('vehicles')
  @RequirePermissions(PERMISSIONS.SHIPMENT_READ)
  vehicles() {
    return this.logistics.listVehicles();
  }

  @Post('vehicles')
  @RequirePermissions(PERMISSIONS.SHIPMENT_MANAGE)
  createVehicle(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(createVehicleSchema)) body: z.infer<typeof createVehicleSchema>,
  ) {
    return this.logistics.createVehicle(user, body);
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  PERMISSIONS,
  approvePartnerComponentSchema,
  componentItemSchema,
  componentProcessSchema,
  createComponentSchema,
  createItemSchema,
  createProductSchema,
  paginationSchema,
  updateComponentSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { RequestUser } from '../common/request-user';
import { zodBody } from '../common/zod-validation.pipe';
import { MastersService } from './masters.service';

const componentQuerySchema = paginationSchema.extend({
  companyId: z.string().optional(),
  criticality: z.string().optional(),
  primaryProcess: z.string().optional(),
  productId: z.string().optional(),
});

@ApiTags('Engineering masters')
@Controller()
export class MastersController {
  constructor(private readonly masters: MastersService) {}

  @Get('components')
  @RequirePermissions(PERMISSIONS.COMPONENT_READ)
  listComponents(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(componentQuerySchema)) query: z.infer<typeof componentQuerySchema>,
  ) {
    return this.masters.listComponents(user, query);
  }

  @Get('components/:id')
  @RequirePermissions(PERMISSIONS.COMPONENT_READ)
  getComponent(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.masters.getComponent(user, id);
  }

  @Post('components')
  @RequirePermissions(PERMISSIONS.COMPONENT_MANAGE)
  createComponent(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(createComponentSchema)) body: z.infer<typeof createComponentSchema>,
  ) {
    return this.masters.createComponent(user, body);
  }

  @Patch('components/:id')
  @RequirePermissions(PERMISSIONS.COMPONENT_MANAGE)
  updateComponent(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(updateComponentSchema)) body: z.infer<typeof updateComponentSchema>,
  ) {
    return this.masters.updateComponent(user, id, body);
  }

  @Post('components/:id/processes')
  @RequirePermissions(PERMISSIONS.COMPONENT_MANAGE)
  setProcess(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(componentProcessSchema)) body: z.infer<typeof componentProcessSchema>,
  ) {
    return this.masters.setComponentProcess(user, id, body);
  }

  @Delete('components/processes/:id')
  @RequirePermissions(PERMISSIONS.COMPONENT_MANAGE)
  removeProcess(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.masters.removeComponentProcess(user, id);
  }

  @Post('components/:id/items')
  @RequirePermissions(PERMISSIONS.COMPONENT_MANAGE)
  setItem(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(componentItemSchema)) body: z.infer<typeof componentItemSchema>,
  ) {
    return this.masters.setComponentItem(user, id, body);
  }

  @Delete('components/items/:id')
  @RequirePermissions(PERMISSIONS.COMPONENT_MANAGE)
  removeItem(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.masters.removeComponentItem(user, id);
  }

  @Post('components/:id/approved-partners')
  @RequirePermissions(PERMISSIONS.COMPONENT_MANAGE)
  approvePartner(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(approvePartnerComponentSchema))
    body: z.infer<typeof approvePartnerComponentSchema>,
  ) {
    return this.masters.approvePartnerForComponent(user, id, body);
  }

  @Delete('components/approved-partners/:id')
  @RequirePermissions(PERMISSIONS.COMPONENT_MANAGE)
  revokePartner(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.masters.revokePartnerForComponent(user, id);
  }

  @Get('items')
  @RequirePermissions(PERMISSIONS.ITEM_READ)
  listItems(@Query(zodBody(paginationSchema)) query: z.infer<typeof paginationSchema>) {
    return this.masters.listItems(query);
  }

  @Post('items')
  @RequirePermissions(PERMISSIONS.ITEM_MANAGE)
  createItem(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(createItemSchema)) body: z.infer<typeof createItemSchema>,
  ) {
    return this.masters.createItem(user, body);
  }

  @Get('products')
  @RequirePermissions(PERMISSIONS.COMPONENT_READ)
  listProducts(@CurrentUser() user: RequestUser, @Query('companyId') companyId?: string) {
    return this.masters.listProducts(user, companyId);
  }

  @Post('products')
  @RequirePermissions(PERMISSIONS.COMPONENT_MANAGE)
  createProduct(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(createProductSchema)) body: z.infer<typeof createProductSchema>,
  ) {
    return this.masters.createProduct(user, body);
  }

  @Get('processes')
  @RequirePermissions(PERMISSIONS.COMPONENT_READ)
  listProcesses() {
    return this.masters.listProcesses();
  }

  @Patch('processes/:id')
  @RequirePermissions(PERMISSIONS.PROCESS_MANAGE)
  updateProcess(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(zodBody(z.object({ standardRatePerHour: z.coerce.number().min(0) })))
    body: { standardRatePerHour: number },
  ) {
    return this.masters.updateProcessRate(user, id, body.standardRatePerHour);
  }
}

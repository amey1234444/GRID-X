import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import { RequestUser } from '../common/request-user';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  async list(@CurrentUser() user: RequestUser, @Query('unread') unread?: string) {
    const items = await this.prisma.notification.findMany({
      where: {
        userId: user.id,
        channel: 'IN_APP',
        ...(unread === 'true' ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const unreadCount = await this.prisma.notification.count({
      where: { userId: user.id, channel: 'IN_APP', readAt: null },
    });
    return { data: items, unreadCount };
  }

  @Post(':id/read')
  async read(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    await this.notifications.markRead(user.id, id);
    return { success: true };
  }

  @Post('read-all')
  async readAll(@CurrentUser() user: RequestUser) {
    await this.notifications.markAllRead(user.id);
    return { success: true };
  }
}

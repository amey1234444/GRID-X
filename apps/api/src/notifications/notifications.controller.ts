import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { paginationSchema } from '@gridx/shared';
import { z } from 'zod';
import { CurrentUser } from '../common/decorators';
import { RequestUser } from '../common/request-user';
import { zodBody } from '../common/zod-validation.pipe';
import { paginate, paginationArgs } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

// z.coerce.boolean() turns the string "false" into true, so the flag is parsed
// explicitly instead. Accepted under both names: the web app has used
// `unreadOnly` since launch.
const flag = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform((value) => value === 'true' || value === '1');

const notificationQuerySchema = paginationSchema.extend({
  unread: flag,
  unreadOnly: flag,
});

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(notificationQuerySchema)) query: z.infer<typeof notificationQuerySchema>,
  ) {
    const where = {
      userId: user.id,
      channel: 'IN_APP' as const,
      ...(query.unread || query.unreadOnly ? { readAt: null } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        ...paginationArgs(query),
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId: user.id, channel: 'IN_APP', readAt: null },
      }),
    ]);

    return { ...paginate(items, total, query), unreadCount };
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

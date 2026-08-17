import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel, NotificationEvent, RoleCode } from '@gridx/db';
import { createTransport, Transporter } from 'nodemailer';
import { AppConfig } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';

export interface NotifyInput {
  event: NotificationEvent;
  title: string;
  body: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  userIds?: string[];
  partnerId?: string;
  roleCodes?: RoleCode[];
  channels?: NotificationChannel[];
}

/**
 * Section 13 — notification engine. In-app notifications are always stored; email and
 * WhatsApp are delivered when the corresponding channel is configured.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly settings: AppConfig['notifications'];
  private readonly mailer: Transporter | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const notifications = this.config.get<AppConfig['notifications']>('notifications');
    if (!notifications) throw new Error('Notification configuration missing');
    this.settings = notifications;
    this.mailer =
      notifications.emailEnabled && notifications.smtp.host
        ? createTransport({
            host: notifications.smtp.host,
            port: notifications.smtp.port,
            secure: notifications.smtp.port === 465,
            auth:
              notifications.smtp.user && notifications.smtp.password
                ? { user: notifications.smtp.user, pass: notifications.smtp.password }
                : undefined,
          })
        : null;
  }

  async notify(input: NotifyInput): Promise<void> {
    const recipients = await this.resolveRecipients(input);
    if (recipients.length === 0) return;

    const channels = input.channels ?? ['IN_APP'];
    for (const recipient of recipients) {
      for (const channel of channels) {
        const notification = await this.prisma.notification.create({
          data: {
            userId: recipient.id,
            event: input.event,
            channel,
            title: input.title,
            body: input.body,
            link: input.link ?? null,
            entityType: input.entityType ?? null,
            entityId: input.entityId ?? null,
            status: channel === 'IN_APP' ? 'SENT' : 'PENDING',
            sentAt: channel === 'IN_APP' ? new Date() : null,
          },
        });
        if (channel === 'EMAIL') {
          await this.deliverEmail(notification.id, recipient.email, input);
        }
        if (channel === 'WHATSAPP' || channel === 'SMS') {
          await this.deliverWhatsapp(notification.id, recipient.phone, input);
        }
      }
    }
  }

  /**
   * Sends a message straight to a phone without recording a notification — used
   * for login OTPs, which are credentials rather than something to sit in an inbox.
   * Returns false when the channel is not configured so callers can fall back.
   */
  async sendDirectMessage(phone: string, text: string): Promise<boolean> {
    const { apiUrl, apiToken } = this.settings.whatsapp;
    if (!this.settings.whatsappEnabled || !apiUrl || !apiToken) return false;
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ to: phone, text }),
      });
      if (!response.ok) throw new Error(`WhatsApp API responded ${response.status}`);
      return true;
    } catch (error) {
      this.logger.warn(`Direct message delivery failed: ${String(error)}`);
      return false;
    }
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date(), status: 'READ' },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date(), status: 'READ' },
    });
  }

  private async resolveRecipients(
    input: NotifyInput,
  ): Promise<Array<{ id: string; email: string | null; phone: string | null }>> {
    const users = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          input.userIds && input.userIds.length > 0 ? { id: { in: input.userIds } } : undefined,
          input.partnerId ? { partnerId: input.partnerId } : undefined,
          input.roleCodes && input.roleCodes.length > 0
            ? { role: { code: { in: input.roleCodes } } }
            : undefined,
        ].filter((clause): clause is NonNullable<typeof clause> => Boolean(clause)),
      },
      select: { id: true, email: true, phone: true },
    });
    return users;
  }

  private async deliverEmail(
    notificationId: string,
    email: string | null,
    input: NotifyInput,
  ): Promise<void> {
    if (!this.mailer || !email) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'FAILED', error: 'Email channel not configured' },
      });
      return;
    }
    try {
      await this.mailer.sendMail({
        from: this.settings.smtp.from,
        to: email,
        subject: input.title,
        text: input.body,
      });
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (error) {
      this.logger.warn(`Email delivery failed: ${String(error)}`);
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'FAILED', error: String(error) },
      });
    }
  }

  private async deliverWhatsapp(
    notificationId: string,
    phone: string | null,
    input: NotifyInput,
  ): Promise<void> {
    const { apiUrl, apiToken } = this.settings.whatsapp;
    if (!this.settings.whatsappEnabled || !apiUrl || !apiToken || !phone) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'FAILED', error: 'WhatsApp channel not configured' },
      });
      return;
    }
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ to: phone, text: `${input.title}\n\n${input.body}` }),
      });
      if (!response.ok) throw new Error(`WhatsApp API responded ${response.status}`);
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (error) {
      this.logger.warn(`WhatsApp delivery failed: ${String(error)}`);
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'FAILED', error: String(error) },
      });
    }
  }
}

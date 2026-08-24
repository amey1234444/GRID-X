import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel, NotificationEvent, RoleCode } from '@gridx/db';
import { channelsForEvent, deliverableChannels } from '@gridx/shared';
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
  /** Notification links are app-relative; an email has to carry somewhere clickable. */
  private readonly webAppUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const notifications = this.config.get<AppConfig['notifications']>('notifications');
    if (!notifications) throw new Error('Notification configuration missing');
    this.settings = notifications;
    this.webAppUrl = (this.config.get<string>('webAppUrl') ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
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

  /**
   * Section 13 — raises a notification on every channel the event warrants.
   *
   * The channel choice is a policy, not a per-call-site decision: it used to be, and the result was
   * that forty call sites each passed `['IN_APP']` or `['IN_APP','WHATSAPP']` and email — fully
   * implemented, configured in `.env` — was never once requested. `channelsForEvent` now decides,
   * and a caller overrides only where it genuinely differs.
   */
  async notify(input: NotifyInput): Promise<void> {
    const recipients = await this.resolveRecipients(input);
    if (recipients.length === 0) return;

    const requested = input.channels ?? channelsForEvent(input.event);
    for (const recipient of recipients) {
      // A partner worker with a phone and no email should not accumulate failed email rows: that
      // is not a misconfiguration, it is simply how that person is reachable.
      const channels = deliverableChannels(requested, recipient);
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

  /**
   * Sends an email without recording a notification — used for password reset links, which are
   * credentials rather than something to sit in an inbox and be read twice. Returns false when the
   * channel is not configured so the caller can fall back.
   */
  async sendDirectEmail(to: string, subject: string, text: string): Promise<boolean> {
    if (!this.mailer) return false;
    try {
      await this.mailer.sendMail({ from: this.settings.smtp.from, to, subject, text });
      return true;
    } catch (error) {
      this.logger.warn(`Direct email delivery failed: ${String(error)}`);
      return false;
    }
  }

  /** Whether email can actually be delivered, so a caller can tell a user what to expect. */
  get emailConfigured(): boolean {
    return this.mailer !== null;
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
        text: this.emailBody(input),
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

  /** The notification, plus an absolute link back into GRID-X where there is one. */
  private emailBody(input: NotifyInput): string {
    if (!input.link) return input.body;
    const url = input.link.startsWith('http')
      ? input.link
      : `${this.webAppUrl}${input.link.startsWith('/') ? '' : '/'}${input.link}`;
    return `${input.body}

Open in GRID-X: ${url}`;
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

import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Public } from '../common/decorators';
import { RequestUser } from '../common/request-user';
import { SentryService } from '../common/sentry.service';
import { zodBody } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';

/** Trimmed hard: this is unvalidated input from a browser, and only enough to debug is useful. */
const clientErrorSchema = z.object({
  message: z.string().trim().min(1).max(500),
  digest: z.string().trim().max(100).optional(),
  stack: z.string().max(4000).optional(),
  path: z.string().max(500).optional(),
});

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sentry: SentryService,
  ) {}

  @Get()
  @Public()
  async health(): Promise<{ status: string; database: string; uptimeSeconds: number }> {
    let database = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }
    return { status: database === 'up' ? 'ok' : 'degraded', database, uptimeSeconds: Math.round(process.uptime()) };
  }

  /**
   * Errors caught by the web application's React boundaries (Section 18 — error monitoring).
   *
   * Server-side failures already reach Sentry through the exception filter; a component that
   * throws while rendering in the browser never touched the API, so without this it is invisible.
   * The reconstructed error carries the browser stack, which is what makes it debuggable.
   */
  @Post('client-error')
  @Public()
  @HttpCode(204)
  reportClientError(
    @CurrentUser() user: RequestUser | undefined,
    @Body(zodBody(clientErrorSchema)) body: z.infer<typeof clientErrorSchema>,
  ): void {
    const error = new Error(body.message);
    error.name = 'WebClientError';
    if (body.stack) error.stack = body.stack;

    this.sentry.captureException(error, {
      path: body.path,
      userId: user?.id,
      method: 'CLIENT',
    });
  }
}

import { randomUUID } from 'node:crypto';
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { AuthedRequest } from './request-user';

/**
 * Structured request logging: every request gets a requestId (honouring the
 * caller's x-request-id when present), which is echoed back in the response
 * headers and included in the completion log line. Auth material and request
 * bodies are never logged.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('Request');

  use(request: AuthedRequest, response: Response, next: NextFunction): void {
    const incoming = request.headers['x-request-id'];
    const requestId = (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
    request.headers['x-request-id'] = requestId;
    response.setHeader('x-request-id', requestId);

    const startedAt = process.hrtime.bigint();

    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const entry = JSON.stringify({
        requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        durationMs: Math.round(durationMs * 10) / 10,
        userId: request.user?.id,
        role: request.user?.roleCode,
      });
      if (response.statusCode >= 500) this.logger.error(entry);
      else if (response.statusCode >= 400) this.logger.warn(entry);
      else this.logger.log(entry);
    });

    next();
  }
}

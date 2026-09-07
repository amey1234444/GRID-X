import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@gridx/db';
import { Response } from 'express';
import { AuthedRequest } from './request-user';
import { SentryService } from './sentry.service';

/** Converts framework, Prisma and unexpected errors into the ApiError shape the web app expects. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Http');

  constructor(private readonly sentry?: SentryService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<AuthedRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong';
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        message = payload;
      } else if (payload && typeof payload === 'object') {
        const body = payload as { message?: string | string[]; errors?: Record<string, string[]> };
        message = Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? message);
        errors = body.errors;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        const target = exception.meta?.target;
        message = `A record with this ${Array.isArray(target) ? target.join(', ') : 'value'} already exists`;
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
      } else if (exception.code === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Related record is missing';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = 'The request could not be completed';
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid request payload';
    }

    // 4xx is the client's problem and stays out of the error tracker; 5xx is ours.
    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url}`, exception as Error);
      this.sentry?.captureException(exception, {
        method: request.method,
        path: request.url,
        userId: request.user?.id,
        statusCode: status,
      });
    }

    const incoming = request.headers['x-request-id'];
    const requestId = Array.isArray(incoming) ? incoming[0] : incoming;

    response.status(status).json({
      statusCode: status,
      message,
      ...(errors ? { errors } : {}),
      ...(requestId ? { requestId } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

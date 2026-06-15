import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

// An EXCEPTION FILTER catches errors and shapes the HTTP response. @Catch limits
// it to HttpException (and subclasses like NotFoundException). Use @Catch() with
// no args to catch EVERYTHING. Registered globally in app.module.ts.
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      // HttpException's body is either a string or an object with `message`.
      error:
        typeof body === 'string'
          ? body
          : (body as { message: unknown }).message,
    });
  }
}

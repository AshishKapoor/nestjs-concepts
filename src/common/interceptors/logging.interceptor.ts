import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

// This interceptor measures how long each request takes. tap() runs a side
// effect when the Observable emits, without changing the value.
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const { method, url } = context.switchToHttp().getRequest();
    const start = Date.now();
    return next
      .handle()
      .pipe(
        tap(() => this.logger.log(`${method} ${url} +${Date.now() - start}ms`)),
      );
  }
}

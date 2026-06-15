import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// INTERCEPTORS wrap the handler — they can transform the RESULT (here) or the
// incoming call. next.handle() returns an RxJS Observable of the handler's
// return value; we map it into a consistent { data: ... } envelope.
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  { data: T }
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<{ data: T }> {
    return next.handle().pipe(map((data) => ({ data })));
  }
}

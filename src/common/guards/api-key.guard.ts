import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// A GUARD decides "can this request proceed?" — it returns true/false (or throws).
// Guards run AFTER middleware but BEFORE interceptors/pipes/the handler.
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Read the @Public() metadata off the handler or its controller class.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.header('x-api-key');
    const expected = this.config.get<string>(
      'API_KEY',
      process.env.API_KEY ?? '',
    );
    if (apiKey !== expected) {
      throw new UnauthorizedException('Invalid or missing x-api-key header');
    }

    // Attach a "user" so downstream @User() decorators / handlers can read it.
    (request as Request & { user?: unknown }).user = { name: 'Ashish Kapoor' };
    return true;
  }
}

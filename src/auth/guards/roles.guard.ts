import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtUser } from '../decorators/current-user.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

// Runs AFTER JwtAuthGuard, so request.user is already populated. It reads the
// @Roles() metadata and 403s if the authenticated user's role isn't allowed.
// Authorization (what you can do) is a separate concern from authentication
// (who you are) — hence a separate guard.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // No @Roles() on the route => any authenticated user may pass.
    if (!required || required.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest<{ user?: JwtUser }>();
    if (!user || !required.includes(user.role as UserRole)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}

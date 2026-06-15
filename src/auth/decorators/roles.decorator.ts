import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

// @Roles(UserRole.ADMIN) attaches the allowed roles as route metadata. The
// RolesGuard reads it back via the Reflector — same metadata+reflector pattern
// as @Public() from the fundamentals step.
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

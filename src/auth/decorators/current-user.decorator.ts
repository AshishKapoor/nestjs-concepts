import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// The shape JwtStrategy.validate() returns becomes request.user. This decorator
// hands it (or one field) to a handler: @CurrentUser() or @CurrentUser('email').
export interface JwtUser {
  userId: number;
  email: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: JwtUser }>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

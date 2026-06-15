import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
// `type` on JwtUser: it's used as a decorated param type, and with
// isolatedModules + emitDecoratorMetadata a pure type must be imported as such.
import { CurrentUser, type JwtUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from './entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // @Public() so these are reachable without a token. (If JwtAuthGuard were
  // applied globally, this is what would exempt them.)
  @Public()
  @Post('register') // POST /auth/register
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login') // POST /auth/login -> { accessToken }
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  // Protected: requires a valid Bearer token. @CurrentUser() reads what
  // JwtStrategy.validate() returned.
  @UseGuards(JwtAuthGuard)
  @Get('me') // GET /auth/me  (Authorization: Bearer <token>)
  me(@CurrentUser() user: JwtUser) {
    return user;
  }

  // Protected AND restricted: both guards run — JwtAuthGuard authenticates,
  // RolesGuard authorizes. A USER-role token gets 403 here; an ADMIN passes.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin') // GET /auth/admin
  adminOnly(@CurrentUser('email') email: string) {
    return { message: `Welcome, admin ${email}` };
  }
}

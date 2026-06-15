import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUser } from '../decorators/current-user.decorator';

// What we put INTO the token when signing (AuthService.login).
interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

// A Passport strategy named 'jwt'. AuthGuard('jwt') triggers it: it pulls the
// Bearer token, verifies the signature + expiry against our secret, and on
// success calls validate(). Whatever validate() returns becomes request.user.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Non-null assertion: the app refuses to boot without JWT_SECRET set
      // (and the config step adds schema validation to guarantee it).
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  // Runs only AFTER the signature is verified. We reshape the raw claims into the
  // JwtUser the rest of the app consumes. (A real app might re-load the user from
  // the DB here to catch deleted/disabled accounts.)
  validate(payload: JwtPayload): JwtUser {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}

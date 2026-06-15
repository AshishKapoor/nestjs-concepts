import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // gives AuthService a Repository<User>
    PassportModule,
    // registerAsync so the secret/expiry come from config (not hard-coded).
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>('JWT_SECRET'),
        // @nestjs/jwt types expiresIn via the `ms` StringValue union, so a plain
        // config string needs a cast to its own option type ('1h', '30m', 3600…).
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '1h') as NonNullable<
            JwtModuleOptions['signOptions']
          >['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  // JwtStrategy is a provider so Passport can discover the 'jwt' strategy.
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}

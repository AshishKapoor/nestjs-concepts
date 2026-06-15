import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { LifecycleService } from './common/lifecycle/lifecycle.service';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { dataSourceOptions } from './database/data-source';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    // isGlobal:true => ConfigService is injectable everywhere without re-importing.
    // It loads variables from `.env`, then runs them through our zod `validate`
    // function — a missing/invalid var fails the boot with a clear message.
    // (zod uses `validate`, not `validationSchema`, which is the Joi-only option.)
    // Unknown OS vars (PATH, HOME, …) are simply ignored: zod's .object() drops
    // keys it doesn't model rather than rejecting them.
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    // forRoot establishes the ONE database connection for the whole app. We reuse
    // the exact options the migration CLI uses (see src/database/data-source.ts)
    // so the running app and the schema migrations can never disagree.
    TypeOrmModule.forRoot(dataSourceOptions),
    // Enables @Cron/@Interval scheduling app-wide.
    ScheduleModule.forRoot(),
    // Global in-memory cache (CACHE_MANAGER injectable everywhere).
    CacheModule.register({ isGlobal: true }),
    // The Bull root connection to Redis (queues are registered per-feature).
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
        },
      }),
    }),
    AuthModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Registering global interceptors/filters via these tokens (instead of in
    // main.ts) lets them use dependency injection. APP_GUARD / APP_PIPE exist too.
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // Logs every lifecycle phase (startup + graceful shutdown) to make the
    // order visible. Shutdown hooks fire thanks to app.enableShutdownHooks().
    LifecycleService,
  ],
})
export class AppModule implements NestModule {
  // Middleware can't be registered with a decorator — you wire it here.
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}

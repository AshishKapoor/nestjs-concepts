import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // NestFactory builds the app from the root module, resolving the whole DI graph.
  const app = await NestFactory.create(AppModule);

  // ONE global pipe validates every @Body()/@Query()/@Param() against its DTO:
  //  - whitelist: strip properties with no validation decorator
  //  - forbidNonWhitelisted: 400 if the client sends unknown properties
  //  - transform: turn plain JSON into real DTO class instances + coerce types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Listen for SIGTERM/SIGINT and run lifecycle hooks (onModuleDestroy, etc.) on
  // shutdown. This is what lets TypeOrmModule close the Postgres connection pool
  // cleanly when the container is told to stop — otherwise the process just dies
  // and Postgres is left with idle backends to time out on its own.
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

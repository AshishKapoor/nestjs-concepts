import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  // Build the OpenAPI document from the app's routes + DTOs. The @nestjs/swagger
  // CLI plugin (enabled in nest-cli.json) auto-adds @ApiProperty to DTO fields
  // from their TS types + class-validator decorators, so the schemas are accurate
  // without hand-annotating every property. We register two security schemes so
  // the "Authorize" button works for both JWT routes and the x-api-key routes.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tasks API')
    .setDescription(
      'NestJS getting-started API — tasks, auth, config, and more.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'jwt', // name referenced by @ApiBearerAuth('jwt')
    )
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  // Interactive UI at /docs; raw spec at /docs-json.
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

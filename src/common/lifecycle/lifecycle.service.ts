import {
  BeforeApplicationShutdown,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

// A single provider implementing EVERY lifecycle hook, purely to make the order
// visible in the logs. In real code you'd implement only the one or two you need:
//   • onModuleInit          — this module's deps are ready (open connections, seed)
//   • onApplicationBootstrap — ALL modules are ready; app is about to listen
//   • onModuleDestroy        — release this module's resources
//   • beforeApplicationShutdown(signal) — last chance before teardown begins
//   • onApplicationShutdown(signal)     — app is closing (close pools/queues)
//
// The shutdown hooks only fire because main.ts calls app.enableShutdownHooks(),
// which listens for SIGTERM/SIGINT. This is the same machinery that lets
// TypeORM close its pool and Bull close its queues on a graceful stop.
@Injectable()
export class LifecycleService
  implements
    OnModuleInit,
    OnApplicationBootstrap,
    OnModuleDestroy,
    BeforeApplicationShutdown,
    OnApplicationShutdown
{
  private readonly logger = new Logger('Lifecycle');
  private bootstrappedAt = 0;

  // ---- startup (top → bottom) ----
  onModuleInit(): void {
    this.logger.log('startup 1/2 · onModuleInit — module deps ready');
  }

  onApplicationBootstrap(): void {
    this.bootstrappedAt = Date.now();
    this.logger.log(
      'startup 2/2 · onApplicationBootstrap — all modules ready, about to listen',
    );
  }

  // ---- shutdown (fires on SIGTERM/SIGINT via enableShutdownHooks) ----
  onModuleDestroy(): void {
    this.logger.log(
      'shutdown 1/3 · onModuleDestroy — releasing module resources',
    );
  }

  beforeApplicationShutdown(signal?: string): void {
    this.logger.log(
      `shutdown 2/3 · beforeApplicationShutdown (signal=${signal ?? 'n/a'})`,
    );
  }

  onApplicationShutdown(signal?: string): void {
    const uptimeSec = this.bootstrappedAt
      ? Math.round((Date.now() - this.bootstrappedAt) / 1000)
      : 0;
    this.logger.log(
      `shutdown 3/3 · onApplicationShutdown (signal=${signal ?? 'n/a'}) — up ~${uptimeSec}s, resources closed`,
    );
  }
}

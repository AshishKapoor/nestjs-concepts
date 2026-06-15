import { LifecycleService } from './lifecycle.service';

// These hooks only log, so the test just asserts they're implemented and run
// without throwing — including onApplicationShutdown both with and without a
// signal argument (Nest calls it with the signal name on SIGTERM/SIGINT).
describe('LifecycleService', () => {
  let service: LifecycleService;

  beforeEach(() => {
    service = new LifecycleService();
  });

  it('runs the startup hooks in order without error', () => {
    expect(() => service.onModuleInit()).not.toThrow();
    expect(() => service.onApplicationBootstrap()).not.toThrow();
  });

  it('runs the shutdown hooks, with and without a signal', () => {
    expect(() => service.onModuleDestroy()).not.toThrow();
    expect(() => service.beforeApplicationShutdown('SIGTERM')).not.toThrow();
    expect(() => service.onApplicationShutdown('SIGTERM')).not.toThrow();
    expect(() => service.onApplicationShutdown()).not.toThrow();
  });
});

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';

export interface TaskStats {
  total: number;
  generatedAt: string;
  cached: boolean;
}

// Demonstrates CACHING: getStats() is "expensive" (a DB COUNT), so we cache the
// result for a short window. Within that window repeated calls skip the DB and
// return the cached value — provable because `generatedAt` stays identical.
@Injectable()
export class TasksStatsService {
  private readonly logger = new Logger('TasksStats');
  private static readonly KEY = 'tasks:stats';
  private static readonly TTL_MS = 15_000; // cache-manager v7 ttl is milliseconds

  constructor(
    @InjectRepository(Task)
    private readonly tasks: Repository<Task>,
    // CACHE_MANAGER is provided by the global CacheModule (see AppModule).
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  async getStats(): Promise<TaskStats> {
    const hit = await this.cache.get<TaskStats>(TasksStatsService.KEY);
    if (hit) {
      this.logger.log('stats cache HIT');
      return { ...hit, cached: true };
    }
    this.logger.log('stats cache MISS — querying DB');
    const total = await this.tasks.count();
    const stats: TaskStats = {
      total,
      generatedAt: new Date().toISOString(),
      cached: false,
    };
    await this.cache.set(
      TasksStatsService.KEY,
      stats,
      TasksStatsService.TTL_MS,
    );
    return stats;
  }
}

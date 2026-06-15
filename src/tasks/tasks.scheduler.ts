import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TasksStatsService } from './tasks-stats.service';

// Demonstrates SCHEDULING: @Cron runs this method on a timer with no HTTP request
// involved. ScheduleModule.forRoot() (in AppModule) discovers it at startup.
@Injectable()
export class TasksScheduler {
  private readonly logger = new Logger('TasksCron');

  constructor(private readonly stats: TasksStatsService) {}

  // 6-field cron = "sec min hour day-of-month month day-of-week". This fires
  // every 5 seconds. (CronExpression has named constants for common schedules.)
  @Cron('*/5 * * * * *')
  async heartbeat(): Promise<void> {
    const { total } = await this.stats.getStats();
    this.logger.log(`heartbeat: ${total} task(s) in the DB`);
  }
}

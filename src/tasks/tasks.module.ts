import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { RemindersProcessor } from './reminders.processor';
import { RemindersService } from './reminders.service';
import { TasksController } from './tasks.controller';
import { TasksScheduler } from './tasks.scheduler';
import { TasksService } from './tasks.service';
import { TasksStatsService } from './tasks-stats.service';

// TypeOrmModule.forFeature([Task]) registers a Repository<Task>; BullModule
// .registerQueue makes the 'reminders' queue injectable here via @InjectQueue.
@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    BullModule.registerQueue({ name: 'reminders' }),
  ],
  controllers: [TasksController],
  providers: [
    TasksService,
    TasksStatsService, // cached stats
    TasksScheduler, // @Cron heartbeat
    RemindersService, // enqueues jobs
    RemindersProcessor, // consumes jobs
  ],
})
export class TasksModule {}

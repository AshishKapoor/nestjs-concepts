import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

// A module groups a feature's pieces. `controllers` are instantiated by Nest;
// `providers` are added to this module's DI scope. To let OTHER modules use
// TasksService, you'd add `exports: [TasksService]`.
//
// TypeOrmModule.forFeature([Task]) registers a Repository<Task> provider in this
// module's scope, so TasksService can inject it with @InjectRepository(Task).
@Module({
  imports: [TypeOrmModule.forFeature([Task])],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}

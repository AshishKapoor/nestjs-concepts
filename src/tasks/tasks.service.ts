import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { CreateTaskDto } from './dto/create-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task, TaskStatus } from './entities/task.entity';

// @Injectable() marks this class as a "provider" — something the DI container can
// construct and hand to anyone who asks for it (here, TasksController).
// All business logic lives in services; controllers should stay thin.
//
// Instead of an in-memory array, we now inject a TypeORM Repository<Task> — a
// thin data-access object with find/save/delete that talks to Postgres. Every
// method is async because every call is a real network round-trip to the DB.
@Injectable()
export class TasksService implements OnModuleInit {
  constructor(
    // @InjectRepository(Task) resolves the Repository<Task> that
    // TypeOrmModule.forFeature([Task]) registered in TasksModule.
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
  ) {}

  // OnModuleInit runs once after the module's dependencies are ready. We seed a
  // little data ONLY if the table is empty so the API has something to return on
  // a fresh database — purely a dev convenience, not something a real app does.
  // Note this count-then-insert is a check-then-act that assumes ONE instance:
  // two processes booting against the same empty DB could both seed (harmless here).
  async onModuleInit(): Promise<void> {
    if ((await this.tasksRepository.count()) === 0) {
      await this.create({
        title: 'Learn NestJS modules',
        status: TaskStatus.IN_PROGRESS,
      });
      await this.create({ title: 'Understand dependency injection' });
    }
  }

  async findAll(query: QueryTasksDto) {
    // Build a typed WHERE clause from the optional filters. Typing it as
    // FindOptionsWhere<Task> (not a loose Record) keeps it checked against the
    // entity — a wrong key or value type is now a compile error. ILike is
    // Postgres' case-insensitive LIKE; the %...% makes it a "contains" search.
    const where: FindOptionsWhere<Task> = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.title = ILike(`%${query.search}%`);
    }

    // findAndCount returns [rows, totalMatchingCount] in one go — the count
    // ignores skip/take, which is exactly what pagination metadata needs.
    const [items, total] = await this.tasksRepository.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return { items, total, page: query.page, limit: query.limit };
  }

  async findOne(id: number): Promise<Task> {
    const task = await this.tasksRepository.findOne({ where: { id } });
    // Throwing an HttpException is the idiomatic way to "return" an error.
    // Nest catches it and produces a proper 404 response.
    if (!task) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }
    return task;
  }

  async create(dto: CreateTaskDto): Promise<Task> {
    // create() builds an unsaved entity instance from the DTO. Note it does NOT
    // fill in the `status` default — that comes from the Postgres column DEFAULT
    // applied on INSERT and read back via RETURNING. save() runs that INSERT and
    // returns the row complete with its DB-generated id, status, and createdAt.
    const task = this.tasksRepository.create(dto);
    return this.tasksRepository.save(task);
  }

  async update(id: number, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id); // reuse — also gives us the 404 for free
    Object.assign(task, dto);
    return this.tasksRepository.save(task);
  }

  async remove(id: number): Promise<void> {
    // One DELETE round-trip. `affected` tells us whether a row actually matched,
    // so we can still return the same 404 as before without a prior SELECT.
    const result = await this.tasksRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }
  }
}

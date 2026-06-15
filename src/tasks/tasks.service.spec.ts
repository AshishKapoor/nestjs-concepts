import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  FindManyOptions,
  FindOperator,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { TasksService } from './tasks.service';

// Unit-testing a provider in isolation: we DON'T want a real database here, so we
// swap the Repository<Task> for a tiny in-memory fake. .overrideProvider on the
// repository token would also work; providing a useValue is the most direct way.
//
// The fake implements just the repository methods TasksService actually calls.
// Each returns a resolved Promise because the real repo methods are async — note
// we DON'T mark them `async` (they have nothing to await) to keep lint happy.
function createRepositoryMock(): Partial<Repository<Task>> {
  let rows: Task[] = [];
  let nextId = 1;

  return {
    count: jest.fn(() => Promise.resolve(rows.length)),

    create: jest.fn(
      (dto: Partial<Task>) => ({ status: TaskStatus.OPEN, ...dto }) as Task,
    ),

    save: jest.fn((task: Task) => {
      if (!task.id) {
        task.id = nextId++;
        task.createdAt = new Date();
        rows.push(task);
      }
      return Promise.resolve(task);
    }),

    findOne: jest.fn((options: FindManyOptions<Task>) => {
      const where = (options.where ?? {}) as FindOptionsWhere<Task>;
      return Promise.resolve(rows.find((t) => t.id === where.id) ?? null);
    }),

    findAndCount: jest.fn((options: FindManyOptions<Task> = {}) => {
      const where = (options.where ?? {}) as FindOptionsWhere<Task>;
      let result = rows;
      if (where.status) {
        result = result.filter((t) => t.status === where.status);
      }
      // The service passes ILike(`%term%`), a FindOperator carrying the pattern
      // on `.value`. Strip the % wildcards and do a contains-match.
      if (where.title) {
        const op = where.title as FindOperator<string>;
        const needle = op.value.replace(/%/g, '').toLowerCase();
        result = result.filter((t) => t.title.toLowerCase().includes(needle));
      }
      const skip = options.skip ?? 0;
      const take = options.take ?? result.length;
      const page: [Task[], number] = [
        result.slice(skip, skip + take),
        result.length,
      ];
      return Promise.resolve(page);
    }),

    delete: jest.fn((id: number) => {
      const before = rows.length;
      rows = rows.filter((t) => t.id !== id);
      return Promise.resolve({ affected: before - rows.length, raw: [] });
    }),
  };
}

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TasksService,
        // Bind the fake to the exact token @InjectRepository(Task) asks for.
        { provide: getRepositoryToken(Task), useValue: createRepositoryMock() },
      ],
    }).compile();
    service = moduleRef.get(TasksService);
    // The service seeds on init; call it so findAll tests have data to work with.
    await service.onModuleInit();
  });

  it('creates a task with default status OPEN', async () => {
    const task = await service.create({ title: 'Write tests' });
    expect(task.id).toBeDefined();
    expect(task.status).toBe(TaskStatus.OPEN);
  });

  it('throws NotFoundException for a missing task', async () => {
    await expect(service.findOne(9999)).rejects.toThrow(NotFoundException);
  });

  it('updates an existing task', async () => {
    const created = await service.create({ title: 'Original' });
    const updated = await service.update(created.id, { title: 'Updated' });
    expect(updated.title).toBe('Updated');
  });

  it('throws NotFoundException when removing a missing task', async () => {
    await expect(service.remove(9999)).rejects.toThrow(NotFoundException);
  });

  it('filters by status in findAll', async () => {
    const { items, total } = await service.findAll({
      status: TaskStatus.IN_PROGRESS,
      page: 1,
      limit: 10,
    });
    expect(total).toBeGreaterThanOrEqual(1);
    expect(items.every((t) => t.status === TaskStatus.IN_PROGRESS)).toBe(true);
  });

  it('searches titles case-insensitively in findAll', async () => {
    const { items } = await service.findAll({
      search: 'NESTJS',
      page: 1,
      limit: 10,
    });
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.every((t) => /nestjs/i.test(t.title))).toBe(true);
  });
});

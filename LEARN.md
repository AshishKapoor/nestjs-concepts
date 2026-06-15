# NestJS in one page

NestJS = opinionated Node framework. **Angular-style architecture** (modules, DI,
decorators) on top of Express (or Fastify). TypeScript-first. You describe *what*
with decorators; Nest wires the *how*.

## The 3 things you write 95% of the time

| Building block | Decorator | Job |
| --- | --- | --- |
| **Module** | `@Module()` | Groups a feature; defines its DI scope. Root = `AppModule`. |
| **Controller** | `@Controller('x')` | Maps HTTP routes → methods. Stays thin. |
| **Provider/Service** | `@Injectable()` | Business logic. Injected, never `new`-ed. |

```
Module ── imports other modules
  ├── controllers: [ ... ]   (handle HTTP)
  └── providers:   [ ... ]   (logic, injectable; export to share)
```

## Dependency Injection (the heart of Nest)

You declare a dependency in a constructor; Nest constructs and caches a single
instance (default scope = singleton) and hands it to you.

```ts
@Injectable()
export class TasksService {}

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {} // injected automatically
}
```

A provider is only injectable where it's **in scope**: listed in `providers` of a
module that's imported, or `exports`-ed by an imported module.

## Request lifecycle (ORDER MATTERS — memorize this)

```
Incoming request
  → Middleware          (Express-style, runs first; logging, request-id)
  → Guards              (can it proceed? auth/roles → 401/403)
  → Interceptors (pre)  (wrap call; start timer)
  → Pipes               (validate + transform body/params → 400)
  → ROUTE HANDLER       (your controller method → service)
  → Interceptors (post) (reshape the response, e.g. {data: ...})
  → Exception filters   (only if something threw → shape the error)
Response out
```

If a guard/pipe throws, the handler and post-interceptors never run — proven in
the server logs of this project.

## The cross-cutting tools (the other 5%)

| Tool | Interface | Use it for |
| --- | --- | --- |
| **Pipe** | `PipeTransform` | Validate/transform input. `ParseIntPipe`, global `ValidationPipe` + DTOs. |
| **Guard** | `CanActivate` | Authorization. Return bool / throw. Reads metadata via `Reflector`. |
| **Interceptor** | `NestInterceptor` | Wrap handler: transform responses, logging, caching (RxJS). |
| **Exception filter** | `ExceptionFilter` | Catch errors → shape HTTP response. `@Catch(HttpException)`. |
| **Middleware** | `NestMiddleware` | First-stage `(req,res,next)`. Wired in `AppModule.configure()`. |
| **Custom decorators** | `createParamDecorator` / `SetMetadata` | `@User()`, `@Public()`, `@Roles()`. |

Apply scope: method (`@UseGuards` on handler) → controller → global
(`app.useGlobalX()` in main.ts, or `APP_GUARD`/`APP_PIPE`/`APP_INTERCEPTOR`/`APP_FILTER`
provider tokens for DI-friendly globals).

## DTOs + validation (how you trust input)

```ts
export class CreateTaskDto {
  @IsString() @MinLength(3) title: string;
  @IsEnum(TaskStatus) @IsOptional() status?: TaskStatus;
}
// main.ts: app.useGlobalPipes(new ValidationPipe({
//   whitelist: true, forbidNonWhitelisted: true, transform: true }))
// UpdateDto = extends PartialType(CreateTaskDto)  -> all fields optional, same rules
```

`whitelist` strips unknown props; `forbidNonWhitelisted` 400s on them; `transform`
turns JSON into class instances and coerces types (use `@Type(() => Number)` for
numeric query params).

## CLI (your daily driver)

```bash
npx nest g resource tasks   # generates module+controller+service+dto+tests (CRUD)
npx nest g module orders
npx nest g controller orders
npx nest g service orders
npx nest g guard auth        # also: interceptor | pipe | filter | middleware | decorator
nest start --watch           # dev (pnpm start:dev)
nest build                   # compile to dist/
```
`g resource` is the big time-saver — it scaffolds a full REST/GraphQL CRUD module.

## Testing

- Unit: `Test.createTestingModule({ providers:[X] }).compile()` then `.get(X)`.
  Override real deps with `.overrideProvider(Dep).useValue(mock)`.
- E2E: `createNestApplication()` + `supertest` against the running app (`test/`).

## This project's worked example

A full Tasks REST API lives in `src/`:
- `src/tasks/` — module, controller, service, DTOs, entity, unit test
- `src/common/` — guard, interceptors, exception filter, middleware, decorators
- `src/app.module.ts` — global interceptor+filter via `APP_*`, middleware wiring, ConfigModule
- `src/main.ts` — global `ValidationPipe`

Run it:
```bash
docker compose up -d                 # start Postgres (see docker-compose.yml)
pnpm migration:run                   # create the tasks table
pnpm start:dev                       # http://localhost:3000
curl localhost:3000/tasks
curl -X POST localhost:3000/tasks -H 'content-type: application/json' \
     -H 'x-api-key: secret123' -d '{"title":"My first task"}'
```

## Database (TypeORM + Postgres) — DONE in this project

The `tasks` data now lives in Postgres via `@nestjs/typeorm`. The pieces:

| Piece | File | Job |
| --- | --- | --- |
| **Entity** | `tasks/entities/task.entity.ts` | `@Entity`/`@Column` decorators = the table schema AND the TS type. |
| **Connection** | `database/data-source.ts` | One `dataSourceOptions` shared by the app (`TypeOrmModule.forRoot`) AND the migration CLI. `synchronize:false`. |
| **Repository** | injected in `tasks.service.ts` | `@InjectRepository(Task) repo: Repository<Task>` — `find/save/delete`. Every call is `async`. |
| **forFeature** | `tasks.module.ts` | `TypeOrmModule.forFeature([Task])` registers the `Repository<Task>` provider. |
| **Migrations** | `database/migrations/*.ts` | Versioned SQL. `pnpm migration:generate <path>` diffs entities↔DB; `pnpm migration:run` applies. |

```ts
@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn() id: number;
  @Column() title: string;
  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.OPEN }) status: TaskStatus;
  @CreateDateColumn() createdAt: Date;
}
// service: const [items, total] = await this.repo.findAndCount({ where, skip, take });
```

**Gotcha learned the hard way:** once a service method is `async`, EVERY caller must `return`/`await`
its promise. A controller that calls `this.service.remove(id)` without returning it leaks a floating
promise — the 404 rejection then crashes the whole process instead of becoming a clean HTTP 404.

`synchronize:true` is the footgun: it auto-alters tables on boot and will silently drop data. Real apps
use **migrations** (off by default here). Never commit real DB credentials — `.env` is gitignored; only
`.env.example` (with dev defaults) is tracked.

## Where to go next (real-app building blocks)

1. **Database**: ✅ done — `@nestjs/typeorm` + Postgres, repos injected, migrations. Next: transactions,
   indexes, and a separate test database. See `learnings-2.html` for the full write-up
   (and `learnings-1.html` for the NestJS fundamentals this project started from).
2. **Auth**: `@nestjs/passport` + `@nestjs/jwt` → `AuthGuard('jwt')`, `@Roles()` guard.
3. **Config/validation**: `@nestjs/config` with a Joi/zod schema for env vars.
4. **API docs**: `@nestjs/swagger` → auto OpenAPI from your DTOs/decorators.
5. **Async/scale**: `@nestjs/bull` (queues), `@nestjs/schedule` (cron), caching, microservices/gRPC.
6. **Lifecycle hooks**: `OnModuleInit`, `OnApplicationShutdown` for setup/teardown.

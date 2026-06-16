# nestjs-concepts

A learning project that builds a full Tasks REST API using NestJS. Each layer of the framework is demonstrated with working code: modules, controllers, services, guards, interceptors, pipes, filters, middleware, custom decorators, TypeORM + Postgres, JWT auth, background queues (Bull + Redis), cron scheduling, in-memory caching, Swagger/OpenAPI, and environment validation with Zod.

## Features

- **Tasks CRUD** — create, list, update, delete tasks stored in Postgres
- **Auth** — JWT-based login/register with role-based access (USER / ADMIN)
- **API key guard** — write operations on tasks require `x-api-key` header
- **Background jobs** — Bull queue backed by Redis for async task reminders
- **Cron + caching** — scheduled jobs and a cached `/tasks/stats` endpoint
- **Swagger UI** — live at `/docs`, raw spec at `/docs-json`
- **Env validation** — Zod schema rejects bad config at boot time
- **TypeORM migrations** — versioned schema changes, `synchronize: false`

## Prerequisites

- Node 24+, pnpm, Docker

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env and set values (defaults match docker-compose.yml)
cp .env.example .env

# 3. Start Postgres + Redis
docker compose up -d

# 4. Run migrations to create the schema
pnpm migration:run

# 5. Start the dev server (watch mode)
pnpm start:dev
```

The API is at `http://localhost:3000`. Swagger UI is at `http://localhost:3000/docs`.

## API endpoints

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | public | Create a new user |
| POST | `/auth/login` | public | Returns `{ accessToken }` |
| GET | `/auth/me` | Bearer JWT | Current user info |
| GET | `/auth/admin` | Bearer JWT + ADMIN role | Admin-only route |

### Tasks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tasks` | public | List tasks (filter by status, search, paginate) |
| GET | `/tasks/stats` | public | Aggregated stats (cached 15 s) |
| GET | `/tasks/:id` | public | Single task by id |
| POST | `/tasks` | `x-api-key` | Create a task |
| PATCH | `/tasks/:id` | `x-api-key` | Update a task |
| DELETE | `/tasks/:id` | `x-api-key` | Delete a task (204) |
| POST | `/tasks/:id/remind` | `x-api-key` | Enqueue a background reminder |

Default API key: `secret123` (set in `.env` → `API_KEY`).

### Example

```bash
# Create a task
curl -X POST http://localhost:3000/tasks \
  -H 'content-type: application/json' \
  -H 'x-api-key: secret123' \
  -d '{"title":"Ship it"}'

# List tasks
curl http://localhost:3000/tasks

# Register + login
curl -X POST http://localhost:3000/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"hunter2","name":"You"}'

curl -X POST http://localhost:3000/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"hunter2"}'
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm start:dev` | Dev server with hot reload |
| `pnpm start:prod` | Run compiled output |
| `pnpm build` | Compile to `dist/` |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | End-to-end tests |
| `pnpm test:cov` | Test coverage report |
| `pnpm migration:generate src/database/migrations/<Name>` | Generate migration from entity diff |
| `pnpm migration:run` | Apply pending migrations |
| `pnpm migration:revert` | Revert last migration |

## Project structure

```
src/
  app.module.ts          root module — wires everything together
  main.ts                bootstrap: ValidationPipe, Swagger, shutdown hooks
  auth/                  JWT auth: register, login, guards, roles
  tasks/                 Tasks CRUD: controller, service, entity, DTOs
    reminders.*          Bull queue processor for async reminders
    tasks.scheduler.ts   Cron job example
    tasks-stats.service  Cached stats
  common/
    guards/              ApiKeyGuard
    interceptors/        LoggingInterceptor, TransformInterceptor
    filters/             HttpExceptionFilter
    middleware/          LoggerMiddleware
    decorators/          @Public(), @User(), @CurrentUser(), @Roles()
    lifecycle/           Startup + shutdown logging
  config/
    env.validation.ts    Zod schema for env vars
  database/
    data-source.ts       Shared TypeORM DataSource (app + migration CLI)
    migrations/          Versioned SQL migrations
```

## Environment variables

See `.env.example` for all required variables with descriptions. Key ones:

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port (default `3000`) |
| `API_KEY` | Required header value for write operations |
| `DB_*` | Postgres connection (host, port, user, password, name) |
| `JWT_SECRET` | Sign/verify JWT tokens — use a strong random value in prod |
| `JWT_EXPIRES_IN` | Token TTL (e.g. `1h`) |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection for Bull queues |

## Learning write-ups

Step-by-step write-ups for each concept are in [`docs/`](docs/):

| File | Topic |
|------|-------|
| [learnings-1.html](docs/learnings-1.html) | NestJS fundamentals — the Tasks API |
| [learnings-2.html](docs/learnings-2.html) | TypeORM + Postgres |
| [learnings-3.html](docs/learnings-3.html) | Auth: Passport + JWT + roles |
| [learnings-4.html](docs/learnings-4.html) | Config: env validation with Zod |
| [learnings-5.html](docs/learnings-5.html) | API docs: Swagger / OpenAPI |
| [learnings-6.html](docs/learnings-6.html) | Async & scale: cron, cache, queues |
| [learnings-7.html](docs/learnings-7.html) | Lifecycle hooks: startup & graceful shutdown |

A condensed reference of everything covered lives in [`LEARN.md`](LEARN.md).

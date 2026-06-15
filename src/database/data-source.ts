// Loads the .env file into process.env. The Nest app gets its env via
// ConfigModule, but the TypeORM CLI (migrations) runs OUTSIDE Nest, so it needs
// dotenv to read the same .env. Importing it here means both paths agree.
import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Task } from '../tasks/entities/task.entity';

// ONE place that defines how to connect. It's imported by:
//   1. AppModule           -> TypeOrmModule.forRoot(dataSourceOptions)  (runtime)
//   2. the TypeORM CLI     -> `-d src/database/data-source.ts`          (migrations)
// Sharing it guarantees the app and your migration tooling can never drift.
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'tasks',
  // Listing entities explicitly (vs a glob) is the most robust option — it works
  // the same whether we run from src/ (ts-node) or dist/ (compiled).
  entities: [Task],
  // The CLI needs a glob because it writes/reads .ts in dev and .js once built.
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  // synchronize MUST be false in real apps: it auto-alters tables to match your
  // entities on every boot and WILL drop columns/data. We use migrations instead.
  synchronize: false,
};

// The CLI loads this default export to discover the connection + migrations.
export default new DataSource(dataSourceOptions);

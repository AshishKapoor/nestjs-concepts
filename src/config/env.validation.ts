import { z } from 'zod';

// A zod schema for every environment variable the app relies on. zod isn't
// Joi-shaped, so it doesn't go in ConfigModule's `validationSchema` — instead we
// expose a `validate` function (below) that ConfigModule calls at startup. A
// missing or malformed var fails the boot LOUDLY with a clear message ("fail
// fast"), instead of the app limping along and blowing up on the first request.
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  // z.coerce.number() turns the string env value ("3000") into a real number.
  PORT: z.coerce.number().int().positive().default(3000),

  // Shared API key for the Tasks write routes (Part 1's guard).
  API_KEY: z.string().min(1),

  // Database (Part 2).
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),

  // Auth (Part 3). A short secret is a real weakness, so require >= 16 chars.
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('1h'),

  // Dev-only admin seed — optional, but validated if present.
  ADMIN_EMAIL: z.email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),

  // Redis (Part 6) — backs the Bull queue.
  REDIS_HOST: z.string().min(1).default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
});

// The validated, typed shape of our environment — inferred straight from the
// schema, so the type can never drift from the validation rules.
export type EnvVars = z.infer<typeof envSchema>;

// ConfigModule.forRoot({ validate: validateEnv }) calls this with the raw env.
// safeParse collects ALL problems (not just the first); we flatten them into one
// readable line and throw, which aborts bootstrap.
export function validateEnv(config: Record<string, unknown>): EnvVars {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`Config validation error: ${issues}`);
  }
  return result.data;
}

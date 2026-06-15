import { validateEnv } from './env.validation';

// A minimal valid environment used as the baseline for these tests.
const validEnv = {
  API_KEY: 'secret123',
  DB_HOST: 'localhost',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_NAME: 'tasks',
  JWT_SECRET: 'dev-super-secret-change-me',
};

describe('validateEnv (zod)', () => {
  it('accepts a valid environment and applies defaults', () => {
    const env = validateEnv(validEnv);
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.JWT_EXPIRES_IN).toBe('1h');
    expect(env.REDIS_PORT).toBe(6379);
  });

  it('coerces numeric strings (DB_PORT) to numbers', () => {
    const env = validateEnv({ ...validEnv, DB_PORT: '5433' });
    expect(env.DB_PORT).toBe(5433);
  });

  it('throws on a missing required var (JWT_SECRET)', () => {
    const incomplete = { ...validEnv } as Record<string, unknown>;
    delete incomplete.JWT_SECRET;
    expect(() => validateEnv(incomplete)).toThrow(/JWT_SECRET/);
  });

  it('throws on a too-short JWT_SECRET', () => {
    expect(() => validateEnv({ ...validEnv, JWT_SECRET: 'short' })).toThrow(
      /Config validation error/,
    );
  });

  it('reports multiple errors at once (safeParse collects all)', () => {
    let message = '';
    try {
      validateEnv({ JWT_SECRET: 'dev-super-secret-change-me' });
    } catch (e) {
      message = (e as Error).message;
    }
    // API_KEY, DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME are all missing.
    expect(message).toMatch(/API_KEY/);
    expect(message).toMatch(/DB_NAME/);
  });
});

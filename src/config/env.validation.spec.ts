import { EnvVars, envValidationSchema } from './env.validation';

// A minimal valid environment used as the baseline for these tests.
const validEnv = {
  API_KEY: 'secret123',
  DB_HOST: 'localhost',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_NAME: 'tasks',
  JWT_SECRET: 'dev-super-secret-change-me',
};

describe('envValidationSchema', () => {
  it('accepts a valid environment and applies defaults', () => {
    const result = envValidationSchema.validate(validEnv);
    expect(result.error).toBeUndefined();
    // Joi types value as `any`; cast to our typed shape for safe assertions.
    const env = result.value as EnvVars;
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.JWT_EXPIRES_IN).toBe('1h');
  });

  it('coerces numeric strings (DB_PORT) to numbers', () => {
    const result = envValidationSchema.validate({
      ...validEnv,
      DB_PORT: '5433',
    });
    expect((result.value as EnvVars).DB_PORT).toBe(5433);
  });

  it('rejects a missing required var (JWT_SECRET)', () => {
    const { JWT_SECRET, ...withoutSecret } = validEnv;
    void JWT_SECRET;
    const { error } = envValidationSchema.validate(withoutSecret);
    expect(error?.message).toMatch(/JWT_SECRET/);
  });

  it('rejects a too-short JWT_SECRET', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      JWT_SECRET: 'short',
    });
    expect(error).toBeDefined();
  });

  it('reports ALL errors at once with abortEarly:false', () => {
    const { error } = envValidationSchema.validate(
      { JWT_SECRET: 'dev-super-secret-change-me' },
      { abortEarly: false },
    );
    // API_KEY, DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME are all missing.
    expect(error?.details.length).toBeGreaterThanOrEqual(4);
  });
});

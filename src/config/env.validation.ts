import * as Joi from 'joi';

// The validated, typed shape of our environment. Typing the schema with this
// (Joi.object<EnvVars>) makes validate().value strongly typed instead of `any`.
export interface EnvVars {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  API_KEY: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
}

// A schema for every environment variable the app relies on. ConfigModule runs
// this at startup, so a missing or malformed var fails the boot LOUDLY with a
// clear message — instead of the app limping along and blowing up later (e.g. a
// missing JWT_SECRET only surfacing on the first login). This is "fail fast".
export const envValidationSchema = Joi.object<EnvVars>({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  // Shared API key for the Tasks write routes (Part 1's guard).
  API_KEY: Joi.string().min(1).required(),

  // Database (Part 2). DB_PORT is coerced to a number by Joi.
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  // Auth (Part 3). A short secret is a real weakness, so we require >= 16 chars.
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),

  // Dev-only admin seed — optional, but validated if present.
  ADMIN_EMAIL: Joi.string().email().optional(),
  ADMIN_PASSWORD: Joi.string().min(8).optional(),
});

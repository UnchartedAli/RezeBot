import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  BOT_TOKEN: z.string(),
  BOT_USERNAME: z.string().default('RezeBot'),
  BOT_NAME: z.string().default('RezeBot'),
  DATABASE_URL: z.string(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default('rezebot'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_SSL: z.coerce.boolean().default(false),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().default(''),
  BASE_URL: z.string().default('http://localhost:3000'),
  WEBHOOK_SECRET: z.string().min(16).optional(),
  WEB_PORT: z.coerce.number().default(3000),
  SESSION_SECRET: z.string().default('change_me_in_production'),
  JWT_SECRET: z.string().default('change_me_jwt_in_production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  HUGGINGFACE_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  COINGECKO_API_KEY: z.string().optional(),
  EXCHANGE_RATE_API_KEY: z.string().optional(),
  OPENEXCHANGE_API_KEY: z.string().optional(),
  MT_PROTO_API_ID: z.coerce.number().optional(),
  MT_PROTO_API_HASH: z.string().optional(),
  MT_PROTO_PHONE: z.string().optional(),
  MT_PROTO_SESSION_STRING: z.string().optional(),
  KAVENEGAR_API_KEY: z.string().optional(),
  KAVENEGAR_SENDER: z.string().optional(),
  MIXPANEL_TOKEN: z.string().optional(),
  POSTHOG_API_KEY: z.string().optional(),
  DOCKER_REGISTRY: z.string().default('ghcr.io'),
  DOCKER_IMAGE_NAME: z.string().default('rezebot'),
  DOCKER_TAG: z.string().default('latest'),
});

export type Env = z.infer<typeof EnvSchema>;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

let cachedConfig: Env | null = null;

export function loadConfig(): Env {
  if (cachedConfig) return cachedConfig;

  try {
    const result = EnvSchema.parse(process.env);
    cachedConfig = result;
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('\n');
      throw new ConfigError(`Configuration validation failed:\n${missing}`);
    }
    throw error;
  }
}

export function getConfig(): Env {
  if (!cachedConfig) return loadConfig();
  return cachedConfig;
}

export function isDevelopment(): boolean {
  return getConfig().NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return getConfig().NODE_ENV === 'production';
}

export function isTest(): boolean {
  return getConfig().NODE_ENV === 'test';
}

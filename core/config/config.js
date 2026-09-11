"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigError = void 0;
exports.loadConfig = loadConfig;
exports.getConfig = getConfig;
exports.isDevelopment = isDevelopment;
exports.isProduction = isProduction;
exports.isTest = isTest;
const zod_1 = require("zod");
const EnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().default(3000),
    BOT_TOKEN: zod_1.z.string(),
    BOT_USERNAME: zod_1.z.string().default('RezeBot'),
    BOT_NAME: zod_1.z.string().default('RezeBot'),
    DATABASE_URL: zod_1.z.string(),
    DB_HOST: zod_1.z.string().default('localhost'),
    DB_PORT: zod_1.z.coerce.number().default(5432),
    DB_NAME: zod_1.z.string().default('rezebot'),
    DB_USER: zod_1.z.string().default('postgres'),
    DB_PASSWORD: zod_1.z.string().default('postgres'),
    DB_SSL: zod_1.z.coerce.boolean().default(false),
    REDIS_URL: zod_1.z.string().default('redis://localhost:6379'),
    REDIS_PASSWORD: zod_1.z.string().default(''),
    BASE_URL: zod_1.z.string().default('http://localhost:3000'),
    WEB_PORT: zod_1.z.coerce.number().default(3000),
    SESSION_SECRET: zod_1.z.string().default('change_me_in_production'),
    JWT_SECRET: zod_1.z.string().default('change_me_jwt_in_production'),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    OPENAI_API_KEY: zod_1.z.string().optional(),
    ANTHROPIC_API_KEY: zod_1.z.string().optional(),
    HUGGINGFACE_API_KEY: zod_1.z.string().optional(),
    OPENROUTER_API_KEY: zod_1.z.string().optional(),
    COINGECKO_API_KEY: zod_1.z.string().optional(),
    EXCHANGE_RATE_API_KEY: zod_1.z.string().optional(),
    OPENEXCHANGE_API_KEY: zod_1.z.string().optional(),
    MT_PROTO_API_ID: zod_1.z.coerce.number().optional(),
    MT_PROTO_API_HASH: zod_1.z.string().optional(),
    MT_PROTO_PHONE: zod_1.z.string().optional(),
    MT_PROTO_SESSION_STRING: zod_1.z.string().optional(),
    KAVENEGAR_API_KEY: zod_1.z.string().optional(),
    KAVENEGAR_SENDER: zod_1.z.string().optional(),
    MIXPANEL_TOKEN: zod_1.z.string().optional(),
    POSTHOG_API_KEY: zod_1.z.string().optional(),
    DOCKER_REGISTRY: zod_1.z.string().default('ghcr.io'),
    DOCKER_IMAGE_NAME: zod_1.z.string().default('rezebot'),
    DOCKER_TAG: zod_1.z.string().default('latest'),
});
class ConfigError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConfigError';
    }
}
exports.ConfigError = ConfigError;
let cachedConfig = null;
function loadConfig() {
    if (cachedConfig)
        return cachedConfig;
    try {
        const result = EnvSchema.parse(process.env);
        cachedConfig = result;
        return result;
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const missing = error.errors
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join('\n');
            throw new ConfigError(`Configuration validation failed:\n${missing}`);
        }
        throw error;
    }
}
function getConfig() {
    if (!cachedConfig)
        return loadConfig();
    return cachedConfig;
}
function isDevelopment() {
    return getConfig().NODE_ENV === 'development';
}
function isProduction() {
    return getConfig().NODE_ENV === 'production';
}
function isTest() {
    return getConfig().NODE_ENV === 'test';
}
//# sourceMappingURL=config.js.map
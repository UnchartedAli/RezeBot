"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pg = exports.pool = void 0;
exports.getPool = getPool;
exports.query = query;
exports.getClient = getClient;
exports.withTransaction = withTransaction;
exports.closePool = closePool;
exports.isPoolHealthy = isPoolHealthy;
const pg_1 = __importDefault(require("pg"));
exports.pg = pg_1.default;
const config_1 = require("../core/config");
const logging_1 = require("../core/logging");
const logger = logging_1.LoggerProvider.get('Database');
let pool = null;
exports.pool = pool;
function getPool() {
    if (!pool) {
        const config = (0, config_1.getConfig)();
        const connectionString = config.DATABASE_URL ||
            `postgresql://${config.DB_USER}:${config.DB_PASSWORD}@${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME}`;
        exports.pool = pool = new pg_1.default.Pool({
            connectionString,
            ssl: config.DB_SSL ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            maxUses: 7500,
        });
        pool.on('error', (err) => {
            logger.error('Unexpected database pool error', { error: err.message });
        });
        pool.on('connect', () => {
            logger.debug('New database connection established');
        });
    }
    return pool;
}
async function query(text, params) {
    const start = Date.now();
    const client = await getPool().connect();
    try {
        const result = await client.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Database query executed', {
            query: text.substring(0, 100),
            rows: result.rowCount,
            duration,
        });
        return result;
    }
    catch (error) {
        logger.error('Database query error', {
            query: text.substring(0, 100),
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
    finally {
        client.release();
    }
}
async function getClient() {
    return await getPool().connect();
}
async function withTransaction(callback) {
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        logger.error('Transaction rolled back', {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
    finally {
        client.release();
    }
}
async function closePool() {
    if (pool) {
        await pool.end();
        exports.pool = pool = null;
        logger.info('Database pool closed');
    }
}
function isPoolHealthy() {
    if (!pool)
        return false;
    return pool.totalCount > 0;
}
//# sourceMappingURL=pool.js.map
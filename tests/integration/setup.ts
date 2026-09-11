/**
 * Test setup for integration tests.
 * Loads env vars and runs migrations against a test database.
 */

import { resolve } from 'path';
import { existsSync } from 'fs';
import dotenv from 'dotenv';

// Load .env if it exists
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Set test defaults if not provided (tests use a real Postgres via Docker or local)
process.env.NODE_ENV = 'test';
process.env.BOT_TOKEN = process.env.BOT_TOKEN || 'test:token';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rezebot_test';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_NAME = process.env.DB_NAME || 'rezebot_test';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.WEB_TOKEN_SECRET = process.env.WEB_TOKEN_SECRET || 'test-web-token-secret';
process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
process.env.OWNER_ID = process.env.OWNER_ID || '123456789';

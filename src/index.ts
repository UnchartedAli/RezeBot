import 'dotenv/config';
import { createBot, startBot } from './bot/botFactory';
import { runMigrations } from './db/migrations';
import { LoggerProvider } from './core/logging';
import { getConfig } from './core/config';
import { createWebApp } from './web/app';
const logger = LoggerProvider.get('Main');

async function main(): Promise<void> {
  try {
    const config = getConfig();
    logger.info('Starting RezeBot', { version: '1.0.0', env: config.NODE_ENV });

    // Run migrations
    logger.info('Running database migrations...');
    const migrationResult = await runMigrations();
    logger.info('Migrations complete', {
      applied: migrationResult.applied,
      failed: migrationResult.failed,
    });

    if (migrationResult.failed.length > 0) {
      logger.error('Some migrations failed', { failed: migrationResult.failed });
      process.exit(1);
    }

    // Start bot
    const bot = await startBot();

    // Start web server
    const webApp = createWebApp();
    const webServer = await webApp.listen({ port: config.WEB_PORT });

    logger.info('RezeBot started successfully', {
      botUsername: config.BOT_USERNAME,
      port: config.WEB_PORT,
      mode: process.env.WEBHOOK === 'true' ? 'webhook' : 'polling',
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down...`);
      try {
        bot.stop();
        if (webServer) {
          await webServer.close();
        }
        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('uncaughtException', (error) => {
      logger.fatal('Uncaught exception', { error: String(error) });
      process.exit(1);
    });
    process.on('unhandledRejection', (error) => {
      logger.error('Unhandled rejection', { error: String(error) });
    });
  } catch (error) {
    logger.fatal('Fatal error during startup', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

main();

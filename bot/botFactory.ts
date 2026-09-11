import { Bot, session } from 'grammy';
import { run } from '@grammyjs/runner';
import { limit } from '@grammyjs/ratelimiter';
import { BotContext, SessionData } from './types';
import { botMiddleware } from './middleware';
import { getRouter } from './router';
import { LoggerProvider } from '../core/logging';
import { getConfig, loadConfig } from '../core/config';
import { sessionStorage } from './sessionStorage';

const logger = LoggerProvider.get('BotFactory');

let botInstance: Bot<BotContext> | null = null;
let runnerInstance: ReturnType<typeof run> | null = null;

export function createBot(): Bot<BotContext> {
  if (botInstance) return botInstance;

  loadConfig();
  const config = getConfig();

  const bot = new Bot<BotContext>(config.BOT_TOKEN);

  // Session middleware with database storage
  bot.use(
    session({
      storage: sessionStorage,
      initial: (): SessionData => ({
        userId: 0,
        chatId: null,
        state: {},
        pendingAction: null,
        lastCommand: null,
        lastCommandTime: null,
        data: {},
      }),
      getSessionKey: (ctx) => {
        if (!ctx.from) return undefined;
        // Session state is scoped to the conversation, not globally to the user.
        // This prevents state/pending actions from leaking between groups.
        const chatId = ctx.chat?.id ?? ctx.from.id;
        return `${chatId}:${ctx.from.id}`;
      },
    })
  );

  // Apply bot middleware
  for (const middleware of botMiddleware) {
    bot.use(middleware);
  }

  // Rate limiting middleware for commands
  bot.use(
    limit({
      timeFrame: 1000,
      limit: 5,
      onLimitExceeded: async (ctx) => {
        await ctx.reply('⏳ شما خیلی سریع پیام می‌فرستید! لطفاً کمی صبر کنید.');
      },
      keyGenerator: (ctx) => {
        const chatId = ctx.chat?.id ?? 'private';
        const userId = ctx.from?.id ?? 'unknown';
        return `${chatId}:${userId}`;
      },
    })
  );

  // Register router (commands, callbacks, etc.)
  const router = getRouter();
  bot.use(router);

  botInstance = bot;
  logger.info('Bot created successfully');

  return bot;
}

export async function startBot(): Promise<Bot<BotContext>> {
  const bot = createBot();
  const config = getConfig();

  if (process.env.WEBHOOK === 'true') {
    logger.info('Bot configured for webhook mode');
    await bot.init();
    const webhookUrl = `${config.BASE_URL.replace(/\/$/, '')}/api/telegram/webhook`;
    await bot.api.setWebhook(webhookUrl, {
      secret_token: config.WEBHOOK_SECRET,
      allowed_updates: ['message', 'callback_query', 'chat_member', 'chat_join_request', 'message_reaction'],
    });
    logger.info('Telegram webhook configured', { webhookUrl });
  } else {
    await bot.api.deleteWebhook({ drop_pending_updates: false });
    runnerInstance = run(bot, {
      runner: {
        fetch: {
          allowed_updates: ['message', 'callback_query', 'chat_member', 'chat_join_request', 'message_reaction'],
        },
      },
    });
    logger.info('Bot started with long polling');
  }

  return bot;
}

export function getBot(): Bot<BotContext> {
  if (!botInstance) {
    throw new Error('Bot not initialized. Call startBot() first.');
  }
  return botInstance;
}

export function getRunner() {
  if (!runnerInstance) {
    throw new Error('Runner not initialized.');
  }
  return runnerInstance;
}

export function stopBot(): void {
  if (runnerInstance) {
    runnerInstance.stop();
  }
  if (botInstance) {
    botInstance.stop();
    logger.info('Bot stopped');
  }
  botInstance = null;
  runnerInstance = null;
}

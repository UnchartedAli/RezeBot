"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBot = createBot;
exports.startBot = startBot;
exports.getBot = getBot;
exports.getRunner = getRunner;
exports.stopBot = stopBot;
const grammy_1 = require("grammy");
const runner_1 = require("@grammyjs/runner");
const ratelimiter_1 = require("@grammyjs/ratelimiter");
const middleware_1 = require("./middleware");
const router_1 = require("./router");
const logging_1 = require("../core/logging");
const config_1 = require("../core/config");
const sessionStorage_1 = require("./sessionStorage");
const logger = logging_1.LoggerProvider.get('BotFactory');
let botInstance = null;
let runnerInstance = null;
function createBot() {
    if (botInstance)
        return botInstance;
    (0, config_1.loadConfig)();
    const config = (0, config_1.getConfig)();
    const bot = new grammy_1.Bot(config.BOT_TOKEN);
    // Session middleware with database storage
    bot.use((0, grammy_1.session)({
        storage: sessionStorage_1.sessionStorage,
        initial: () => ({
            userId: 0,
            chatId: null,
            state: {},
            pendingAction: null,
            lastCommand: null,
            lastCommandTime: null,
            data: {},
        }),
        getSessionKey: (ctx) => {
            if (!ctx.from)
                return undefined;
            // Session state is scoped to the conversation, not globally to the user.
            // This prevents state/pending actions from leaking between groups.
            const chatId = ctx.chat?.id ?? ctx.from.id;
            return `${chatId}:${ctx.from.id}`;
        },
    }));
    // Apply bot middleware
    for (const middleware of middleware_1.botMiddleware) {
        bot.use(middleware);
    }
    // Rate limiting middleware for commands
    bot.use((0, ratelimiter_1.limit)({
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
    }));
    // Register router (commands, callbacks, etc.)
    const router = (0, router_1.getRouter)();
    bot.use(router);
    botInstance = bot;
    logger.info('Bot created successfully');
    return bot;
}
async function startBot() {
    const bot = createBot();
    const config = (0, config_1.getConfig)();
    if (process.env.WEBHOOK === 'true') {
        logger.info('Bot configured for webhook mode');
        await bot.init();
    }
    else {
        await bot.api.deleteWebhook({ drop_pending_updates: false });
        runnerInstance = (0, runner_1.run)(bot, {
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
function getBot() {
    if (!botInstance) {
        throw new Error('Bot not initialized. Call startBot() first.');
    }
    return botInstance;
}
function getRunner() {
    if (!runnerInstance) {
        throw new Error('Runner not initialized.');
    }
    return runnerInstance;
}
function stopBot() {
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
//# sourceMappingURL=botFactory.js.map
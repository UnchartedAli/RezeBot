"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.botMiddleware = exports.injectContext = exports.updateActivity = exports.ensureChatMember = exports.ensureChat = exports.ensureUser = void 0;
const logging_1 = require("../../core/logging");
const repositories_1 = require("../../db/repositories");
const logger = logging_1.LoggerProvider.get('BotMiddleware');
const userRepository = new repositories_1.UserRepository();
const chatRepository = new repositories_1.ChatRepository();
const chatMemberRepository = new repositories_1.ChatMemberRepository();
const ensureUser = async (ctx, next) => {
    if (!ctx.from) {
        await next();
        return;
    }
    try {
        const user = await userRepository.createOrUpdate({
            id: ctx.from.id,
            username: ctx.from.username ?? null,
            first_name: ctx.from.first_name,
            last_name: ctx.from.last_name ?? null,
            is_bot: ctx.from.is_bot,
            language_code: ctx.from.language_code ?? null,
            is_premium: ctx.from.is_premium,
        });
        ctx.state.user = user;
    }
    catch (error) {
        logger.error('Failed to ensure user', {
            userId: ctx.from.id,
            error: error instanceof Error ? error.message : String(error),
        });
    }
    await next();
};
exports.ensureUser = ensureUser;
const ensureChat = async (ctx, next) => {
    if (!ctx.chat) {
        await next();
        return;
    }
    try {
        const chat = await chatRepository.createOrUpdate({
            chatId: ctx.chat.id,
            title: ctx.chat.title ?? undefined,
            type: ctx.chat.type,
            username: 'username' in ctx.chat ? ctx.chat.username : undefined,
        });
        ctx.state.chat = chat;
    }
    catch (error) {
        logger.error('Failed to ensure chat', {
            chatId: ctx.chat.id,
            error: error instanceof Error ? error.message : String(error),
        });
    }
    await next();
};
exports.ensureChat = ensureChat;
const ensureChatMember = async (ctx, next) => {
    if (!ctx.from || !ctx.chat) {
        await next();
        return;
    }
    try {
        // Never downgrade an administrator to `member` just because they sent a message.
        // Telegram is the source of truth for the current membership status.
        if (ctx.chat.type === 'private') {
            await chatMemberRepository.upsert(ctx.chat.id, ctx.from.id, 'user');
        }
        else {
            const telegramMember = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
            const status = telegramMember.status;
            if (status === 'creator') {
                await chatMemberRepository.upsert(ctx.chat.id, ctx.from.id, 'creator');
            }
            else if (status === 'administrator') {
                await chatMemberRepository.upsert(ctx.chat.id, ctx.from.id, 'administrator');
            }
            else if (status === 'member' || status === 'restricted') {
                const existingRole = await chatMemberRepository.getRole(ctx.chat.id, ctx.from.id);
                const preservedCustomRole = existingRole === 'moderator' || existingRole === 'trusted';
                await chatMemberRepository.upsert(ctx.chat.id, ctx.from.id, preservedCustomRole ? existingRole : status === 'restricted' ? 'restricted' : 'member');
            }
            else {
                await chatMemberRepository.upsert(ctx.chat.id, ctx.from.id, 'member');
            }
        }
    }
    catch (error) {
        logger.error('Failed to ensure chat member', {
            userId: ctx.from.id,
            chatId: ctx.chat.id,
            error: error instanceof Error ? error.message : String(error),
        });
    }
    await next();
};
exports.ensureChatMember = ensureChatMember;
const updateActivity = async (ctx, next) => {
    if (ctx.from?.id) {
        try {
            await userRepository.updateLastSeen(ctx.from.id);
        }
        catch (error) {
            logger.debug('Failed to update last seen', {
                userId: ctx.from.id,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    await next();
};
exports.updateActivity = updateActivity;
const injectContext = async (ctx, next) => {
    ctx.state.source = (ctx.session.state?.source ?? 'command');
    await next();
};
exports.injectContext = injectContext;
exports.botMiddleware = [
    exports.ensureUser,
    exports.ensureChat,
    exports.ensureChatMember,
    exports.updateActivity,
    exports.injectContext,
];
//# sourceMappingURL=botMiddleware.js.map
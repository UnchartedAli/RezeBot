"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const errors_1 = require("../../core/errors");
const logging_1 = require("../../core/logging");
const log = logging_1.LoggerProvider.get('ErrorHandler');
async function errorHandler(ctx, next) {
    try {
        await next();
    }
    catch (error) {
        const appError = errors_1.ErrorHandler.handle(error);
        log.error('Bot error handler caught error', {
            error: appError.message,
            code: appError.code,
            stack: appError.stack,
            userId: ctx.from?.id,
            chatId: ctx.chat?.id,
        });
        if (ctx.chat) {
            try {
                await ctx.reply(`❌ ${appError.message}`);
            }
            catch {
                // Chat might not accept messages, ignore
            }
        }
    }
}
//# sourceMappingURL=errorHandler.js.map
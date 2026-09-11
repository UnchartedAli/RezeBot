import { BotContext } from '../types';
import { RezeBotError, ErrorHandler } from '../../core/errors';
import { LoggerProvider } from '../../core/logging';

const log = LoggerProvider.get('ErrorHandler');

export async function errorHandler(ctx: BotContext, next: () => Promise<void>): Promise<void> {
  try {
    await next();
  } catch (error) {
    const appError = ErrorHandler.handle(error);

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
      } catch {
        // Chat might not accept messages, ignore
      }
    }
  }
}

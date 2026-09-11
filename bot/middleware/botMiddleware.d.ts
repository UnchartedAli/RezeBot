import { Middleware } from 'grammy';
import { BotContext } from '../types';
export declare const ensureUser: Middleware<BotContext>;
export declare const ensureChat: Middleware<BotContext>;
export declare const ensureChatMember: Middleware<BotContext>;
export declare const updateActivity: Middleware<BotContext>;
export declare const injectContext: Middleware<BotContext>;
export declare const botMiddleware: import("grammy").MiddlewareFn<BotContext>[];
//# sourceMappingURL=botMiddleware.d.ts.map
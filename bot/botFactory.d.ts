import { Bot } from 'grammy';
import { BotContext } from './types';
export declare function createBot(): Bot<BotContext>;
export declare function startBot(): Promise<Bot<BotContext>>;
export declare function getBot(): Bot<BotContext>;
export declare function getRunner(): import("@grammyjs/runner").RunnerHandle;
export declare function stopBot(): void;
//# sourceMappingURL=botFactory.d.ts.map
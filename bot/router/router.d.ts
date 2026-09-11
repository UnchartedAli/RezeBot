import { Composer } from 'grammy';
import { BotContext } from '../types';
export declare class Router {
    private static instance;
    private composer;
    private constructor();
    static getInstance(): Composer<BotContext>;
    private setup;
}
export declare function getRouter(): Composer<BotContext>;
//# sourceMappingURL=router.d.ts.map
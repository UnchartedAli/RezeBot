import { ActionIntent, ActionResult } from '../types';
export declare class ActionEngine {
    private static instance;
    private constructor();
    static getInstance(): ActionEngine;
    validateIntent(intent: ActionIntent): Promise<{
        valid: boolean;
        reason?: string;
    }>;
    checkPermissions(intent: ActionIntent, requiredRole?: string): Promise<{
        allowed: boolean;
        role: string;
        reason?: string;
    }>;
    execute(intent: ActionIntent, executor: (intent: ActionIntent) => Promise<ActionResult>): Promise<ActionResult>;
    batchExecute(intents: ActionIntent[], executors: Record<string, (intent: ActionIntent) => Promise<ActionResult>>): Promise<ActionResult[]>;
    confirmAction(intent: ActionIntent, confirmation: boolean): Promise<boolean>;
}
export declare const actionEngine: ActionEngine;
//# sourceMappingURL=ActionEngine.d.ts.map
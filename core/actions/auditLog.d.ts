import { ActionResult } from '../types';
declare class AuditLog {
    private static instance;
    private constructor();
    static getInstance(): AuditLog;
    log(entry: Partial<ActionResult>): Promise<void>;
    getLogs(chatId: number, options?: {
        action?: string;
        userId?: number;
        limit?: number;
        offset?: number;
        startDate?: Date;
        endDate?: Date;
    }): Promise<any[]>;
    exportLogs(chatId: number, startDate: Date, endDate: Date): Promise<string>;
}
export declare const auditLogger: AuditLog;
export {};
//# sourceMappingURL=auditLog.d.ts.map
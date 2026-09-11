export declare class WarningsRepository {
    create(warning: {
        chatId: number;
        userId: number;
        issuerId: number;
        reason: string;
        points?: number;
    }): Promise<number>;
    getByUser(chatId: number, userId: number): Promise<any[]>;
    getActiveCount(chatId: number, userId: number): Promise<number>;
    deactivate(id: number): Promise<void>;
    clearExpired(): Promise<void>;
}
//# sourceMappingURL=warningsRepository.d.ts.map
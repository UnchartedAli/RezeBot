import { UserRecord, ChatConfig, Role } from '../../core/types';
export declare class UserRepository {
    createOrUpdate(user: Partial<UserRecord>): Promise<UserRecord>;
    getById(userId: number): Promise<UserRecord | null>;
    updateLastSeen(userId: number): Promise<void>;
    updateRiskScore(userId: number, score: number): Promise<void>;
    updateWarningCount(userId: number, count: number, expiry?: Date): Promise<void>;
    setStatus(userId: number, status: UserRecord['status']): Promise<void>;
    incrementActionCount(userId: number): Promise<void>;
}
export declare class ChatRepository {
    createOrUpdate(chat: Partial<ChatConfig>): Promise<ChatConfig>;
    getById(chatId: number): Promise<ChatConfig | null>;
    updateSettings(chatId: number, settings: Record<string, unknown>): Promise<void>;
    updateFeatures(chatId: number, features: Record<string, boolean>): Promise<void>;
    getAll(): Promise<ChatConfig[]>;
    getByType(type: ChatConfig['type']): Promise<ChatConfig[]>;
}
export declare class ChatMemberRepository {
    upsert(chatId: number, userId: number, role: Role, extra?: Partial<ChatMember>): Promise<void>;
    getRole(chatId: number, userId: number): Promise<Role>;
    setRole(chatId: number, userId: number, role: Role): Promise<void>;
    getQuarantinedUsers(chatId: number): Promise<Array<{
        userId: number;
        expiresAt: Date | null;
    }>>;
    setQuarantine(chatId: number, userId: number, quarantine: boolean, expiry?: Date): Promise<void>;
}
interface ChatMember {
    isQuarantined: boolean;
    quarantineExpiry: Date | null;
    warningCount: number;
    warnExpiry: Date | null;
    muteExpiry: Date | null;
    banExpiry: Date | null;
    notes: string | null;
}
export declare class ModerationActionRepository {
    create(action: {
        chatId: number;
        targetId: number;
        actorId: number;
        actionType: string;
        reason?: string;
        duration?: number;
        expiresAt?: Date;
        source: string;
    }): Promise<number>;
    getActive(chatId: number, type: string): Promise<any[]>;
    deactivate(id: number): Promise<void>;
    getExpired(): Promise<any[]>;
}
export declare class FilterRepository {
    create(filter: {
        chatId: number;
        type: string;
        pattern: string;
        action: string;
        duration?: number;
        createdBy: number;
    }): Promise<number>;
    getByChat(chatId: number): Promise<any[]>;
    checkMatch(chatId: number, text: string): Promise<any[]>;
    delete(id: number): Promise<void>;
}
export declare class FaqRepository {
    create(faq: {
        chatId: number;
        question: string;
        answer: string;
        keywords?: string[];
        createdBy: number;
    }): Promise<number>;
    getByChat(chatId: number): Promise<any[]>;
    search(chatId: number, searchTerm: string): Promise<any[]>;
    update(id: number, updates: Partial<faq>): Promise<void>;
    delete(id: number): Promise<void>;
}
interface faq {
    question?: string;
    answer?: string;
    keywords?: string[];
}
export declare class TicketRepository {
    create(ticket: {
        chatId: number;
        userId: number;
        subject?: string;
        priority?: string;
    }): Promise<number>;
    getOpenByUser(chatId: number, userId: number): Promise<any | null>;
    getById(id: number): Promise<any | null>;
    updateStatus(id: number, status: string): Promise<void>;
    close(id: number): Promise<void>;
}
export declare class EconomyRepository {
    getBalance(userId: number, chatId: number): Promise<number>;
    createBalance(userId: number, chatId: number): Promise<void>;
    addBalance(userId: number, chatId: number, amount: number): Promise<number>;
    recordTransaction(tx: {
        userId: number;
        chatId: number;
        type: string;
        amount: number;
        balanceBefore: number;
        balanceAfter: number;
        description?: string;
        referenceId?: string;
    }): Promise<void>;
    getLeaderboard(chatId: number, limit?: number): Promise<any[]>;
}
export declare class GiveawayRepository {
    create(giveaway: {
        chatId: number;
        creatorId: number;
        title: string;
        description?: string;
        prize: string;
        winnerCount: number;
        duration?: number;
        endsAt?: Date;
        requiredAction?: string;
    }): Promise<number>;
    addEntry(giveawayId: number, userId: number): Promise<boolean>;
    getActiveByChat(chatId: number): Promise<any[]>;
    endGiveaway(id: number): Promise<void>;
}
export {};
//# sourceMappingURL=repositories.d.ts.map
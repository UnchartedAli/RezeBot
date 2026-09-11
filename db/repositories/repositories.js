"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiveawayRepository = exports.EconomyRepository = exports.TicketRepository = exports.FaqRepository = exports.FilterRepository = exports.ModerationActionRepository = exports.ChatMemberRepository = exports.ChatRepository = exports.UserRepository = void 0;
const pool_1 = require("../pool");
const logging_1 = require("../../core/logging");
const logger = logging_1.LoggerProvider.get('UserRepository');
class UserRepository {
    async createOrUpdate(user) {
        const columns = Object.keys(user);
        const values = Object.values(user);
        const setClause = columns
            .map((col, i) => `${col} = $${i + 2}`)
            .join(', ');
        const text = `
      INSERT INTO users (${columns.join(', ')})
      VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')})
      ON CONFLICT (id) DO UPDATE SET ${setClause}, updated_at = NOW()
      RETURNING *
    `;
        const result = await (0, pool_1.query)(text, [user.id, ...values.slice(1)]);
        return result.rows[0];
    }
    async getById(userId) {
        const result = await (0, pool_1.query)('SELECT * FROM users WHERE id = $1', [userId]);
        return result.rows[0] ?? null;
    }
    async updateLastSeen(userId) {
        await (0, pool_1.query)('UPDATE users SET last_seen = NOW() WHERE id = $1', [userId]);
    }
    async updateRiskScore(userId, score) {
        await (0, pool_1.query)('UPDATE users SET risk_score = $1 WHERE id = $2', [score, userId]);
    }
    async updateWarningCount(userId, count, expiry) {
        await (0, pool_1.query)('UPDATE users SET warning_count = $1, warn_expiry = $2 WHERE id = $3', [count, expiry ?? null, userId]);
    }
    async setStatus(userId, status) {
        await (0, pool_1.query)('UPDATE users SET status = $1 WHERE id = $2', [status, userId]);
    }
    async incrementActionCount(userId) {
        await (0, pool_1.query)('UPDATE users SET total_actions = total_actions + 1 WHERE id = $1', [userId]);
    }
}
exports.UserRepository = UserRepository;
class ChatRepository {
    async createOrUpdate(chat) {
        const text = `
      INSERT INTO chats (id, title, type, username, invite_link, description, settings, features)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        username = EXCLUDED.username,
        invite_link = EXCLUDED.invite_link,
        description = EXCLUDED.description,
        settings = EXCLUDED.settings,
        features = EXCLUDED.features,
        updated_at = NOW()
      RETURNING *
    `;
        const result = await (0, pool_1.query)(text, [
            chat.chatId,
            chat.title,
            chat.type,
            chat.username,
            chat.inviteLink,
            chat.description,
            chat.settings,
            chat.features,
        ]);
        return result.rows[0];
    }
    async getById(chatId) {
        const result = await (0, pool_1.query)('SELECT * FROM chats WHERE id = $1', [chatId]);
        return result.rows[0] ?? null;
    }
    async updateSettings(chatId, settings) {
        await (0, pool_1.query)('UPDATE chats SET settings = $1, updated_at = NOW() WHERE id = $2', [
            JSON.stringify(settings),
            chatId,
        ]);
    }
    async updateFeatures(chatId, features) {
        await (0, pool_1.query)('UPDATE chats SET features = $1, updated_at = NOW() WHERE id = $2', [
            JSON.stringify(features),
            chatId,
        ]);
    }
    async getAll() {
        const result = await (0, pool_1.query)('SELECT * FROM chats ORDER BY created_at DESC');
        return result.rows;
    }
    async getByType(type) {
        const result = await (0, pool_1.query)('SELECT * FROM chats WHERE type = $1', [type]);
        return result.rows;
    }
}
exports.ChatRepository = ChatRepository;
class ChatMemberRepository {
    async upsert(chatId, userId, role, extra) {
        const text = `
      INSERT INTO chat_members (chat_id, user_id, role, join_date, is_quarantined, quarantine_expiry, warning_count, warn_expiry, mute_expiry, ban_expiry, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (chat_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        warning_count = EXCLUDED.warning_count,
        warn_expiry = EXCLUDED.warn_expiry,
        mute_expiry = EXCLUDED.mute_expiry,
        ban_expiry = EXCLUDED.ban_expiry,
        notes = EXCLUDED.notes,
        updated_at = NOW()
    `;
        await (0, pool_1.query)(text, [
            chatId,
            userId,
            role,
            new Date(),
            extra?.isQuarantined ?? false,
            extra?.quarantineExpiry ?? null,
            extra?.warningCount ?? 0,
            extra?.warnExpiry ?? null,
            extra?.muteExpiry ?? null,
            extra?.banExpiry ?? null,
            extra?.notes ?? null,
        ]);
    }
    async getRole(chatId, userId) {
        const result = await (0, pool_1.query)('SELECT role FROM chat_members WHERE chat_id = $1 AND user_id = $2', [chatId, userId]);
        if (result.rows.length > 0)
            return result.rows[0].role;
        const chatResult = await (0, pool_1.query)('SELECT type FROM chats WHERE id = $1', [chatId]);
        if (chatResult.rows.length > 0) {
            const chatType = chatResult.rows[0].type;
            if (chatType === 'private')
                return 'user';
        }
        return 'member';
    }
    async setRole(chatId, userId, role) {
        await (0, pool_1.query)('UPDATE chat_members SET role = $1 WHERE chat_id = $2 AND user_id = $3', [role, chatId, userId]);
    }
    async getQuarantinedUsers(chatId) {
        const result = await (0, pool_1.query)('SELECT user_id, quarantine_expiry FROM chat_members WHERE chat_id = $1 AND is_quarantined = TRUE', [chatId]);
        return result.rows.map(r => ({ userId: r.user_id, expiresAt: r.quarantine_expiry }));
    }
    async setQuarantine(chatId, userId, quarantine, expiry) {
        await (0, pool_1.query)('UPDATE chat_members SET is_quarantined = $1, quarantine_expiry = $2 WHERE chat_id = $3 AND user_id = $4', [quarantine, expiry ?? null, chatId, userId]);
    }
}
exports.ChatMemberRepository = ChatMemberRepository;
class ModerationActionRepository {
    async create(action) {
        const result = await (0, pool_1.query)(`INSERT INTO moderation_actions (chat_id, target_id, actor_id, action_type, reason, duration, expires_at, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`, [
            action.chatId,
            action.targetId,
            action.actorId,
            action.actionType,
            action.reason,
            action.duration,
            action.expiresAt,
            action.source,
        ]);
        return result.rows[0].id;
    }
    async getActive(chatId, type) {
        const result = await (0, pool_1.query)('SELECT * FROM moderation_actions WHERE chat_id = $1 AND action_type = $2 AND is_active = TRUE ORDER BY created_at DESC', [chatId, type]);
        return result.rows;
    }
    async deactivate(id) {
        await (0, pool_1.query)('UPDATE moderation_actions SET is_active = FALSE WHERE id = $1', [id]);
    }
    async getExpired() {
        const result = await (0, pool_1.query)(`SELECT * FROM moderation_actions WHERE is_active = TRUE AND expires_at IS NOT NULL AND expires_at < NOW()`);
        return result.rows;
    }
}
exports.ModerationActionRepository = ModerationActionRepository;
class FilterRepository {
    async create(filter) {
        const result = await (0, pool_1.query)(`INSERT INTO filters (chat_id, type, pattern, action, duration, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, [filter.chatId, filter.type, filter.pattern, filter.action, filter.duration, filter.createdBy]);
        return result.rows[0].id;
    }
    async getByChat(chatId) {
        const result = await (0, pool_1.query)('SELECT * FROM filters WHERE chat_id = $1 AND is_active = TRUE', [chatId]);
        return result.rows;
    }
    async checkMatch(chatId, text) {
        const filters = await this.getByChat(chatId);
        const matches = [];
        for (const filter of filters) {
            if (filter.type === 'keyword' && text.toLowerCase().includes(filter.pattern.toLowerCase())) {
                matches.push(filter);
            }
            else if (filter.type === 'regex') {
                try {
                    const regex = new RegExp(filter.pattern, 'i');
                    if (regex.test(text)) {
                        matches.push(filter);
                    }
                }
                catch {
                    // Invalid regex, skip
                }
            }
        }
        return matches;
    }
    async delete(id) {
        await (0, pool_1.query)('DELETE FROM filters WHERE id = $1', [id]);
    }
}
exports.FilterRepository = FilterRepository;
class FaqRepository {
    async create(faq) {
        const result = await (0, pool_1.query)(`INSERT INTO faq_entries (chat_id, question, answer, keywords, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`, [faq.chatId, faq.question, faq.answer, faq.keywords ?? [], faq.createdBy]);
        return result.rows[0].id;
    }
    async getByChat(chatId) {
        const result = await (0, pool_1.query)('SELECT * FROM faq_entries WHERE chat_id = $1 AND is_active = TRUE ORDER BY created_at DESC', [chatId]);
        return result.rows;
    }
    async search(chatId, searchTerm) {
        const result = await (0, pool_1.query)(`SELECT *, ts_rank_cd(to_tsvector(question || ' ' || answer), phraseto_tsquery($2)) AS rank
       FROM faq_entries WHERE chat_id = $1 AND is_active = TRUE
       AND (LOWER(question) LIKE LOWER($2) OR LOWER(answer) LIKE LOWER($2) OR keywords && ARRAY[$2])
       ORDER BY rank DESC LIMIT 10`, [chatId, `%${searchTerm.toLowerCase()}%`]);
        return result.rows;
    }
    async update(id, updates) {
        const set = [];
        const values = [];
        let i = 1;
        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                set.push(`${key} = $${i}`);
                values.push(value);
                i++;
            }
        }
        if (set.length > 0) {
            values.push(id);
            await (0, pool_1.query)(`UPDATE faq_entries SET ${set.join(', ')}, updated_at = NOW() WHERE id = $${i}`, values);
        }
    }
    async delete(id) {
        await (0, pool_1.query)('UPDATE faq_entries SET is_active = FALSE WHERE id = $1', [id]);
    }
}
exports.FaqRepository = FaqRepository;
class TicketRepository {
    async create(ticket) {
        const result = await (0, pool_1.query)(`INSERT INTO tickets (chat_id, user_id, subject, priority)
       VALUES ($1, $2, $3, $4) RETURNING id`, [ticket.chatId, ticket.userId, ticket.subject, ticket.priority ?? 'medium']);
        return result.rows[0].id;
    }
    async getOpenByUser(chatId, userId) {
        const result = await (0, pool_1.query)(`SELECT * FROM tickets WHERE chat_id = $1 AND user_id = $2 AND status IN ('open', 'in_progress')`, [chatId, userId]);
        return result.rows[0] ?? null;
    }
    async getById(id) {
        const result = await (0, pool_1.query)('SELECT * FROM tickets WHERE id = $1', [id]);
        return result.rows[0] ?? null;
    }
    async updateStatus(id, status) {
        await (0, pool_1.query)('UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
    }
    async close(id) {
        await (0, pool_1.query)('UPDATE tickets SET status = \'closed\', closed_at = NOW() WHERE id = $1', [id]);
    }
}
exports.TicketRepository = TicketRepository;
class EconomyRepository {
    async getBalance(userId, chatId) {
        const result = await (0, pool_1.query)('SELECT balance FROM user_balances WHERE user_id = $1 AND chat_id = $2', [userId, chatId]);
        return result.rows[0]?.balance ?? 0;
    }
    async createBalance(userId, chatId) {
        await (0, pool_1.query)(`INSERT INTO user_balances (user_id, chat_id, balance)
       VALUES ($1, $2, 0) ON CONFLICT DO NOTHING`, [userId, chatId]);
    }
    async addBalance(userId, chatId, amount) {
        await this.createBalance(userId, chatId);
        const result = await (0, pool_1.query)(`UPDATE user_balances
       SET balance = balance + $1,
           lifetime_earned = lifetime_earned + $1,
           updated_at = NOW()
       WHERE user_id = $2 AND chat_id = $3
       RETURNING balance`, [amount, userId, chatId]);
        return result.rows[0]?.balance ?? 0;
    }
    async recordTransaction(tx) {
        await (0, pool_1.query)(`INSERT INTO economy_transactions
       (user_id, chat_id, type, amount, balance_before, balance_after, description, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [tx.userId, tx.chatId, tx.type, tx.amount, tx.balanceBefore, tx.balanceAfter, tx.description, tx.referenceId]);
    }
    async getLeaderboard(chatId, limit = 10) {
        const result = await (0, pool_1.query)(`SELECT user_id, balance, lifetime_earned FROM user_balances
       WHERE chat_id = $1 ORDER BY balance DESC LIMIT $2`, [chatId, limit]);
        return result.rows;
    }
}
exports.EconomyRepository = EconomyRepository;
class GiveawayRepository {
    async create(giveaway) {
        const result = await (0, pool_1.query)(`INSERT INTO giveaways
       (chat_id, creator_id, title, description, prize, winner_count, duration, ends_at, required_action)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`, [
            giveaway.chatId, giveaway.creatorId, giveaway.title, giveaway.description,
            giveaway.prize, giveaway.winnerCount, giveaway.duration, giveaway.endsAt, giveaway.requiredAction,
        ]);
        return result.rows[0].id;
    }
    async addEntry(giveawayId, userId) {
        try {
            await (0, pool_1.query)(`INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES ($1, $2)`, [giveawayId, userId]);
            await (0, pool_1.query)(`UPDATE giveaways SET entries_count = entries_count + 1 WHERE id = $1`, [giveawayId]);
            return true;
        }
        catch (error) {
            if (error.code === '23505')
                return false;
            throw error;
        }
    }
    async getActiveByChat(chatId) {
        const result = await (0, pool_1.query)('SELECT * FROM giveaways WHERE chat_id = $1 AND is_active = TRUE AND ended = FALSE', [chatId]);
        return result.rows;
    }
    async endGiveaway(id) {
        await (0, pool_1.query)(`UPDATE giveaways SET ended = TRUE, is_active = FALSE WHERE id = $1`, [id]);
    }
}
exports.GiveawayRepository = GiveawayRepository;
//# sourceMappingURL=repositories.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarningsRepository = void 0;
const pool_1 = require("../pool");
const logging_1 = require("../../core/logging");
const logger = logging_1.LoggerProvider.get('WarningsRepository');
class WarningsRepository {
    async create(warning) {
        const result = await (0, pool_1.query)(`INSERT INTO warnings (chat_id, user_id, issuer_id, reason, points)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`, [warning.chatId, warning.userId, warning.issuerId, warning.reason, warning.points ?? 1]);
        return result.rows[0].id;
    }
    async getByUser(chatId, userId) {
        const result = await (0, pool_1.query)(`SELECT * FROM warnings WHERE chat_id = $1 AND user_id = $2 AND is_active = TRUE`, [chatId, userId]);
        return result.rows;
    }
    async getActiveCount(chatId, userId) {
        const result = await (0, pool_1.query)(`SELECT COUNT(*) as count FROM warnings WHERE chat_id = $1 AND user_id = $2 AND is_active = TRUE`, [chatId, userId]);
        return parseInt(result.rows[0].count) || 0;
    }
    async deactivate(id) {
        await (0, pool_1.query)('UPDATE warnings SET is_active = FALSE WHERE id = $1', [id]);
    }
    async clearExpired() {
        await (0, pool_1.query)(`UPDATE warnings SET is_active = FALSE 
       WHERE is_active = TRUE AND expires_at IS NOT NULL AND expires_at < NOW()`);
    }
}
exports.WarningsRepository = WarningsRepository;
//# sourceMappingURL=warningsRepository.js.map
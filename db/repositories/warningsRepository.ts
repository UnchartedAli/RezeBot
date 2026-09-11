import { query } from '../pool';
import { LoggerProvider } from '../../core/logging';

const logger = LoggerProvider.get('WarningsRepository');

export class WarningsRepository {
  async create(warning: {
    chatId: number;
    userId: number;
    issuerId: number;
    reason: string;
    points?: number;
  }): Promise<number> {
    const result = await query(
      `INSERT INTO warnings (chat_id, user_id, issuer_id, reason, points)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [warning.chatId, warning.userId, warning.issuerId, warning.reason, warning.points ?? 1]
    );
    return result.rows[0].id;
  }

  async getByUser(chatId: number, userId: number): Promise<any[]> {
    const result = await query(
      `SELECT * FROM warnings WHERE chat_id = $1 AND user_id = $2 AND is_active = TRUE`,
      [chatId, userId]
    );
    return result.rows;
  }

  async getActiveCount(chatId: number, userId: number): Promise<number> {
    const result = await query(
      `SELECT COUNT(*) as count FROM warnings WHERE chat_id = $1 AND user_id = $2 AND is_active = TRUE`,
      [chatId, userId]
    );
    return parseInt(result.rows[0].count) || 0;
  }

  async deactivate(id: number): Promise<void> {
    await query('UPDATE warnings SET is_active = FALSE WHERE id = $1', [id]);
  }

  async clearExpired(): Promise<void> {
    await query(
      `UPDATE warnings SET is_active = FALSE 
       WHERE is_active = TRUE AND expires_at IS NOT NULL AND expires_at < NOW()`
    );
  }
}

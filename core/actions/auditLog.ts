import { ActionResult } from '../types';
import { query } from '../../db/pool';
import { LoggerProvider } from '../logging';

const logger = LoggerProvider.get('AuditLog');

class AuditLog {
  private static instance: AuditLog;

  private constructor() {}

  static getInstance(): AuditLog {
    if (!AuditLog.instance) {
      AuditLog.instance = new AuditLog();
    }
    return AuditLog.instance;
  }

  async log(entry: Partial<ActionResult>): Promise<void> {
    try {
      const queryText = `
        INSERT INTO audit_logs (
          actor_id, chat_id, target_id, action, reason, source, result, details, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      await query(queryText, [
        entry.actorId,
        entry.chatId,
        entry.targetId,
        entry.action,
        entry.reason,
        entry.source,
        entry.result,
        entry.details ? JSON.stringify(entry.details) : null,
        JSON.stringify({ duration: entry.duration, timestamp: entry.timestamp }),
      ]);

      logger.debug('Audit log written', {
        action: entry.action,
        chatId: entry.chatId,
        actorId: entry.actorId,
      });
    } catch (error) {
      logger.error('Failed to write audit log', {
        action: entry.action,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getLogs(
    chatId: number,
    options?: {
      action?: string;
      userId?: number;
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<any[]> {
    let queryText = 'SELECT * FROM audit_logs WHERE chat_id = $1';
    const params: any[] = [chatId];
    let paramIndex = 2;

    if (options?.action) {
      queryText += ` AND action = $${paramIndex++}`;
      params.push(options.action);
    }

    if (options?.userId) {
      queryText += ` AND (actor_id = $${paramIndex++} OR target_id = $${paramIndex - 1})`;
      params.push(options.userId);
    }

    if (options?.startDate) {
      queryText += ` AND timestamp >= $${paramIndex++}`;
      params.push(options.startDate);
    }

    if (options?.endDate) {
      queryText += ` AND timestamp <= $${paramIndex++}`;
      params.push(options.endDate);
    }

    queryText += ' ORDER BY timestamp DESC';

    const limit = options?.limit ?? 50;
    queryText += ` LIMIT $${paramIndex}`;
    params.push(limit);

    if (options?.offset) {
      queryText += ` OFFSET $${paramIndex + 1}`;
      params.push(options.offset);
    }

    const result = await query(queryText, params);
    return result.rows;
  }

  async exportLogs(
    chatId: number,
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    const logs = await this.getLogs(chatId, { startDate, endDate, limit: 10000 });
    return JSON.stringify(logs, null, 2);
  }
}

export const auditLogger = AuditLog.getInstance();

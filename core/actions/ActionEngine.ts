import { ActionIntent, ActionResult, ActionSource, ActionStatus, AuditAction } from '../types';
import { permissionEngine } from '../permissions';
import { auditLogger } from './auditLog';
import { LoggerProvider } from '../logging';

const logger = LoggerProvider.get('ActionEngine');

export class ActionEngine {
  private static instance: ActionEngine;

  private constructor() {}

  static getInstance(): ActionEngine {
    if (!ActionEngine.instance) {
      ActionEngine.instance = new ActionEngine();
    }
    return ActionEngine.instance;
  }

  async validateIntent(intent: ActionIntent): Promise<{ valid: boolean; reason?: string }> {
    if (!intent.context || !intent.context.chatId) {
      return { valid: false, reason: 'Missing chat context' };
    }

    if (!intent.context.userId) {
      return { valid: false, reason: 'Missing actor user ID' };
    }

    if (!intent.target || !intent.target.value) {
      return { valid: false, reason: 'Missing target' };
    }

    return { valid: true };
  }

  async checkPermissions(
    intent: ActionIntent,
    requiredRole?: string
  ): Promise<{ allowed: boolean; role: string; reason?: string }> {
    const { allowed, role, reason } = await permissionEngine.checkPermission(
      intent.context.userId,
      intent.context.chatId,
      intent.command,
      requiredRole as any
    );

    return { allowed, role, reason };
  }

  async execute(
    intent: ActionIntent,
    executor: (intent: ActionIntent) => Promise<ActionResult>
  ): Promise<ActionResult> {
    const validation = await this.validateIntent(intent);
    if (!validation.valid) {
      const result: ActionResult = {
        success: false,
        action: intent.command as AuditAction,
        actorId: intent.context.userId,
        chatId: intent.context.chatId,
        reason: intent.params.reason as string,
        source: intent.context.source || 'system',
        result: 'blocked' as ActionStatus,
        details: { reason: validation.reason },
        timestamp: new Date(),
      };
      await auditLogger.log(result);
      return result;
    }

    const permCheck = await this.checkPermissions(intent);
    if (!permCheck.allowed) {
      const result: ActionResult = {
        success: false,
        action: intent.command as AuditAction,
        actorId: intent.context.userId,
        chatId: intent.context.chatId,
        reason: intent.params.reason as string,
        source: intent.context.source || 'system',
        result: 'blocked' as ActionStatus,
        details: { reason: permCheck.reason },
        timestamp: new Date(),
      };
      await auditLogger.log(result);
      return result;
    }

    logger.info('Executing action', {
      action: intent.command,
      chatId: intent.context.chatId,
      userId: intent.context.userId,
      target: intent.target,
    });

    try {
      const result = await executor(intent);
      await auditLogger.log(result);
      return result;
    } catch (error) {
      logger.error('Action execution failed', {
        action: intent.command,
        error: error instanceof Error ? error.message : String(error),
      });

      const result: ActionResult = {
        success: false,
        action: intent.command as AuditAction,
        actorId: intent.context.userId,
        chatId: intent.context.chatId,
        reason: intent.params.reason as string,
        source: intent.context.source || 'system',
        result: 'error' as ActionStatus,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date(),
      };
      await auditLogger.log(result);
      return result;
    }
  }

  async batchExecute(
    intents: ActionIntent[],
    executors: Record<string, (intent: ActionIntent) => Promise<ActionResult>>
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const intent of intents) {
      const executor = executors[intent.command];
      if (!executor) {
        results.push({
          success: false,
          action: intent.command as AuditAction,
          actorId: intent.context.userId,
          chatId: intent.context.chatId,
          source: intent.context.source || 'system',
          result: 'error' as ActionStatus,
          details: { error: `No executor for action: ${intent.command}` },
          timestamp: new Date(),
        });
        continue;
      }

      const result = await this.execute(intent, executor);
      results.push(result);
    }

    return results;
  }

  async confirmAction(
    intent: ActionIntent,
    confirmation: boolean
  ): Promise<boolean> {
    if (!confirmation) {
      logger.info('Action cancelled by user', {
        action: intent.command,
        chatId: intent.context.chatId,
        userId: intent.context.userId,
      });
      return false;
    }
    return true;
  }
}

export const actionEngine = ActionEngine.getInstance();

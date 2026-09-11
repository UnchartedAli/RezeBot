"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionEngine = exports.ActionEngine = void 0;
const permissions_1 = require("../permissions");
const auditLog_1 = require("./auditLog");
const logging_1 = require("../logging");
const logger = logging_1.LoggerProvider.get('ActionEngine');
class ActionEngine {
    static instance;
    constructor() { }
    static getInstance() {
        if (!ActionEngine.instance) {
            ActionEngine.instance = new ActionEngine();
        }
        return ActionEngine.instance;
    }
    async validateIntent(intent) {
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
    async checkPermissions(intent, requiredRole) {
        const { allowed, role, reason } = await permissions_1.permissionEngine.checkPermission(intent.context.userId, intent.context.chatId, intent.command, requiredRole);
        return { allowed, role, reason };
    }
    async execute(intent, executor) {
        const validation = await this.validateIntent(intent);
        if (!validation.valid) {
            const result = {
                success: false,
                action: intent.command,
                actorId: intent.context.userId,
                chatId: intent.context.chatId,
                reason: intent.params.reason,
                source: intent.context.source || 'system',
                result: 'blocked',
                details: { reason: validation.reason },
                timestamp: new Date(),
            };
            await auditLog_1.auditLogger.log(result);
            return result;
        }
        const permCheck = await this.checkPermissions(intent);
        if (!permCheck.allowed) {
            const result = {
                success: false,
                action: intent.command,
                actorId: intent.context.userId,
                chatId: intent.context.chatId,
                reason: intent.params.reason,
                source: intent.context.source || 'system',
                result: 'blocked',
                details: { reason: permCheck.reason },
                timestamp: new Date(),
            };
            await auditLog_1.auditLogger.log(result);
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
            await auditLog_1.auditLogger.log(result);
            return result;
        }
        catch (error) {
            logger.error('Action execution failed', {
                action: intent.command,
                error: error instanceof Error ? error.message : String(error),
            });
            const result = {
                success: false,
                action: intent.command,
                actorId: intent.context.userId,
                chatId: intent.context.chatId,
                reason: intent.params.reason,
                source: intent.context.source || 'system',
                result: 'error',
                details: { error: error instanceof Error ? error.message : String(error) },
                timestamp: new Date(),
            };
            await auditLog_1.auditLogger.log(result);
            return result;
        }
    }
    async batchExecute(intents, executors) {
        const results = [];
        for (const intent of intents) {
            const executor = executors[intent.command];
            if (!executor) {
                results.push({
                    success: false,
                    action: intent.command,
                    actorId: intent.context.userId,
                    chatId: intent.context.chatId,
                    source: intent.context.source || 'system',
                    result: 'error',
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
    async confirmAction(intent, confirmation) {
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
exports.ActionEngine = ActionEngine;
exports.actionEngine = ActionEngine.getInstance();
//# sourceMappingURL=ActionEngine.js.map
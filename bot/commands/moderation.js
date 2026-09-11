"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBan = handleBan;
exports.handleKick = handleKick;
exports.handleMute = handleMute;
exports.handleWarn = handleWarn;
exports.handleDelete = handleDelete;
exports.handleLock = handleLock;
exports.handleUnlock = handleUnlock;
exports.handleQuarantine = handleQuarantine;
exports.handleUnquarantine = handleUnquarantine;
const actions_1 = require("../../core/actions");
const permissions_1 = require("../../core/permissions");
const feature_flags_1 = require("../../core/feature-flags");
const logging_1 = require("../../core/logging");
const repositories_1 = require("../../db/repositories");
const targetResolver_1 = require("../utils/targetResolver");
const log = logging_1.LoggerProvider.get('ModerationCommands');
const moderationRepo = new repositories_1.ModerationActionRepository();
function parseDuration(input) {
    const match = input.match(/^(\d+)([smhd])?$/);
    if (!match)
        return undefined;
    const value = parseInt(match[1]);
    const unit = match[2] ?? 'm';
    const multipliers = {
        s: 1,
        m: 60,
        h: 3600,
        d: 86400,
    };
    return value * (multipliers[unit] ?? 60);
}
async function handleBan(ctx) {
    if (!feature_flags_1.featureFlags.isEnabled(feature_flags_1.FeatureFlag.MODERATION_BAN)) {
        await ctx.reply('❌ این قابلیت غیرفعال است.');
        return;
    }
    const perm = await permissions_1.permissionEngine.checkPermission(ctx.from.id, ctx.chat.id, 'ban', 'moderator');
    if (!perm.allowed) {
        await ctx.reply(`❌ ${perm.reason || 'شما دسترسی این کار را ندارید.'}`);
        return;
    }
    const target = await targetResolver_1.targetResolver.resolve(ctx);
    if (!target) {
        await ctx.reply('❌ لطفاً کاربر را مشخص کنید (ردیف، یوزرنیم، یا آی‌دی).');
        return;
    }
    const durationStr = ctx.message.text.split(' ').slice(-1)[0];
    const duration = durationStr ? parseDuration(durationStr) : undefined;
    const reason = ctx.message.text.split(' ').slice(2, -1).join(' ') || 'بن توسط مدیر';
    try {
        const result = await actions_1.actionEngine.execute({
            type: 'moderation',
            command: 'ban',
            target: {
                type: target.type,
                value: target.value,
                resolvedId: target.resolvedId,
                confidence: target.confidence,
            },
            params: { reason, duration },
            context: {
                chatId: ctx.chat.id,
                userId: ctx.from.id,
                messageId: ctx.message.message_id,
                replyToId: ctx.message.reply_to_message?.message_id,
                source: 'command',
            },
        }, async (intent) => {
            try {
                await ctx.api.banChatMember(ctx.chat.id, target.resolvedId, {
                    until_date: duration ? Math.floor(Date.now() / 1000) + duration : undefined,
                });
                await moderationRepo.create({
                    chatId: ctx.chat.id,
                    targetId: target.resolvedId,
                    actorId: ctx.from.id,
                    actionType: 'ban',
                    reason,
                    duration,
                    expiresAt: duration ? new Date(Date.now() + duration * 1000) : undefined,
                    source: 'command',
                });
                return {
                    success: true,
                    action: 'ban',
                    actorId: ctx.from.id,
                    chatId: ctx.chat.id,
                    targetId: target.resolvedId,
                    reason,
                    source: 'command',
                    result: 'success',
                    timestamp: new Date(),
                    duration,
                };
            }
            catch (error) {
                log.error('Failed to ban user', { error: String(error) });
                return {
                    success: false,
                    action: 'ban',
                    actorId: ctx.from.id,
                    chatId: ctx.chat.id,
                    targetId: target.resolvedId,
                    reason,
                    source: 'command',
                    result: 'error',
                    details: { error: error.message },
                    timestamp: new Date(),
                    duration,
                };
            }
        });
        if (result.success) {
            const durText = duration ? ` برای ${Math.floor(duration / 60)} دقیقه` : '';
            await ctx.reply(`✅ کاربر ${target.value}${durText} بن شد.`);
        }
        else {
            await ctx.reply(`❌ عملیات بن انجام نشد: ${result.details?.error || result.details?.reason}`);
        }
    }
    catch (error) {
        log.error('Ban command error', { error: String(error) });
        await ctx.reply('❌ خطا در انجام عملیات.');
    }
}
async function handleKick(ctx) {
    if (!feature_flags_1.featureFlags.isEnabled(feature_flags_1.FeatureFlag.MODERATION_KICK)) {
        await ctx.reply('❌ این قابلیت غیرفعال است.');
        return;
    }
    const perm = await permissions_1.permissionEngine.checkPermission(ctx.from.id, ctx.chat.id, 'kick', 'moderator');
    if (!perm.allowed) {
        await ctx.reply(`❌ ${perm.reason || 'شما دسترسی این کار را ندارید.'}`);
        return;
    }
    const target = await targetResolver_1.targetResolver.resolve(ctx);
    if (!target) {
        await ctx.reply('❌ لطفاً کاربر را مشخص کنید.');
        return;
    }
    const reason = ctx.message.text.split(' ').slice(2).join(' ') || 'اخراج توسط مدیر';
    try {
        const result = await actions_1.actionEngine.execute({
            type: 'moderation',
            command: 'kick',
            target: { type: target.type, value: target.value, resolvedId: target.resolvedId, confidence: target.confidence },
            params: { reason },
            context: {
                chatId: ctx.chat.id,
                userId: ctx.from.id,
                messageId: ctx.message.message_id,
                replyToId: ctx.message.reply_to_message?.message_id,
                source: 'command',
            },
        }, async (intent) => {
            try {
                await ctx.api.banChatMember(ctx.chat.id, target.resolvedId);
                await ctx.api.unbanChatMember(ctx.chat.id, target.resolvedId);
                await moderationRepo.create({
                    chatId: ctx.chat.id,
                    targetId: target.resolvedId,
                    actorId: ctx.from.id,
                    actionType: 'kick',
                    reason,
                    source: 'command',
                });
                return {
                    success: true,
                    action: 'kick',
                    actorId: ctx.from.id,
                    chatId: ctx.chat.id,
                    targetId: target.resolvedId,
                    reason,
                    source: 'command',
                    result: 'success',
                    timestamp: new Date(),
                };
            }
            catch (error) {
                return {
                    success: false,
                    action: 'kick',
                    actorId: ctx.from.id,
                    chatId: ctx.chat.id,
                    targetId: target.resolvedId,
                    reason,
                    source: 'command',
                    result: 'error',
                    details: { error: error.message },
                    timestamp: new Date(),
                };
            }
        });
        if (result.success) {
            await ctx.reply(`✅ کاربر ${target.value} از گروه اخراج شد.`);
        }
        else {
            await ctx.reply(`❌ عملیات اخراج انجام نشد.`);
        }
    }
    catch (error) {
        await ctx.reply('❌ خطا در اجرای دستور.');
    }
}
async function handleMute(ctx) {
    if (!feature_flags_1.featureFlags.isEnabled(feature_flags_1.FeatureFlag.MODERATION_MUTE)) {
        await ctx.reply('❌ این قابلیت غیرفعال است.');
        return;
    }
    const perm = await permissions_1.permissionEngine.checkPermission(ctx.from.id, ctx.chat.id, 'mute', 'moderator');
    if (!perm.allowed) {
        await ctx.reply(`❌ ${perm.reason || 'شما دسترسی این کار را ندارید.'}`);
        return;
    }
    const target = await targetResolver_1.targetResolver.resolve(ctx);
    if (!target || !target.resolvedId) {
        await ctx.reply('❌ لطفاً کاربر را مشخص کنید.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    const durationStr = args[args.length - 1];
    const duration = durationStr ? parseDuration(durationStr) : 600;
    const reason = args.slice(1, -1).join(' ') || 'ساکت توسط مدیر';
    try {
        const result = await actions_1.actionEngine.execute({
            type: 'moderation',
            command: 'mute',
            target: { type: target.type, value: target.value, resolvedId: target.resolvedId, confidence: target.confidence },
            params: { reason, duration },
            context: {
                chatId: ctx.chat.id,
                userId: ctx.from.id,
                messageId: ctx.message.message_id,
                replyToId: ctx.message.reply_to_message?.message_id,
                source: 'command',
            },
        }, async () => {
            try {
                const untilDate = Math.floor(Date.now() / 1000) + (duration ?? 0);
                await ctx.api.restrictChatMember(ctx.chat.id, target.resolvedId, {
                    can_send_messages: false,
                    can_send_audios: false,
                    can_send_polls: false,
                    can_send_other_messages: false,
                    can_add_web_page_previews: false,
                }, { until_date: untilDate });
                await moderationRepo.create({
                    chatId: ctx.chat.id,
                    targetId: target.resolvedId,
                    actorId: ctx.from.id,
                    actionType: 'mute',
                    reason,
                    duration,
                    expiresAt: new Date(Date.now() + (duration ?? 0) * 1000),
                    source: 'command',
                });
                return {
                    success: true,
                    action: 'mute',
                    actorId: ctx.from.id,
                    chatId: ctx.chat.id,
                    targetId: target.resolvedId,
                    reason,
                    source: 'command',
                    result: 'success',
                    timestamp: new Date(),
                    duration,
                };
            }
            catch (error) {
                return {
                    success: false,
                    action: 'mute',
                    actorId: ctx.from.id,
                    chatId: ctx.chat.id,
                    targetId: target.resolvedId,
                    reason,
                    source: 'command',
                    result: 'error',
                    details: { error: error.message },
                    timestamp: new Date(),
                    duration,
                };
            }
        });
        if (result.success) {
            await ctx.reply(`✅ کاربر ${target.value} برای ${Math.floor((duration ?? 0) / 60)} دقیقه ساکت شد.`);
        }
        else {
            await ctx.reply(`❌ عملیات ساکت کردن انجام نشد.`);
        }
    }
    catch (error) {
        await ctx.reply('❌ خطا در اجرای دستور.');
    }
}
async function handleWarn(ctx) {
    if (!feature_flags_1.featureFlags.isEnabled(feature_flags_1.FeatureFlag.MODERATION_WARN)) {
        await ctx.reply('❌ این قابلیت غیرفعال است.');
        return;
    }
    const perm = await permissions_1.permissionEngine.checkPermission(ctx.from.id, ctx.chat.id, 'warn', 'moderator');
    if (!perm.allowed) {
        await ctx.reply(`❌ ${perm.reason || 'شما دسترسی این کار را ندارید.'}`);
        return;
    }
    const target = await targetResolver_1.targetResolver.resolve(ctx);
    if (!target || !target.resolvedId) {
        await ctx.reply('❌ لطفاً کاربر را مشخص کنید.');
        return;
    }
    const reason = ctx.message.text.split(' ').slice(2).join(' ') || 'هشدار از سوی مدیر';
    try {
        const result = await actions_1.actionEngine.execute({
            type: 'moderation',
            command: 'warn',
            target: { type: target.type, value: target.value, resolvedId: target.resolvedId, confidence: target.confidence },
            params: { reason },
            context: {
                chatId: ctx.chat.id,
                userId: ctx.from.id,
                messageId: ctx.message.message_id,
                replyToId: ctx.message.reply_to_message?.message_id,
                source: 'command',
            },
        }, async () => {
            try {
                const { WarningsRepository } = await Promise.resolve().then(() => __importStar(require('../../db/repositories/warningsRepository')));
                const warningsRepo = new WarningsRepository();
                await warningsRepo.create({
                    chatId: ctx.chat.id,
                    userId: target.resolvedId,
                    issuerId: ctx.from.id,
                    reason,
                    points: 1,
                });
                await moderationRepo.create({
                    chatId: ctx.chat.id,
                    targetId: target.resolvedId,
                    actorId: ctx.from.id,
                    actionType: 'warn',
                    reason,
                    source: 'command',
                });
                return {
                    success: true,
                    action: 'warn',
                    actorId: ctx.from.id,
                    chatId: ctx.chat.id,
                    targetId: target.resolvedId,
                    reason,
                    source: 'command',
                    result: 'success',
                    timestamp: new Date(),
                };
            }
            catch (error) {
                return {
                    success: false,
                    action: 'warn',
                    actorId: ctx.from.id,
                    chatId: ctx.chat.id,
                    targetId: target.resolvedId,
                    reason,
                    source: 'command',
                    result: 'error',
                    details: { error: error.message },
                    timestamp: new Date(),
                };
            }
        });
        if (result.success) {
            await ctx.reply(`✅ کاربر ${target.value} هشدار دریافت کرد.`);
        }
    }
    catch (error) {
        await ctx.reply('❌ خطا در اجرای دستور.');
    }
}
async function handleDelete(ctx) {
    if (!feature_flags_1.featureFlags.isEnabled(feature_flags_1.FeatureFlag.MODERATION_DELETE)) {
        await ctx.reply('❌ این قابلیت غیرفعال است.');
        return;
    }
    const perm = await permissions_1.permissionEngine.checkPermission(ctx.from.id, ctx.chat.id, 'delete', 'moderator');
    if (!perm.allowed) {
        await ctx.reply(`❌ ${perm.reason || 'شما دسترسی این کار را ندارید.'}`);
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    const count = args.length > 0 ? parseInt(args[0]) : 1;
    if (isNaN(count) || count < 1 || count > 100) {
        await ctx.reply('❌ لطفاً عدد معتبری وارد کنید (1 تا 100).');
        return;
    }
    try {
        const deleted = await ctx.api.deleteMessages(ctx.chat.id, Array.from({ length: count }, (_, i) => ctx.message.message_id - i));
        await actions_1.auditLogger.log({
            success: true,
            action: 'delete',
            actorId: ctx.from.id,
            chatId: ctx.chat.id,
            source: 'command',
            result: 'success',
            details: { count, deleted },
            timestamp: new Date(),
        });
        await ctx.reply(`✅ ${count} پیام حذف شد.`);
    }
    catch (error) {
        log.error('Delete command failed', { error: String(error) });
        await ctx.reply('❌ حذف پیام‌ها انجام نشد.');
    }
}
async function handleLock(ctx) {
    if (!feature_flags_1.featureFlags.isEnabled(feature_flags_1.FeatureFlag.MODERATION_LOCK)) {
        await ctx.reply('❌ این قابلیت غیرفعال است.');
        return;
    }
    const perm = await permissions_1.permissionEngine.checkPermission(ctx.from.id, ctx.chat.id, 'lock', 'moderator');
    if (!perm.allowed) {
        await ctx.reply(`❌ ${perm.reason || 'شما دسترسی این کار را ندارید.'}`);
        return;
    }
    try {
        await ctx.api.setChatPermissions(ctx.chat.id, {
            can_send_messages: false,
            can_send_audios: false,
            can_send_polls: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false,
        });
        await actions_1.auditLogger.log({
            success: true,
            action: 'lock',
            actorId: ctx.from.id,
            chatId: ctx.chat.id,
            source: 'command',
            result: 'success',
            timestamp: new Date(),
        });
        await ctx.reply('🔒 گروه قفل شد. فقط مدیران می‌توانند پیام بفرستند.');
    }
    catch (error) {
        await ctx.reply(`❌ قفل کردن گروه انجام نشد: ${error.message}`);
    }
}
async function handleUnlock(ctx) {
    if (!feature_flags_1.featureFlags.isEnabled(feature_flags_1.FeatureFlag.MODERATION_LOCK)) {
        await ctx.reply('❌ این قابلیت غیرفعال است.');
        return;
    }
    const perm = await permissions_1.permissionEngine.checkPermission(ctx.from.id, ctx.chat.id, 'unlock', 'moderator');
    if (!perm.allowed) {
        await ctx.reply(`❌ ${perm.reason || 'شما دسترسی این کار را ندارید.'}`);
        return;
    }
    try {
        await ctx.api.setChatPermissions(ctx.chat.id, {
            can_send_messages: true,
            can_send_audios: true,
            can_send_polls: true,
            can_send_other_messages: true,
            can_add_web_page_previews: true,
        });
        await actions_1.auditLogger.log({
            success: true,
            action: 'unlock',
            actorId: ctx.from.id,
            chatId: ctx.chat.id,
            source: 'command',
            result: 'success',
            timestamp: new Date(),
        });
        await ctx.reply('🔓 گروه باز شد. همه کاربران می‌توانند پیام بفرستند.');
    }
    catch (error) {
        await ctx.reply(`❌ باز کردن قفل انجام نشد: ${error.message}`);
    }
}
async function handleQuarantine(ctx) {
    if (!feature_flags_1.featureFlags.isEnabled(feature_flags_1.FeatureFlag.SECURITY_QUARANTINE)) {
        await ctx.reply('❌ این قابلیت غیرفعال است.');
        return;
    }
    const perm = await permissions_1.permissionEngine.checkPermission(ctx.from.id, ctx.chat.id, 'quarantine', 'moderator');
    if (!perm.allowed) {
        await ctx.reply(`❌ ${perm.reason || 'شما دسترسی این کار را ندارید.'}`);
        return;
    }
    const target = await targetResolver_1.targetResolver.resolve(ctx);
    if (!target || !target.resolvedId) {
        await ctx.reply('❌ لطفاً کاربر را مشخص کنید.');
        return;
    }
    const reason = ctx.message.text.split(' ').slice(2).join(' ') || 'قرنطینه توسط مدیر';
    try {
        await ctx.api.restrictChatMember(ctx.chat.id, target.resolvedId, {
            can_send_messages: false,
            can_send_audios: false,
            can_send_polls: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false,
            can_invite_users: false,
        });
        const { ChatMemberRepository } = await Promise.resolve().then(() => __importStar(require('../../db/repositories')));
        const chatMemberRepo = new ChatMemberRepository();
        await chatMemberRepo.setQuarantine(ctx.chat.id, target.resolvedId, true);
        await actions_1.auditLogger.log({
            success: true,
            action: 'quarantine',
            actorId: ctx.from.id,
            chatId: ctx.chat.id,
            targetId: target.resolvedId,
            reason,
            source: 'command',
            result: 'success',
            timestamp: new Date(),
        });
        await ctx.reply(`✅ کاربر ${target.value} قرنطینه شد. فقط پیام خصوصی می‌تواند بفرستد.`);
    }
    catch (error) {
        await ctx.reply(`❌ قرنطینه کردن انجام نشد: ${error.message}`);
    }
}
async function handleUnquarantine(ctx) {
    if (!feature_flags_1.featureFlags.isEnabled(feature_flags_1.FeatureFlag.SECURITY_QUARANTINE)) {
        await ctx.reply('❌ این قابلیت غیرفعال است.');
        return;
    }
    const perm = await permissions_1.permissionEngine.checkPermission(ctx.from.id, ctx.chat.id, 'unquarantine', 'moderator');
    if (!perm.allowed) {
        await ctx.reply(`❌ ${perm.reason || 'شما دسترسی این کار را ندارید.'}`);
        return;
    }
    const target = await targetResolver_1.targetResolver.resolve(ctx);
    if (!target || !target.resolvedId) {
        await ctx.reply('❌ لطفاً کاربر را مشخص کنید.');
        return;
    }
    try {
        await ctx.api.restrictChatMember(ctx.chat.id, target.resolvedId, {
            can_send_messages: true,
            can_send_audios: true,
            can_send_polls: true,
            can_send_other_messages: true,
            can_add_web_page_previews: true,
            can_invite_users: true,
        });
        const { ChatMemberRepository } = await Promise.resolve().then(() => __importStar(require('../../db/repositories')));
        const chatMemberRepo = new ChatMemberRepository();
        await chatMemberRepo.setQuarantine(ctx.chat.id, target.resolvedId, false);
        await actions_1.auditLogger.log({
            success: true,
            action: 'unquarantine',
            actorId: ctx.from.id,
            chatId: ctx.chat.id,
            targetId: target.resolvedId,
            source: 'command',
            result: 'success',
            timestamp: new Date(),
        });
        await ctx.reply(`✅ کاربر ${target.value} از قرنطینه خارج شد.`);
    }
    catch (error) {
        await ctx.reply(`❌ خارج کردن از قرنطینه انجام نشد: ${error.message}`);
    }
}
//# sourceMappingURL=moderation.js.map
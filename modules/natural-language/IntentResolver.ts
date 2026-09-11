import { persianNormalizer, persianIntentParser } from './persianNLP';
import { NlpResult, PersianIntent, ActionIntent, ActionSource, ActionTarget } from '../../core/types';

export class NlpIntentResolver {
  private targetResolutionOrder = ['reply', 'username', 'id', 'mention', 'name'];

  resolve(text: string, context: {
    chatId: number;
    userId: number;
    messageId?: number;
    replyToId?: number;
    replyToUserId?: number;
    source: ActionSource;
  }): NlpResult {
    const normalized = persianNormalizer.normalize(text);
    const parseResult = persianIntentParser.parse(text);

    const intent: PersianIntent = {
      intent: parseResult.intent,
      entities: parseResult.entities,
      confidence: parseResult.confidence,
      originalText: text,
      normalizedText: normalized,
      detectedLanguage: parseResult.language,
    };

    let action: ActionIntent | undefined;

    if (parseResult.confidence > 0.5) {
      action = this.buildActionFromIntent(parseResult, intent, context);
    }

    return {
      intent,
      action,
      actionType: action?.type,
      entities: parseResult.entities,
      confidence: parseResult.confidence,
    };
  }

  private buildActionFromIntent(
    parseResult: {
      intent: string;
      entities: Record<string, unknown>;
    },
    intent: PersianIntent,
    context: {
      chatId: number;
      userId: number;
      messageId?: number;
      replyToId?: number;
      replyToUserId?: number;
      source: ActionSource;
    }
  ): ActionIntent | undefined {
    const { intent: intentName, entities } = parseResult;

    const targetText = entities.target as string;
    const target = this.resolveTarget(
      targetText,
      context.replyToUserId,
      context.replyToId
    );

    switch (intentName) {
      case 'moderate': {
        const actionType = entities.action as string;
        const params: Record<string, unknown> = {};

        if (target) params.target = target.value;
        if (entities.reason) params.reason = entities.reason;
        if (entities.duration) params.duration = entities.duration;

        return {
          type: 'moderation',
          command: actionType,
          target: target || { type: 'name', value: String(targetText ?? ''), confidence: 0.3 },
          params,
          context: {
            chatId: context.chatId,
            userId: context.userId,
            messageId: context.messageId,
            replyToId: context.replyToId,
            source: context.source,
          },
        };
      }

      case 'warn':
        return {
          type: 'moderation',
          command: 'warn',
          target: target || { type: 'name', value: entities.target as string, confidence: 0.3 },
          params: {
            reason: entities.reason || 'Auto-detected warning',
          },
          context: {
            chatId: context.chatId,
            userId: context.userId,
            messageId: context.messageId,
            replyToId: context.replyToId,
            source: context.source,
          },
        };

      case 'delete_messages':
        return {
          type: 'moderation',
          command: 'delete',
          target: { type: 'id', value: '0', confidence: 1 },
          params: {
            count: entities.count || 1,
          },
          context: {
            chatId: context.chatId,
            userId: context.userId,
            messageId: context.messageId,
            replyToId: context.replyToId,
            source: context.source,
          },
        };

      case 'lock_toggle':
        return {
          type: 'moderation',
          command: entities.action === 'lock' ? 'lock' : 'unlock',
          target: { type: 'id', value: '0', confidence: 1 },
          params: {},
          context: {
            chatId: context.chatId,
            userId: context.userId,
            messageId: context.messageId,
            replyToId: context.replyToId,
            source: context.source,
          },
        };

      case 'report':
        return {
          type: 'security',
          command: 'report',
          target: { type: 'name', value: String(entities.reason ?? ''), confidence: 0.8 },
          params: { reason: entities.reason },
          context: {
            chatId: context.chatId,
            userId: context.userId,
            messageId: context.messageId,
            replyToId: context.replyToId,
            source: context.source,
          },
        };

      case 'translate':
        return {
          type: 'ai',
          command: 'translate',
          target: { type: 'id', value: '0', confidence: 1 },
          params: { text: entities.text },
          context: {
            chatId: context.chatId,
            userId: context.userId,
            messageId: context.messageId,
            replyToId: context.replyToId,
            source: context.source,
          },
        };

      case 'summarize':
        return {
          type: 'ai',
          command: 'summarize',
          target: { type: 'id', value: '0', confidence: 1 },
          params: { text: entities.text || '', chatId: context.chatId },
          context: {
            chatId: context.chatId,
            userId: context.userId,
            messageId: context.messageId,
            replyToId: context.replyToId,
            source: context.source,
          },
        };

      default:
        return undefined;
    }
  }

  private resolveTarget(
    text: string | undefined,
    replyUserId?: number,
    replyId?: number
  ): ActionTarget | undefined {
    if (!text) return undefined;

    // 1. Try to extract from reply
    if (replyUserId) {
      return {
        type: 'reply',
        value: String(replyUserId),
        resolvedId: replyUserId,
        confidence: 1.0,
      };
    }

    // 2. Try @username
    const usernameMatch = text.match(/@(\w+)/);
    if (usernameMatch) {
      return {
        type: 'username',
        value: usernameMatch[1],
        confidence: 0.9,
      };
    }

    // 3. Try user ID (numeric)
    const idMatch = text.match(/^(\d+)$/);
    if (idMatch) {
      return {
        type: 'id',
        value: idMatch[1],
        resolvedId: parseInt(idMatch[1]),
        confidence: 0.95,
      };
    }

    // 4. Try mention (e.g., [User](tg://user?id=12345))
    const mentionMatch = text.match(/\[(.+?)\]\(tg:\/\/user\?id=(\d+)\)/);
    if (mentionMatch) {
      return {
        type: 'mention',
        value: mentionMatch[1],
        resolvedId: parseInt(mentionMatch[2]),
        confidence: 0.95,
      };
    }

    // 5. Try name match (only with high confidence)
    return {
      type: 'name',
      value: text.trim(),
      confidence: 0.5,
    };
  }
}

export const nlpIntentResolver = new NlpIntentResolver();

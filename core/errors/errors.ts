/**
 * RezeBot — Core Errors
 */

export enum ErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  FEATURE_DISABLED = 'FEATURE_DISABLED',
  PROVIDER_NOT_CONFIGURED = 'PROVIDER_NOT_CONFIGURED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  TELEGRAM_ERROR = 'TELEGRAM_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNSUPPORTED = 'UNSUPPORTED',
}

export class RezeBotError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly userMessage: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode = 500,
    userMessage?: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RezeBotError';
    this.code = code;
    this.statusCode = statusCode;
    this.userMessage = userMessage ?? message;
    this.context = context;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      userMessage: this.userMessage,
      context: this.context,
    };
  }
}

export class PermissionError extends RezeBotError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(ErrorCode.PERMISSION_DENIED, message, 403, 'شما دسترسی لازم را ندارید.', context);
  }
}

export class ValidationError extends RezeBotError {
  constructor(message: string, userMessage?: string, context?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_FAILED, message, 400, userMessage ?? message, context);
  }
}

export class FeatureDisabledError extends RezeBotError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(ErrorCode.FEATURE_DISABLED, message, 403, 'این قابلیت غیرفعال است.', context);
  }
}

export class ProviderNotConfiguredError extends RezeBotError {
  constructor(provider: string, context?: Record<string, unknown>) {
    super(
      ErrorCode.PROVIDER_NOT_CONFIGURED,
      `Provider '${provider}' is not configured`,
      503,
      'سرویس مربوطه پیکربندی نشده است.',
      context
    );
  }
}

export class RateLimitError extends RezeBotError {
  constructor(message = 'Rate limit exceeded', context?: Record<string, unknown>) {
    super(ErrorCode.RATE_LIMITED, message, 429, 'تعداد درخواست‌های شما زیاد است. کمی صبر کنید.', context);
  }
}

export class UnsupportedFeatureError extends RezeBotError {
  constructor(feature: string, requirement?: string) {
    super(
      ErrorCode.UNSUPPORTED,
      `Feature '${feature}' is not supported via Bot API`,
      501,
      `این قابلیت از طریق Bot API پشتیبانی نمی‌شود${requirement ? ` و نیاز به ${requirement} دارد` : ''}.`,
      { feature, requirement }
    );
  }
}

export function isRezeBotError(error: unknown): error is RezeBotError {
  return error instanceof RezeBotError;
}

export function getErrorMessage(error: unknown): string {
  if (isRezeBotError(error)) return error.userMessage;
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Generic application error used by the bot middleware and web layer.
 */
export class AppError extends RezeBotError {
  constructor(message: string, code: ErrorCode = ErrorCode.INTERNAL_ERROR, context?: Record<string, unknown>) {
    super(code, message, 500, message, context);
    this.name = 'AppError';
  }
}

export interface NormalizedError {
  message: string;
  code: ErrorCode;
  context?: Record<string, unknown>;
  stack?: string;
}

/**
 * Central error normalizer.
 */
export class ErrorHandler {
  static handle(error: unknown): NormalizedError {
    if (error instanceof RezeBotError) {
      return {
        message: error.userMessage,
        code: error.code,
        context: error.context,
        stack: error.stack,
      };
    }
    if (error instanceof Error) {
      return {
        message: error.message,
        code: ErrorCode.INTERNAL_ERROR,
        stack: error.stack,
      };
    }
    return {
      message: String(error),
      code: ErrorCode.INTERNAL_ERROR,
    };
  }

  static isOperational(error: unknown): boolean {
    return error instanceof RezeBotError;
  }
}

export default { RezeBotError, ErrorCode, AppError, ErrorHandler };

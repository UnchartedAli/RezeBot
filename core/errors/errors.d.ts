/**
 * RezeBot — Core Errors
 */
export declare enum ErrorCode {
    PERMISSION_DENIED = "PERMISSION_DENIED",
    VALIDATION_FAILED = "VALIDATION_FAILED",
    RATE_LIMITED = "RATE_LIMITED",
    FEATURE_DISABLED = "FEATURE_DISABLED",
    PROVIDER_NOT_CONFIGURED = "PROVIDER_NOT_CONFIGURED",
    PROVIDER_ERROR = "PROVIDER_ERROR",
    DATABASE_ERROR = "DATABASE_ERROR",
    NOT_FOUND = "NOT_FOUND",
    TELEGRAM_ERROR = "TELEGRAM_ERROR",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    UNSUPPORTED = "UNSUPPORTED"
}
export declare class RezeBotError extends Error {
    readonly code: ErrorCode;
    readonly statusCode: number;
    readonly userMessage: string;
    readonly context?: Record<string, unknown>;
    constructor(code: ErrorCode, message: string, statusCode?: number, userMessage?: string, context?: Record<string, unknown>);
    toJSON(): Record<string, unknown>;
}
export declare class PermissionError extends RezeBotError {
    constructor(message: string, context?: Record<string, unknown>);
}
export declare class ValidationError extends RezeBotError {
    constructor(message: string, userMessage?: string, context?: Record<string, unknown>);
}
export declare class FeatureDisabledError extends RezeBotError {
    constructor(message: string, context?: Record<string, unknown>);
}
export declare class ProviderNotConfiguredError extends RezeBotError {
    constructor(provider: string, context?: Record<string, unknown>);
}
export declare class RateLimitError extends RezeBotError {
    constructor(message?: string, context?: Record<string, unknown>);
}
export declare class UnsupportedFeatureError extends RezeBotError {
    constructor(feature: string, requirement?: string);
}
export declare function isRezeBotError(error: unknown): error is RezeBotError;
export declare function getErrorMessage(error: unknown): string;
/**
 * Generic application error used by the bot middleware and web layer.
 */
export declare class AppError extends RezeBotError {
    constructor(message: string, code?: ErrorCode, context?: Record<string, unknown>);
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
export declare class ErrorHandler {
    static handle(error: unknown): NormalizedError;
    static isOperational(error: unknown): boolean;
}
declare const _default: {
    RezeBotError: typeof RezeBotError;
    ErrorCode: typeof ErrorCode;
    AppError: typeof AppError;
    ErrorHandler: typeof ErrorHandler;
};
export default _default;
//# sourceMappingURL=errors.d.ts.map
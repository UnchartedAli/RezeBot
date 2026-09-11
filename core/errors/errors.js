"use strict";
/**
 * RezeBot — Core Errors
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = exports.AppError = exports.UnsupportedFeatureError = exports.RateLimitError = exports.ProviderNotConfiguredError = exports.FeatureDisabledError = exports.ValidationError = exports.PermissionError = exports.RezeBotError = exports.ErrorCode = void 0;
exports.isRezeBotError = isRezeBotError;
exports.getErrorMessage = getErrorMessage;
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["PERMISSION_DENIED"] = "PERMISSION_DENIED";
    ErrorCode["VALIDATION_FAILED"] = "VALIDATION_FAILED";
    ErrorCode["RATE_LIMITED"] = "RATE_LIMITED";
    ErrorCode["FEATURE_DISABLED"] = "FEATURE_DISABLED";
    ErrorCode["PROVIDER_NOT_CONFIGURED"] = "PROVIDER_NOT_CONFIGURED";
    ErrorCode["PROVIDER_ERROR"] = "PROVIDER_ERROR";
    ErrorCode["DATABASE_ERROR"] = "DATABASE_ERROR";
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ErrorCode["TELEGRAM_ERROR"] = "TELEGRAM_ERROR";
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorCode["UNSUPPORTED"] = "UNSUPPORTED";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
class RezeBotError extends Error {
    code;
    statusCode;
    userMessage;
    context;
    constructor(code, message, statusCode = 500, userMessage, context) {
        super(message);
        this.name = 'RezeBotError';
        this.code = code;
        this.statusCode = statusCode;
        this.userMessage = userMessage ?? message;
        this.context = context;
    }
    toJSON() {
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
exports.RezeBotError = RezeBotError;
class PermissionError extends RezeBotError {
    constructor(message, context) {
        super(ErrorCode.PERMISSION_DENIED, message, 403, 'شما دسترسی لازم را ندارید.', context);
    }
}
exports.PermissionError = PermissionError;
class ValidationError extends RezeBotError {
    constructor(message, userMessage, context) {
        super(ErrorCode.VALIDATION_FAILED, message, 400, userMessage ?? message, context);
    }
}
exports.ValidationError = ValidationError;
class FeatureDisabledError extends RezeBotError {
    constructor(message, context) {
        super(ErrorCode.FEATURE_DISABLED, message, 403, 'این قابلیت غیرفعال است.', context);
    }
}
exports.FeatureDisabledError = FeatureDisabledError;
class ProviderNotConfiguredError extends RezeBotError {
    constructor(provider, context) {
        super(ErrorCode.PROVIDER_NOT_CONFIGURED, `Provider '${provider}' is not configured`, 503, 'سرویس مربوطه پیکربندی نشده است.', context);
    }
}
exports.ProviderNotConfiguredError = ProviderNotConfiguredError;
class RateLimitError extends RezeBotError {
    constructor(message = 'Rate limit exceeded', context) {
        super(ErrorCode.RATE_LIMITED, message, 429, 'تعداد درخواست‌های شما زیاد است. کمی صبر کنید.', context);
    }
}
exports.RateLimitError = RateLimitError;
class UnsupportedFeatureError extends RezeBotError {
    constructor(feature, requirement) {
        super(ErrorCode.UNSUPPORTED, `Feature '${feature}' is not supported via Bot API`, 501, `این قابلیت از طریق Bot API پشتیبانی نمی‌شود${requirement ? ` و نیاز به ${requirement} دارد` : ''}.`, { feature, requirement });
    }
}
exports.UnsupportedFeatureError = UnsupportedFeatureError;
function isRezeBotError(error) {
    return error instanceof RezeBotError;
}
function getErrorMessage(error) {
    if (isRezeBotError(error))
        return error.userMessage;
    if (error instanceof Error)
        return error.message;
    return String(error);
}
/**
 * Generic application error used by the bot middleware and web layer.
 */
class AppError extends RezeBotError {
    constructor(message, code = ErrorCode.INTERNAL_ERROR, context) {
        super(code, message, 500, message, context);
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
/**
 * Central error normalizer.
 */
class ErrorHandler {
    static handle(error) {
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
    static isOperational(error) {
        return error instanceof RezeBotError;
    }
}
exports.ErrorHandler = ErrorHandler;
exports.default = { RezeBotError, ErrorCode, AppError, ErrorHandler };
//# sourceMappingURL=errors.js.map
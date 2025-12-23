/**
 * 全局错误处理器
 * 统一管理错误捕获、日志记录、用户提示
 */

// 错误类型枚举
export const ErrorType = {
    NETWORK: 'NETWORK_ERROR',
    API: 'API_ERROR',
    CALCULATION: 'CALCULATION_ERROR',
    STORAGE: 'STORAGE_ERROR',
    VALIDATION: 'VALIDATION_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR'
};

// 错误级别
export const ErrorLevel = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
};

/**
 * 自定义错误类
 */
export class AppError extends Error {
    constructor(message, type = ErrorType.UNKNOWN, level = ErrorLevel.ERROR, details = {}) {
        super(message);
        this.name = 'AppError';
        this.type = type;
        this.level = level;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * 错误日志存储
 */
class ErrorLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 100;
    }

    /**
     * 记录错误
     */
    log(error) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            message: error.message,
            type: error.type || ErrorType.UNKNOWN,
            level: error.level || ErrorLevel.ERROR,
            stack: error.stack,
            details: error.details || {}
        };

        this.logs.unshift(logEntry);

        // 限制日志数量
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        // 控制台输出
        this.consoleLog(logEntry);

        // 可选：发送到监控服务
        // this.sendToMonitoring(logEntry);
    }

    /**
     * 控制台输出
     */
    consoleLog(entry) {
        const style = this.getConsoleStyle(entry.level);
        console.group(`%c[${entry.level.toUpperCase()}] ${entry.type}`, style);
        console.log('Message:', entry.message);
        console.log('Time:', entry.timestamp);
        if (entry.details && Object.keys(entry.details).length > 0) {
            console.log('Details:', entry.details);
        }
        if (entry.stack) {
            console.log('Stack:', entry.stack);
        }
        console.groupEnd();
    }

    /**
     * 获取控制台样式
     */
    getConsoleStyle(level) {
        const styles = {
            info: 'color: #2196F3; font-weight: bold;',
            warning: 'color: #FF9800; font-weight: bold;',
            error: 'color: #F44336; font-weight: bold;',
            critical: 'color: #fff; background: #F44336; font-weight: bold; padding: 2px 4px;'
        };
        return styles[level] || styles.error;
    }

    /**
     * 获取所有日志
     */
    getLogs() {
        return [...this.logs];
    }

    /**
     * 清除日志
     */
    clear() {
        this.logs = [];
    }

    /**
     * 导出日志
     */
    export() {
        const content = JSON.stringify(this.logs, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error-logs-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// 单例实例
export const errorLogger = new ErrorLogger();

/**
 * 错误处理器类
 */
export class ErrorHandler {
    constructor() {
        this.notificationCallback = null;
        this.setupGlobalHandlers();
    }

    /**
     * 设置全局错误处理
     */
    setupGlobalHandlers() {
        // 捕获未处理的Promise错误
        window.addEventListener('unhandledrejection', (event) => {
            event.preventDefault();
            this.handle(new AppError(
                event.reason?.message || 'Unhandled Promise Rejection',
                ErrorType.UNKNOWN,
                ErrorLevel.ERROR,
                { reason: event.reason }
            ));
        });

        // 捕获全局错误
        window.addEventListener('error', (event) => {
            event.preventDefault();
            this.handle(new AppError(
                event.message || 'Global Error',
                ErrorType.UNKNOWN,
                ErrorLevel.ERROR,
                {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                }
            ));
        });
    }

    /**
     * 设置通知回调
     */
    setNotificationCallback(callback) {
        this.notificationCallback = callback;
    }

    /**
     * 处理错误
     */
    handle(error) {
        // 记录日志
        errorLogger.log(error);

        // 用户通知
        if (this.notificationCallback && error.level !== ErrorLevel.INFO) {
            this.notificationCallback(this.getUserMessage(error));
        }

        // 关键错误特殊处理
        if (error.level === ErrorLevel.CRITICAL) {
            this.handleCriticalError(error);
        }
    }

    /**
     * 获取用户友好的错误消息
     */
    getUserMessage(error) {
        const messages = {
            [ErrorType.NETWORK]: '网络连接失败，请检查网络设置',
            [ErrorType.API]: '数据获取失败，请稍后重试',
            [ErrorType.CALCULATION]: '计算出错，请检查数据',
            [ErrorType.STORAGE]: '数据保存失败，请检查浏览器设置',
            [ErrorType.VALIDATION]: '数据验证失败，请检查输入',
            [ErrorType.UNKNOWN]: '发生未知错误，请刷新页面重试'
        };

        return messages[error.type] || error.message;
    }

    /**
     * 处理关键错误
     */
    handleCriticalError(error) {
        console.error('CRITICAL ERROR:', error);
        
        // 可选：显示全屏错误提示
        // this.showCriticalErrorUI(error);
        
        // 可选：自动重载页面
        // setTimeout(() => window.location.reload(), 3000);
    }

    /**
     * 包装异步函数
     */
    wrapAsync(fn, context = null) {
        return async (...args) => {
            try {
                return await fn.apply(context, args);
            } catch (error) {
                this.handle(error instanceof AppError ? error : new AppError(
                    error.message,
                    ErrorType.UNKNOWN,
                    ErrorLevel.ERROR,
                    { originalError: error }
                ));
                throw error;
            }
        };
    }

    /**
     * 包装同步函数
     */
    wrapSync(fn, context = null) {
        return (...args) => {
            try {
                return fn.apply(context, args);
            } catch (error) {
                this.handle(error instanceof AppError ? error : new AppError(
                    error.message,
                    ErrorType.UNKNOWN,
                    ErrorLevel.ERROR,
                    { originalError: error }
                ));
                throw error;
            }
        };
    }
}

// 单例实例
export const errorHandler = new ErrorHandler();

/**
 * 便捷函数：处理API错误
 */
export function handleApiError(error, context = '') {
    errorHandler.handle(new AppError(
        `API Error${context ? ` in ${context}` : ''}: ${error.message}`,
        ErrorType.API,
        ErrorLevel.ERROR,
        { context, originalError: error }
    ));
}

/**
 * 便捷函数：处理网络错误
 */
export function handleNetworkError(error, context = '') {
    errorHandler.handle(new AppError(
        `Network Error${context ? ` in ${context}` : ''}: ${error.message}`,
        ErrorType.NETWORK,
        ErrorLevel.WARNING,
        { context, originalError: error }
    ));
}

/**
 * 便捷函数：处理计算错误
 */
export function handleCalculationError(error, context = '') {
    errorHandler.handle(new AppError(
        `Calculation Error${context ? ` in ${context}` : ''}: ${error.message}`,
        ErrorType.CALCULATION,
        ErrorLevel.ERROR,
        { context, originalError: error }
    ));
}

/**
 * 便捷函数：处理存储错误
 */
export function handleStorageError(error, context = '') {
    errorHandler.handle(new AppError(
        `Storage Error${context ? ` in ${context}` : ''}: ${error.message}`,
        ErrorType.STORAGE,
        ErrorLevel.WARNING,
        { context, originalError: error }
    ));
}

/**
 * 便捷函数：验证数据
 */
export function validateData(data, rules, context = '') {
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
        const value = data[field];

        if (rule.required && (value === undefined || value === null || value === '')) {
            errors.push(`${field} is required`);
        }

        if (rule.type && typeof value !== rule.type) {
            errors.push(`${field} must be of type ${rule.type}`);
        }

        if (rule.min !== undefined && value < rule.min) {
            errors.push(`${field} must be at least ${rule.min}`);
        }

        if (rule.max !== undefined && value > rule.max) {
            errors.push(`${field} must be at most ${rule.max}`);
        }

        if (rule.pattern && !rule.pattern.test(value)) {
            errors.push(`${field} format is invalid`);
        }

        if (rule.custom && !rule.custom(value)) {
            errors.push(`${field} validation failed`);
        }
    }

    if (errors.length > 0) {
        throw new AppError(
            `Validation failed: ${errors.join(', ')}`,
            ErrorType.VALIDATION,
            ErrorLevel.WARNING,
            { context, errors, data }
        );
    }

    return true;
}

/**
 * 重试包装器
 */
export async function retry(fn, options = {}) {
    const {
        retries = 3,
        delay = 1000,
        backoff = 2,
        onRetry = null
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt < retries) {
                const waitTime = delay * Math.pow(backoff, attempt);
                
                if (onRetry) {
                    onRetry(attempt + 1, retries, error);
                }

                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    throw lastError;
}

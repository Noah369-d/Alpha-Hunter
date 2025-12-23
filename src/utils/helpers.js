/**
 * 通用工具函数
 */

/**
 * 标准化股票代码
 * @param {string} symbol - 原始代码
 * @returns {string} 标准化后的代码
 */
export function normalizeSymbol(symbol) {
    symbol = symbol.toUpperCase().trim();

    // 港股：纯数字转换
    if (/^\d{3,4}$/.test(symbol)) {
        if (symbol.length === 4) return symbol + '.HK';
        return symbol.padStart(4, '0') + '.HK';
    }

    // A股：沪市
    if (/^60\d{4}$/.test(symbol) || /^68\d{4}$/.test(symbol)) {
        return symbol + '.SS';
    }

    // A股：深市
    if (/^00\d{4}$/.test(symbol) || /^30\d{4}$/.test(symbol)) {
        return symbol + '.SZ';
    }

    return symbol;
}

/**
 * 获取市场类型
 * @param {string} symbol - 股票代码
 * @returns {string} 'US' | 'HK' | 'CN'
 */
export function getMarketType(symbol) {
    if (symbol.includes('.HK')) return 'HK';
    if (symbol.includes('.SS') || symbol.includes('.SZ')) return 'CN';
    return 'US';
}

/**
 * 获取市场CSS类名
 * @param {string} symbol - 股票代码
 * @returns {string} CSS类名
 */
export function getMarketClass(symbol) {
    const type = getMarketType(symbol);
    if (type === 'HK') return 'mk-hk';
    if (type === 'CN') return 'mk-cn';
    return 'mk-us';
}

/**
 * 格式化紧凑数字 (1000 -> 1K)
 * @param {number} value - 数值
 * @returns {string} 格式化后的字符串
 */
export function formatCompact(value) {
    return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(value);
}

/**
 * 格式化货币
 * @param {number} value - 数值
 * @returns {string} 格式化后的字符串
 */
export function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

/**
 * 格式化百分比
 * @param {number} value - 数值
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的字符串
 */
export function formatPercent(value, decimals = 2) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间(ms)
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制(ms)
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit = 300) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 深拷贝对象
 * @param {any} obj - 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
export function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 延迟函数
 * @param {number} ms - 毫秒数
 * @returns {Promise} Promise对象
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 安全执行函数
 * @param {Function} func - 要执行的函数
 * @param {any} defaultValue - 默认返回值
 * @returns {any} 执行结果或默认值
 */
export function tryCatch(func, defaultValue = null) {
    try {
        return func();
    } catch (error) {
        console.error('Function execution error:', error);
        return defaultValue;
    }
}

/**
 * 数组去重
 * @param {Array} arr - 数组
 * @returns {Array} 去重后的数组
 */
export function unique(arr) {
    return [...new Set(arr)];
}

/**
 * 数组分组
 * @param {Array} arr - 数组
 * @param {number} size - 每组大小
 * @returns {Array[]} 分组后的数组
 */
export function chunk(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

/**
 * 获取URL参数
 * @param {string} name - 参数名
 * @returns {string|null} 参数值
 */
export function getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

/**
 * 下载文件
 * @param {string} content - 文件内容
 * @param {string} filename - 文件名
 * @param {string} type - MIME类型
 */
export function downloadFile(content, filename, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * 复制到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} 是否成功
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Failed to copy:', error);
        return false;
    }
}

/**
 * 获取时间范围配置
 * @param {string} period - 周期
 * @returns {string} 时间范围
 */
export function getRangeForPeriod(period) {
    const rangeMap = {
        '15m': '60d',
        '1h': '730d',
        '4h': '730d',
        '1d': '2y',
        '1wk': '5y'
    };
    return rangeMap[period] || '2y';
}

/**
 * 获取周期显示名称
 * @param {string} period - 周期代码
 * @returns {string} 显示名称
 */
export function getPeriodName(period) {
    const nameMap = {
        '15m': '15分钟',
        '1h': '1小时',
        '4h': '4小时',
        '1d': '日线',
        '1wk': '周线'
    };
    return nameMap[period] || period;
}

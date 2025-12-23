/**
 * 本地存储工具
 * 统一管理 localStorage 操作，带错误处理
 */

const STORAGE_KEYS = {
    WATCHLIST: 'holo_watchlist',
    SENTIMENT: 'holo_sentiment',
    PORTFOLIO: 'holo_portfolio',
    THEME: 'holo_theme',
    STRATEGY: 'holo_strategy'
};

/**
 * 安全的JSON解析
 * @param {string} str - JSON字符串
 * @param {any} defaultValue - 默认值
 * @returns {any} 解析结果
 */
function safeJSONParse(str, defaultValue = null) {
    try {
        return JSON.parse(str);
    } catch (error) {
        console.warn('JSON parse error:', error);
        return defaultValue;
    }
}

/**
 * 安全的localStorage操作
 */
export const storage = {
    /**
     * 获取自选列表
     * @returns {string[]} 股票代码数组
     */
    getWatchlist() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
            return data ? safeJSONParse(data, []) : [];
        } catch (error) {
            console.error('Failed to get watchlist:', error);
            return [];
        }
    },

    /**
     * 保存自选列表
     * @param {string[]} list - 股票代码数组
     */
    setWatchlist(list) {
        try {
            localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(list));
        } catch (error) {
            console.error('Failed to save watchlist:', error);
        }
    },

    /**
     * 添加到自选
     * @param {string} symbol - 股票代码
     */
    addToWatchlist(symbol) {
        const list = this.getWatchlist();
        if (!list.includes(symbol)) {
            list.push(symbol);
            this.setWatchlist(list);
        }
    },

    /**
     * 从自选移除
     * @param {string} symbol - 股票代码
     */
    removeFromWatchlist(symbol) {
        const list = this.getWatchlist();
        const filtered = list.filter(s => s !== symbol);
        this.setWatchlist(filtered);
    },

    /**
     * 获取情绪标记
     * @returns {Object} {symbol: sentiment}
     */
    getSentimentMap() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.SENTIMENT);
            return data ? safeJSONParse(data, {}) : {};
        } catch (error) {
            console.error('Failed to get sentiment:', error);
            return {};
        }
    },

    /**
     * 保存情绪标记
     * @param {Object} map - 情绪映射
     */
    setSentimentMap(map) {
        try {
            localStorage.setItem(STORAGE_KEYS.SENTIMENT, JSON.stringify(map));
        } catch (error) {
            console.error('Failed to save sentiment:', error);
        }
    },

    /**
     * 设置单个股票情绪
     * @param {string} symbol - 股票代码
     * @param {number} sentiment - 情绪值 (0-3)
     */
    setSentiment(symbol, sentiment) {
        const map = this.getSentimentMap();
        map[symbol] = sentiment;
        this.setSentimentMap(map);
    },

    /**
     * 获取持仓组合
     * @returns {Array} 持仓数组
     */
    getPortfolio() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.PORTFOLIO);
            return data ? safeJSONParse(data, []) : [];
        } catch (error) {
            console.error('Failed to get portfolio:', error);
            return [];
        }
    },

    /**
     * 保存持仓组合
     * @param {Array} portfolio - 持仓数组
     */
    setPortfolio(portfolio) {
        try {
            localStorage.setItem(STORAGE_KEYS.PORTFOLIO, JSON.stringify(portfolio));
        } catch (error) {
            console.error('Failed to save portfolio:', error);
        }
    },

    /**
     * 添加持仓
     * @param {Object} position - 持仓对象
     */
    addPosition(position) {
        const portfolio = this.getPortfolio();
        const existingIdx = portfolio.findIndex(p => p.symbol === position.symbol);
        
        if (existingIdx >= 0) {
            portfolio[existingIdx] = position;
        } else {
            portfolio.push(position);
        }
        
        this.setPortfolio(portfolio);
    },

    /**
     * 移除持仓
     * @param {string} symbol - 股票代码
     */
    removePosition(symbol) {
        const portfolio = this.getPortfolio();
        const filtered = portfolio.filter(p => p.symbol !== symbol);
        this.setPortfolio(filtered);
    },

    /**
     * 获取主题
     * @returns {string} 'dark' | 'light'
     */
    getTheme() {
        try {
            return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
        } catch (error) {
            console.error('Failed to get theme:', error);
            return 'dark';
        }
    },

    /**
     * 保存主题
     * @param {string} theme - 主题名称
     */
    setTheme(theme) {
        try {
            localStorage.setItem(STORAGE_KEYS.THEME, theme);
        } catch (error) {
            console.error('Failed to save theme:', error);
        }
    },

    /**
     * 获取策略
     * @returns {string} 策略名称
     */
    getStrategy() {
        try {
            return localStorage.getItem(STORAGE_KEYS.STRATEGY) || 'Holo';
        } catch (error) {
            console.error('Failed to get strategy:', error);
            return 'Holo';
        }
    },

    /**
     * 保存策略
     * @param {string} strategy - 策略名称
     */
    setStrategy(strategy) {
        try {
            localStorage.setItem(STORAGE_KEYS.STRATEGY, strategy);
        } catch (error) {
            console.error('Failed to save strategy:', error);
        }
    },

    /**
     * 清除所有数据
     */
    clearAll() {
        try {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
        } catch (error) {
            console.error('Failed to clear storage:', error);
        }
    }
};

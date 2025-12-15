/**
 * 市场数据适配器
 * 负责通过yfinance获取不同市场的数据
 * 
 * 需求：1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import CacheManager from './CacheManager.js'

/**
 * @typedef {import('./models').MarketData} MarketData
 * @typedef {import('./models').Quote} Quote
 */

class MarketDataAdapter {
  constructor(options = {}) {
    // yfinance API基础URL（这里使用代理服务或直接调用）
    // 注意：实际使用时可能需要配置CORS代理
    this.baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart'
    
    // 缓存管理器
    this.cacheEnabled = options.cacheEnabled !== false
    this.cache = this.cacheEnabled ? new CacheManager() : null
    this.cacheTTL = options.cacheTTL || 5 * 60 * 1000 // 默认5分钟
    
    // 重试配置
    this.maxRetries = options.maxRetries || 3
    this.initialRetryDelay = options.initialRetryDelay || 1000 // 1秒
    this.maxRetryDelay = options.maxRetryDelay || 10000 // 10秒
    
    // 错误日志
    this.errorLog = []
    this.maxErrorLogSize = options.maxErrorLogSize || 100
  }

  /**
   * 检测市场类型
   * @param {string} symbol - 交易品种代码
   * @returns {string} 市场类型 ('US', 'HK', 'CN', 'CRYPTO', 'FUTURES')
   */
  detectMarket(symbol) {
    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Invalid symbol')
    }

    const upperSymbol = symbol.toUpperCase()

    // 港股：代码.HK
    if (upperSymbol.endsWith('.HK')) {
      return 'HK'
    }

    // A股：代码.SS（上交所）或 代码.SZ（深交所）
    if (upperSymbol.endsWith('.SS') || upperSymbol.endsWith('.SZ')) {
      return 'CN'
    }

    // 加密货币：代码-USD
    if (upperSymbol.includes('-USD')) {
      return 'CRYPTO'
    }

    // 期货：代码=F
    if (upperSymbol.endsWith('=F')) {
      return 'FUTURES'
    }

    // 默认为美股
    return 'US'
  }

  /**
   * 获取市场数据（使用yfinance）
   * @param {string} symbol - 交易品种代码（如：AAPL, 0700.HK, 000001.SS, BTC-USD）
   * @param {string} interval - 时间周期（1m, 5m, 15m, 1h, 1d等）
   * @param {Date} startDate - 开始日期
   * @param {Date} endDate - 结束日期
   * @param {boolean} useCache - 是否使用缓存，默认true
   * @returns {Promise<MarketData[]>}
   */
  async fetchData(symbol, interval = '1d', startDate, endDate, useCache = true) {
    // 验证参数
    if (!symbol) {
      const error = this.createError('INVALID_SYMBOL', 'Symbol is required', { symbol })
      this.logError(error)
      throw error
    }

    // 验证symbol格式
    if (!this.isValidSymbol(symbol)) {
      const error = this.createError('INVALID_SYMBOL', `Invalid symbol format: ${symbol}`, { symbol })
      this.logError(error)
      throw error
    }

    // 尝试从缓存获取
    if (this.cacheEnabled && useCache && this.cache) {
      try {
        const cacheKey = this.cache.generateKey(symbol, interval, startDate, endDate)
        const cachedData = await this.cache.get(cacheKey)
        
        if (cachedData) {
          console.log(`Cache hit for ${symbol}`)
          return cachedData
        }
      } catch (cacheError) {
        // 缓存错误不应该阻止数据获取
        console.warn('Cache read error:', cacheError)
      }
    }

    // 使用重试机制获取数据
    return await this.retryWithBackoff(
      () => this._fetchDataInternal(symbol, interval, startDate, endDate),
      { symbol, interval, startDate, endDate }
    )
  }

  /**
   * 内部数据获取方法（不包含重试逻辑）
   * @private
   */
  async _fetchDataInternal(symbol, interval, startDate, endDate) {
    try {
      // 构建查询参数
      const params = new URLSearchParams({
        interval: interval,
        includePrePost: 'false',
        events: 'div,splits'
      })

      // 添加时间范围
      if (startDate) {
        params.append('period1', Math.floor(startDate.getTime() / 1000))
      }
      if (endDate) {
        params.append('period2', Math.floor(endDate.getTime() / 1000))
      }

      // 如果没有指定时间范围，使用默认范围（最近1年）
      if (!startDate && !endDate) {
        const now = new Date()
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        params.append('period1', Math.floor(oneYearAgo.getTime() / 1000))
        params.append('period2', Math.floor(now.getTime() / 1000))
      }

      const url = `${this.baseUrl}/${symbol}?${params.toString()}`

      const response = await fetch(url, {
        timeout: 10000 // 10秒超时
      })

      // 处理HTTP错误
      if (!response.ok) {
        if (response.status === 404) {
          throw this.createError('SYMBOL_NOT_FOUND', `Symbol not found: ${symbol}`, { 
            symbol, 
            status: response.status 
          })
        } else if (response.status === 429) {
          throw this.createError('RATE_LIMIT', 'API rate limit exceeded', { 
            symbol, 
            status: response.status,
            retryable: true
          })
        } else if (response.status >= 500) {
          throw this.createError('SERVER_ERROR', `Server error: ${response.status}`, { 
            symbol, 
            status: response.status,
            retryable: true
          })
        } else {
          throw this.createError('HTTP_ERROR', `HTTP error: ${response.status} ${response.statusText}`, { 
            symbol, 
            status: response.status 
          })
        }
      }

      const data = await response.json()

      // 检查响应数据
      if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        // 检查是否有错误信息
        if (data.chart && data.chart.error) {
          throw this.createError('API_ERROR', data.chart.error.description || 'API error', {
            symbol,
            errorCode: data.chart.error.code
          })
        }
        throw this.createError('NO_DATA', `No data available for symbol: ${symbol}`, { symbol })
      }

      const result = data.chart.result[0]
      const timestamps = result.timestamp

      // 验证数据结构
      if (!result.indicators || !result.indicators.quote || !result.indicators.quote[0]) {
        throw this.createError('INVALID_DATA', 'Invalid data structure from API', { symbol })
      }

      const quotes = result.indicators.quote[0]

      // 验证数据完整性
      if (!timestamps || !quotes || timestamps.length === 0) {
        throw this.createError('INVALID_DATA', 'Invalid data structure from API', { symbol })
      }

      // 检测市场类型
      const market = this.detectMarket(symbol)

      // 转换为标准格式
      const marketData = []
      for (let i = 0; i < timestamps.length; i++) {
        // 跳过无效数据
        if (quotes.close[i] === null || quotes.close[i] === undefined) {
          continue
        }

        try {
          const normalized = this.normalizeData({
            timestamp: timestamps[i],
            open: quotes.open[i],
            high: quotes.high[i],
            low: quotes.low[i],
            close: quotes.close[i],
            volume: quotes.volume[i]
          }, symbol, market, interval)

          marketData.push(normalized)
        } catch (normalizeError) {
          // 记录标准化错误但继续处理其他数据
          console.warn(`Failed to normalize data point ${i}:`, normalizeError)
        }
      }

      if (marketData.length === 0) {
        throw this.createError('NO_VALID_DATA', 'No valid data points after normalization', { symbol })
      }

      // 存入缓存
      if (this.cacheEnabled && this.cache) {
        try {
          const cacheKey = this.cache.generateKey(symbol, interval, startDate, endDate)
          await this.cache.set(cacheKey, marketData, this.cacheTTL)
          console.log(`Cached data for ${symbol}`)
        } catch (cacheError) {
          // 缓存错误不应该阻止数据返回
          console.warn('Cache write error:', cacheError)
        }
      }

      return marketData
    } catch (error) {
      // 如果是网络错误或超时，标记为可重试
      if (
        (error.name === 'TypeError' && error.message.includes('fetch')) ||
        (error.name === 'TypeError' && /timeout|network timeout|network error/i.test(error.message)) ||
        /timeout|network error|network/i.test(error.message)
      ) {
        const networkError = this.createError('NETWORK_ERROR', 'Network connection failed', {
          symbol,
          originalError: error.message,
          retryable: true
        })
        this.logError(networkError)
        throw networkError
      }

      // 如果已经是我们的自定义错误，直接抛出
      if (error.code) {
        this.logError(error)
        throw error
      }

      // 其他未知错误
      const unknownError = this.createError('UNKNOWN_ERROR', error.message || 'Unknown error occurred', {
        symbol,
        originalError: error.toString()
      })
      this.logError(unknownError)
      throw unknownError
    }
  }

  /**
   * 获取实时报价（使用yfinance）
   * @param {string} symbol - 交易品种代码
   * @returns {Promise<Quote>}
   */
  async getRealtimeQuote(symbol) {
    try {
      // 获取最近的数据点作为实时报价
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000) // 最近24小时

      const data = await this.fetchData(symbol, '1m', startDate, endDate)

      if (data.length === 0) {
        const error = this.createError('NO_QUOTE_DATA', 'No quote data available', { symbol })
        this.logError(error)
        throw error
      }

      // 获取最新的数据点
      const latest = data[data.length - 1]
      const previous = data.length > 1 ? data[data.length - 2] : latest

      const change = latest.close - previous.close
      const changePercent = (change / previous.close) * 100

      return {
        symbol: symbol,
        price: latest.close,
        change: change,
        changePercent: changePercent,
        volume: latest.volume,
        timestamp: latest.timestamp
      }
    } catch (error) {
      // 如果已经是我们的错误，直接抛出
      if (error.code) {
        throw error
      }
      
      const quoteError = this.createError('QUOTE_ERROR', `Failed to fetch quote: ${error.message}`, {
        symbol,
        originalError: error.toString()
      })
      this.logError(quoteError)
      throw quoteError
    }
  }

  /**
   * 标准化数据格式
   * @param {Object} rawData - yfinance返回的原始数据
   * @param {string} symbol - 交易品种代码
   * @param {string} market - 市场类型
   * @param {string} interval - 时间周期
   * @returns {MarketData}
   */
  normalizeData(rawData, symbol, market, interval) {
    // 验证必需字段
    if (!rawData || typeof rawData !== 'object') {
      throw new Error('Invalid raw data')
    }

    // 转换时间戳
    const timestamp = rawData.timestamp instanceof Date
      ? rawData.timestamp
      : new Date(rawData.timestamp * 1000)

    // 确保价格为正数
    const open = Math.max(0, Number(rawData.open) || 0)
    const high = Math.max(0, Number(rawData.high) || 0)
    const low = Math.max(0, Number(rawData.low) || 0)
    const close = Math.max(0, Number(rawData.close) || 0)
    const volume = Math.max(0, Number(rawData.volume) || 0)

    // 验证价格关系：high >= max(open, close), low <= min(open, close)
    const maxPrice = Math.max(open, close)
    const minPrice = Math.min(open, close)
    const validHigh = Math.max(high, maxPrice)
    const validLow = low > 0 ? Math.min(low, minPrice) : minPrice

    return {
      timestamp: timestamp,
      symbol: symbol || '',
      market: market || 'US',
      open: open,
      high: validHigh,
      low: validLow,
      close: close,
      volume: volume,
      interval: interval || '1d'
    }
  }

  /**
   * 验证市场数据的有效性
   * @param {MarketData} data - 市场数据
   * @returns {boolean}
   */
  validateMarketData(data) {
    if (!data || typeof data !== 'object') {
      return false
    }

    // 检查必需字段
    const requiredFields = ['timestamp', 'symbol', 'market', 'open', 'high', 'low', 'close', 'volume', 'interval']
    for (const field of requiredFields) {
      if (!data.hasOwnProperty(field)) {
        return false
      }
    }

    // 检查价格为正数
    if (data.open <= 0 || data.high <= 0 || data.low <= 0 || data.close <= 0) {
      return false
    }

    // 检查价格关系
    const maxPrice = Math.max(data.open, data.close)
    const minPrice = Math.min(data.open, data.close)
    if (data.high < maxPrice || data.low > minPrice) {
      return false
    }

    // 检查成交量非负
    if (data.volume < 0) {
      return false
    }

    // 检查时间戳有效
    if (!(data.timestamp instanceof Date) || isNaN(data.timestamp.getTime())) {
      return false
    }

    return true
  }

  /**
   * 清空缓存
   * @returns {Promise<void>}
   */
  async clearCache() {
    if (this.cache) {
      await this.cache.clear()
    }
  }

  /**
   * 清理过期缓存
   * @returns {Promise<number>} 清理的条目数
   */
  async cleanExpiredCache() {
    if (this.cache) {
      return await this.cache.cleanExpired()
    }
    return 0
  }

  /**
   * 获取缓存统计信息
   * @returns {Promise<Object>}
   */
  async getCacheStats() {
    if (this.cache) {
      return await this.cache.getStats()
    }
    return null
  }

  /**
   * 关闭适配器（关闭缓存数据库连接）
   */
  close() {
    if (this.cache) {
      this.cache.close()
    }
  }

  /**
   * 验证symbol格式是否有效
   * @param {string} symbol - 交易品种代码
   * @returns {boolean}
   */
  isValidSymbol(symbol) {
    if (!symbol || typeof symbol !== 'string') {
      return false
    }

    // 基本格式验证
    const trimmed = symbol.trim()
    if (trimmed.length === 0 || trimmed.length > 20) {
      return false
    }

    // 不允许特殊字符（除了允许的分隔符）
    const validPattern = /^[A-Za-z0-9.\-=]+$/
    return validPattern.test(trimmed)
  }

  /**
   * 创建标准化错误对象
   * @param {string} code - 错误代码
   * @param {string} message - 错误消息
   * @param {Object} context - 错误上下文
   * @returns {Error}
   */
  createError(code, message, context = {}) {
    const error = new Error(message)
    error.code = code
    error.context = context
    error.timestamp = new Date()
    error.retryable = context.retryable || false
    return error
  }

  /**
   * 记录错误到日志
   * @param {Error} error - 错误对象
   */
  logError(error) {
    const logEntry = {
      code: error.code || 'UNKNOWN',
      message: error.message,
      context: error.context || {},
      timestamp: error.timestamp || new Date(),
      stack: error.stack
    }

    this.errorLog.push(logEntry)

    // 限制日志大小
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog.shift()
    }

    // 同时输出到控制台
    console.error(`[MarketDataAdapter Error] ${error.code}: ${error.message}`, error.context)
  }

  /**
   * 获取错误日志
   * @param {number} limit - 返回的最大条目数
   * @returns {Array}
   */
  getErrorLog(limit = 10) {
    return this.errorLog.slice(-limit)
  }

  /**
   * 清空错误日志
   */
  clearErrorLog() {
    this.errorLog = []
  }

  /**
   * 指数退避重试机制
   * @param {Function} fn - 要重试的函数
   * @param {Object} context - 函数上下文
   * @returns {Promise<any>}
   */
  async retryWithBackoff(fn, context = {}) {
    let lastError = null

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error

        // 如果错误不可重试，直接抛出
        if (!error.retryable && error.code !== 'NETWORK_ERROR' && error.code !== 'RATE_LIMIT' && error.code !== 'SERVER_ERROR') {
          throw error
        }

        // 如果是最后一次尝试，抛出错误
        if (attempt === this.maxRetries - 1) {
          const finalError = this.createError(
            'MAX_RETRIES_EXCEEDED',
            `Failed after ${this.maxRetries} attempts: ${error.message}`,
            {
              ...context,
              attempts: this.maxRetries,
              lastError: error.code
            }
          )
          this.logError(finalError)
          throw finalError
        }

        // 计算延迟时间（指数退避）
        const delay = Math.min(
          this.initialRetryDelay * Math.pow(2, attempt),
          this.maxRetryDelay
        )

        console.log(`Retry attempt ${attempt + 1}/${this.maxRetries} after ${delay}ms for ${context.symbol || 'unknown'}`)

        // 等待后重试
        await this.sleep(delay)
      }
    }

    // 理论上不会到达这里，但为了类型安全
    throw lastError
  }

  /**
   * 睡眠函数
   * @param {number} ms - 毫秒数
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export default MarketDataAdapter

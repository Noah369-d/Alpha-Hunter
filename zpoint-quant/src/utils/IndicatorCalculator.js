/**
 * 技术指标计算器
 * 计算各类技术指标：MA, RSI, MACD, 布林带, KDJ
 * 
 * 需求：3.1, 3.2, 3.3, 3.4, 3.5
 */

class IndicatorCalculator {
  /**
   * 计算移动平均线 (Moving Average)
   * @param {number[]} prices - 价格数组
   * @param {number} period - 周期
   * @returns {number[]} MA值数组
   */
  calculateMA(prices, period) {
    // 参数验证
    if (!Array.isArray(prices) || prices.length === 0) {
      throw new Error('Prices must be a non-empty array')
    }

    if (!Number.isInteger(period) || period <= 0) {
      throw new Error('Period must be a positive integer')
    }

    if (prices.length < period) {
      throw new Error(`Insufficient data: need at least ${period} data points, got ${prices.length}`)
    }

    // 验证所有价格都是有效数字
    if (!prices.every(p => typeof p === 'number' && !isNaN(p))) {
      throw new Error('All prices must be valid numbers')
    }

    const result = []

    // 计算每个窗口的平均值
    for (let i = period - 1; i < prices.length; i++) {
      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += prices[i - j]
      }
      result.push(sum / period)
    }

    return result
  }

  /**
   * 计算相对强弱指标 (Relative Strength Index)
   * @param {number[]} prices - 价格数组
   * @param {number} period - 周期（默认14）
   * @returns {number[]} RSI值数组
   */
  calculateRSI(prices, period = 14) {
    // 参数验证
    if (!Array.isArray(prices) || prices.length === 0) {
      throw new Error('Prices must be a non-empty array')
    }

    if (!Number.isInteger(period) || period <= 0) {
      throw new Error('Period must be a positive integer')
    }

    if (prices.length < period + 1) {
      throw new Error(`Insufficient data: need at least ${period + 1} data points, got ${prices.length}`)
    }

    // 清洗输入：移除 NaN/Infinity 等非有限值，保留有限数值
    const sanitized = prices.filter(p => typeof p === 'number' && Number.isFinite(p))

    // 若存在负值，则视为非法输入
    if (sanitized.some(p => p < 0)) {
      throw new Error('All prices must be valid non-negative numbers')
    }

    if (sanitized.length < period + 1) {
      throw new Error(`Insufficient data after filtering invalid values: need at least ${period + 1} valid data points, got ${sanitized.length}`)
    }

    // 使用清洗后的价格数组进行计算
    const cleanPrices = sanitized

    const result = []
    const gains = []
    const losses = []

    // 计算价格变化（基于清洗后的数组）
    for (let i = 1; i < cleanPrices.length; i++) {
      const change = cleanPrices[i] - cleanPrices[i - 1]
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? -change : 0)
    }

    // 计算第一个RSI值（使用简单平均）
    let avgGain = 0
    let avgLoss = 0
    for (let i = 0; i < period; i++) {
      avgGain += gains[i]
      avgLoss += losses[i]
    }
    avgGain /= period
    avgLoss /= period

    // 计算第一个RSI（处理 avgGain 与 avgLoss 都为0的特殊情况）
    let rsi
    if (avgGain === 0 && avgLoss === 0) {
      rsi = 50
    } else if (avgLoss === 0) {
      rsi = 100
    } else {
      const rs = avgGain / avgLoss
      rsi = 100 - (100 / (1 + rs))
    }
    result.push(rsi)

    // 使用指数移动平均计算后续RSI值
    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period

      if (avgGain === 0 && avgLoss === 0) {
        rsi = 50
      } else if (avgLoss === 0) {
        rsi = 100
      } else {
        const rs = avgGain / avgLoss
        rsi = 100 - (100 / (1 + rs))
      }

      result.push(rsi)
    }

    return result
  }

  /**
   * 计算MACD指标 (Moving Average Convergence Divergence)
   * @param {number[]} prices - 价格数组
   * @param {number} fastPeriod - 快线周期（默认12）
   * @param {number} slowPeriod - 慢线周期（默认26）
   * @param {number} signalPeriod - 信号线周期（默认9）
   * @returns {Object} {macd: number[], signal: number[], histogram: number[]}
   */
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    // 参数验证
    if (!Array.isArray(prices) || prices.length === 0) {
      throw new Error('Prices must be a non-empty array')
    }

    if (!Number.isInteger(fastPeriod) || fastPeriod <= 0) {
      throw new Error('Fast period must be a positive integer')
    }

    if (!Number.isInteger(slowPeriod) || slowPeriod <= 0) {
      throw new Error('Slow period must be a positive integer')
    }

    if (!Number.isInteger(signalPeriod) || signalPeriod <= 0) {
      throw new Error('Signal period must be a positive integer')
    }

    if (fastPeriod >= slowPeriod) {
      throw new Error('Fast period must be less than slow period')
    }

    const minLength = slowPeriod + signalPeriod - 1
    if (prices.length < minLength) {
      throw new Error(`Insufficient data: need at least ${minLength} data points, got ${prices.length}`)
    }

    // 验证所有价格都是有效数字
    if (!prices.every(p => typeof p === 'number' && !isNaN(p))) {
      throw new Error('All prices must be valid numbers')
    }

    // 计算EMA
    const fastEMA = this._calculateEMA(prices, fastPeriod)
    const slowEMA = this._calculateEMA(prices, slowPeriod)

    // 计算MACD线（快线 - 慢线）
    const macdLine = []
    const startIndex = slowPeriod - 1
    for (let i = 0; i < slowEMA.length; i++) {
      macdLine.push(fastEMA[i + (fastPeriod - 1)] - slowEMA[i])
    }

    // 计算信号线（MACD的EMA）
    const signalLine = this._calculateEMA(macdLine, signalPeriod)

    // 计算柱状图（MACD - 信号线）
    const histogram = []
    const signalStartIndex = signalPeriod - 1
    for (let i = 0; i < signalLine.length; i++) {
      histogram.push(macdLine[i + signalStartIndex] - signalLine[i])
    }

    // 对齐所有数组长度
    const finalLength = histogram.length
    const macdStartIndex = macdLine.length - finalLength
    const signalStartIndex2 = signalLine.length - finalLength

    return {
      macd: macdLine.slice(macdStartIndex),
      signal: signalLine.slice(signalStartIndex2),
      histogram: histogram
    }
  }

  /**
   * 计算布林带 (Bollinger Bands)
   * @param {number[]} prices - 价格数组
   * @param {number} period - 周期（默认20）
   * @param {number} stdDev - 标准差倍数（默认2）
   * @returns {Object} {upper: number[], middle: number[], lower: number[]}
   */
  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    // 参数验证
    if (!Array.isArray(prices) || prices.length === 0) {
      throw new Error('Prices must be a non-empty array')
    }

    if (!Number.isInteger(period) || period <= 0) {
      throw new Error('Period must be a positive integer')
    }

    if (typeof stdDev !== 'number' || stdDev <= 0) {
      throw new Error('Standard deviation multiplier must be a positive number')
    }

    if (prices.length < period) {
      throw new Error(`Insufficient data: need at least ${period} data points, got ${prices.length}`)
    }

    // 验证所有价格都是有效数字
    if (!prices.every(p => typeof p === 'number' && !isNaN(p))) {
      throw new Error('All prices must be valid numbers')
    }

    const middle = this.calculateMA(prices, period)
    const upper = []
    const lower = []

    // 计算每个窗口的标准差
    for (let i = period - 1; i < prices.length; i++) {
      // 计算均值
      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += prices[i - j]
      }
      const mean = sum / period

      // 计算标准差
      let variance = 0
      for (let j = 0; j < period; j++) {
        const diff = prices[i - j] - mean
        variance += diff * diff
      }
      const std = Math.sqrt(variance / period)

      // 计算上下轨
      const idx = i - period + 1
      upper.push(middle[idx] + stdDev * std)
      lower.push(middle[idx] - stdDev * std)
    }

    return {
      upper,
      middle,
      lower
    }
  }

  /**
   * 计算KDJ指标
   * @param {Object[]} klines - K线数据数组 [{high, low, close}, ...]
   * @param {number} period - 周期（默认9）
   * @returns {Object} {k: number[], d: number[], j: number[]}
   */
  calculateKDJ(klines, period = 9) {
    // 参数验证
    if (!Array.isArray(klines) || klines.length === 0) {
      throw new Error('Klines must be a non-empty array')
    }

    if (!Number.isInteger(period) || period <= 0) {
      throw new Error('Period must be a positive integer')
    }

    if (klines.length < period) {
      throw new Error(`Insufficient data: need at least ${period} data points, got ${klines.length}`)
    }

    // 验证K线数据格式
    if (!klines.every(k => 
      k && typeof k === 'object' &&
      typeof k.high === 'number' && !isNaN(k.high) &&
      typeof k.low === 'number' && !isNaN(k.low) &&
      typeof k.close === 'number' && !isNaN(k.close) &&
      k.high >= k.low && k.close >= k.low && k.close <= k.high
    )) {
      throw new Error('All klines must have valid high, low, and close values')
    }

    const k = []
    const d = []
    const j = []

    let prevK = 50 // 初始K值
    let prevD = 50 // 初始D值

    for (let i = period - 1; i < klines.length; i++) {
      // 找出周期内的最高价和最低价
      let highest = klines[i].high
      let lowest = klines[i].low

      for (let j = 0; j < period; j++) {
        const idx = i - j
        if (klines[idx].high > highest) highest = klines[idx].high
        if (klines[idx].low < lowest) lowest = klines[idx].low
      }

      // 计算RSV (Raw Stochastic Value)
      const rsv = highest === lowest ? 50 : ((klines[i].close - lowest) / (highest - lowest)) * 100

      // 计算K值（使用平滑）
      const currentK = (2 * prevK + rsv) / 3
      k.push(currentK)

      // 计算D值（使用平滑）
      const currentD = (2 * prevD + currentK) / 3
      d.push(currentD)

      // 计算J值
      const currentJ = 3 * currentK - 2 * currentD
      j.push(currentJ)

      // 更新前值
      prevK = currentK
      prevD = currentD
    }

    return { k, d, j }
  }

  /**
   * 计算指数移动平均 (Exponential Moving Average)
   * @private
   * @param {number[]} prices - 价格数组
   * @param {number} period - 周期
   * @returns {number[]} EMA值数组
   */
  _calculateEMA(prices, period) {
    const result = []
    const multiplier = 2 / (period + 1)

    // 第一个EMA值使用简单移动平均
    let sum = 0
    for (let i = 0; i < period; i++) {
      sum += prices[i]
    }
    let ema = sum / period
    result.push(ema)

    // 后续EMA值使用指数平滑
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema
      result.push(ema)
    }

    return result
  }
}

export default IndicatorCalculator

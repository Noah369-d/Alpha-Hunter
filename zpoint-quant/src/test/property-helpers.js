/**
 * 属性测试辅助函数
 * 使用fast-check进行基于属性的测试
 */

import fc from 'fast-check'

/**
 * 生成市场数据的arbitrary
 */
export const arbitraryMarketData = () => {
  return fc.record({
    timestamp: fc.date(),
    symbol: fc.string({ minLength: 1, maxLength: 10 }),
    market: fc.constantFrom('US', 'HK', 'CN', 'CRYPTO', 'FUTURES'),
    open: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
    high: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
    low: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
    close: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
    volume: fc.float({ min: Math.fround(0), max: Math.fround(1000000000), noNaN: true }),
    interval: fc.constantFrom('1m', '5m', '15m', '1h', '1d')
  }).map(data => {
    // 确保high >= max(open, close) 且 low <= min(open, close)
    const maxPrice = Math.max(data.open, data.close)
    const minPrice = Math.min(data.open, data.close)
    return {
      ...data,
      high: Math.max(data.high, maxPrice),
      low: Math.min(data.low, minPrice)
    }
  })
}

/**
 * 生成价格序列的arbitrary
 */
export const arbitraryPriceArray = (minLength = 10, maxLength = 200) => {
  return fc.array(
    fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }),
    { minLength, maxLength }
  )
}

/**
 * 生成策略对象的arbitrary
 */
export const arbitraryStrategy = () => {
  return fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }),
    code: fc.string({ minLength: 10, maxLength: 1000 }),
    description: fc.string({ maxLength: 200 }),
    config: fc.record({
      market: fc.constantFrom('US', 'HK', 'CN', 'CRYPTO', 'FUTURES'),
      symbols: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }),
      interval: fc.constantFrom('1m', '5m', '15m', '1h', '1d'),
      indicators: fc.array(fc.record({
        type: fc.constantFrom('MA', 'RSI', 'MACD', 'BOLLINGER', 'KDJ'),
        period: fc.integer({ min: 5, max: 200 })
      })),
      parameters: fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.float()))
    })
  }).map(data => ({
    ...data,
    id: `strategy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    status: 'inactive',
    createdAt: new Date(),
    updatedAt: new Date()
  }))
}

/**
 * 生成交易信号的arbitrary
 */
export const arbitrarySignal = () => {
  return fc.record({
    strategyId: fc.string({ minLength: 10, maxLength: 50 }),
    strategyName: fc.string({ minLength: 1, maxLength: 50 }),
    symbol: fc.string({ minLength: 1, maxLength: 10 }),
    market: fc.constantFrom('US', 'HK', 'CN', 'CRYPTO', 'FUTURES'),
    type: fc.constantFrom('BUY', 'SELL'),
    price: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
    strength: fc.integer({ min: 0, max: 100 }),
    timestamp: fc.date(),
    conditions: fc.array(fc.record({
      indicator: fc.string(),
      operator: fc.constantFrom('>', '<', '>=', '<=', '=='),
      value: fc.float({ noNaN: true })
    })),
    indicators: fc.dictionary(fc.string(), fc.float({ noNaN: true }))
  }).map(data => ({
    ...data,
    id: `signal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }))
}

/**
 * 生成交易记录的arbitrary
 */
export const arbitraryTrade = () => {
  return fc.record({
    strategyId: fc.string({ minLength: 10, maxLength: 50 }),
    symbol: fc.string({ minLength: 1, maxLength: 10 }),
    market: fc.constantFrom('US', 'HK', 'CN', 'CRYPTO', 'FUTURES'),
    type: fc.constantFrom('BUY', 'SELL'),
    entryPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
    exitPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
    quantity: fc.integer({ min: 1, max: 10000 }),
    entryTime: fc.date(),
    exitTime: fc.date(),
    commission: fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
    slippage: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true })
  }).map(data => {
    const profit = (data.exitPrice - data.entryPrice) * data.quantity - data.commission - data.slippage
    const profitPercent = (profit / (data.entryPrice * data.quantity)) * 100
    return {
      ...data,
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      profit,
      profitPercent
    }
  })
}

/**
 * 生成持仓的arbitrary
 */
export const arbitraryPosition = () => {
  return fc.record({
    symbol: fc.string({ minLength: 1, maxLength: 10 }),
    market: fc.constantFrom('US', 'HK', 'CN', 'CRYPTO', 'FUTURES'),
    quantity: fc.integer({ min: 1, max: 10000 }),
    entryPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
    currentPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
    stopLoss: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
    takeProfit: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
    entryTime: fc.date()
  }).map(data => ({
    ...data,
    unrealizedPnL: (data.currentPrice - data.entryPrice) * data.quantity
  }))
}

/**
 * 生成投资组合的arbitrary
 */
export const arbitraryPortfolio = () => {
  return fc.record({
    cash: fc.float({ min: Math.fround(0), max: Math.fround(1000000), noNaN: true }),
    positions: fc.array(arbitraryPosition(), { maxLength: 10 })
  }).map(data => {
    const positionsValue = data.positions.reduce((sum, pos) => sum + pos.currentPrice * pos.quantity, 0)
    const totalValue = data.cash + positionsValue
    const equity = totalValue
    return {
      ...data,
      totalValue,
      equity,
      peakEquity: equity * 1.1, // 假设峰值比当前高10%
      drawdown: 0.05, // 假设当前回撤5%
      maxDrawdown: 0.15 // 假设最大回撤15%
    }
  })
}

/**
 * 属性测试配置
 */
export const propertyTestConfig = {
  numRuns: 100, // 每个属性测试运行100次
  verbose: false,
  seed: undefined, // 可以设置固定种子以重现测试
  path: undefined,
  endOnFailure: false
}

/**
 * 运行属性测试的辅助函数
 */
export const runPropertyTest = (name, property, config = {}) => {
  const finalConfig = { ...propertyTestConfig, ...config }
  return fc.assert(property, finalConfig)
}

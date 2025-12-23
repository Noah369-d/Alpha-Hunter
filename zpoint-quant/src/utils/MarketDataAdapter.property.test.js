import { describe, it, beforeEach } from 'vitest'
import fc from 'fast-check'
import MarketDataAdapter from './MarketDataAdapter'

describe('MarketDataAdapter - 属性测试', () => {
  let adapter

  beforeEach(() => {
    adapter = new MarketDataAdapter()
  })

  it('Property 1: 市场数据标准化一致性', () => {
    // Feature: zpoint-quant, Property 1: 市场数据标准化一致性
    // 验证需求：1.1, 1.2, 1.3, 1.4, 1.5, 1.6
    
    fc.assert(
      fc.property(
        fc.constantFrom('US', 'HK', 'CN', 'CRYPTO', 'FUTURES'),
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.record({
          timestamp: fc.oneof(
            fc.date(),
            fc.integer({ min: 1000000000, max: 2000000000 }) // Unix timestamp
          ),
          open: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
          high: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
          low: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
          close: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
          volume: fc.float({ min: Math.fround(0), max: Math.fround(1000000000), noNaN: true })
        }),
        fc.constantFrom('1m', '5m', '15m', '1h', '1d'),
        (market, symbol, rawData, interval) => {
          // 标准化数据
          const normalized = adapter.normalizeData(rawData, symbol, market, interval)
          
          // 验证所有必需字段存在
          const hasAllFields = 
            normalized.hasOwnProperty('timestamp') &&
            normalized.hasOwnProperty('symbol') &&
            normalized.hasOwnProperty('market') &&
            normalized.hasOwnProperty('open') &&
            normalized.hasOwnProperty('high') &&
            normalized.hasOwnProperty('low') &&
            normalized.hasOwnProperty('close') &&
            normalized.hasOwnProperty('volume') &&
            normalized.hasOwnProperty('interval')
          
          if (!hasAllFields) {
            return false
          }
          
          // 验证字段值有效
          const validValues = 
            normalized.timestamp instanceof Date &&
            !isNaN(normalized.timestamp.getTime()) &&
            normalized.open > 0 &&
            normalized.high > 0 &&
            normalized.low > 0 &&
            normalized.close > 0 &&
            normalized.volume >= 0
          
          if (!validValues) {
            return false
          }
          
          // 验证价格关系：high >= max(open, close), low <= min(open, close)
          const maxPrice = Math.max(normalized.open, normalized.close)
          const minPrice = Math.min(normalized.open, normalized.close)
          const validPriceRelations = 
            normalized.high >= maxPrice &&
            normalized.low <= minPrice
          
          if (!validPriceRelations) {
            return false
          }
          
          // 验证字段类型
          const validTypes =
            typeof normalized.symbol === 'string' &&
            typeof normalized.market === 'string' &&
            typeof normalized.open === 'number' &&
            typeof normalized.high === 'number' &&
            typeof normalized.low === 'number' &&
            typeof normalized.close === 'number' &&
            typeof normalized.volume === 'number' &&
            typeof normalized.interval === 'string'
          
          return validTypes
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property: 市场类型检测一致性', () => {
    // 验证市场类型检测对于相同格式的代码返回相同的市场类型
    
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 6 }),
        fc.constantFrom('.HK', '.SS', '.SZ', '-USD', '=F', ''),
        (base, suffix) => {
          const symbol = base + suffix
          
          try {
            const market1 = adapter.detectMarket(symbol)
            const market2 = adapter.detectMarket(symbol)
            
            // 相同的代码应该返回相同的市场类型
            if (market1 !== market2) {
              return false
            }
            
            // 验证返回的市场类型是有效的
            const validMarkets = ['US', 'HK', 'CN', 'CRYPTO', 'FUTURES']
            return validMarkets.includes(market1)
          } catch (error) {
            // 如果抛出错误，应该是因为无效的输入
            return symbol === '' || symbol === null || symbol === undefined
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property: 数据验证的对称性', () => {
    // 如果数据通过验证，那么它应该包含所有必需的字段
    
    fc.assert(
      fc.property(
        fc.record({
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
          // 确保价格关系正确
          const maxPrice = Math.max(data.open, data.close)
          const minPrice = Math.min(data.open, data.close)
          return {
            ...data,
            high: Math.max(data.high, maxPrice),
            low: Math.min(data.low, minPrice)
          }
        }),
        (data) => {
          const isValid = adapter.validateMarketData(data)
          
          if (isValid) {
            // 如果验证通过，所有字段应该存在且有效
            return (
              data.hasOwnProperty('timestamp') &&
              data.hasOwnProperty('symbol') &&
              data.hasOwnProperty('market') &&
              data.hasOwnProperty('open') &&
              data.hasOwnProperty('high') &&
              data.hasOwnProperty('low') &&
              data.hasOwnProperty('close') &&
              data.hasOwnProperty('volume') &&
              data.hasOwnProperty('interval') &&
              data.open > 0 &&
              data.high > 0 &&
              data.low > 0 &&
              data.close > 0 &&
              data.volume >= 0
            )
          }
          
          return true // 如果验证失败，属性仍然成立
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property: 标准化是幂等的', () => {
    // 对已标准化的数据再次标准化应该得到相同的结果
    
    fc.assert(
      fc.property(
        fc.record({
          timestamp: fc.integer({ min: 1000000000, max: 2000000000 }),
          open: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
          high: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
          low: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
          close: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
          volume: fc.float({ min: Math.fround(0), max: Math.fround(1000000000), noNaN: true })
        }),
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.constantFrom('US', 'HK', 'CN', 'CRYPTO', 'FUTURES'),
        fc.constantFrom('1m', '5m', '15m', '1h', '1d'),
        (rawData, symbol, market, interval) => {
          const normalized1 = adapter.normalizeData(rawData, symbol, market, interval)
          
          // 将标准化后的数据转换回原始格式
          const rawFromNormalized = {
            timestamp: normalized1.timestamp,
            open: normalized1.open,
            high: normalized1.high,
            low: normalized1.low,
            close: normalized1.close,
            volume: normalized1.volume
          }
          
          // 再次标准化
          const normalized2 = adapter.normalizeData(rawFromNormalized, symbol, market, interval)
          
          // 两次标准化的结果应该相同
          return (
            normalized1.open === normalized2.open &&
            normalized1.high === normalized2.high &&
            normalized1.low === normalized2.low &&
            normalized1.close === normalized2.close &&
            normalized1.volume === normalized2.volume &&
            normalized1.symbol === normalized2.symbol &&
            normalized1.market === normalized2.market &&
            normalized1.interval === normalized2.interval
          )
        }
      ),
      { numRuns: 100 }
    )
  })
})

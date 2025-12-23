import { describe, it, expect, beforeEach } from 'vitest'
import MarketDataAdapter from './MarketDataAdapter'

describe('MarketDataAdapter', () => {
  let adapter

  beforeEach(() => {
    adapter = new MarketDataAdapter()
  })

  describe('detectMarket', () => {
    it('应该识别美股代码', () => {
      expect(adapter.detectMarket('AAPL')).toBe('US')
      expect(adapter.detectMarket('MSFT')).toBe('US')
      expect(adapter.detectMarket('TSLA')).toBe('US')
    })

    it('应该识别港股代码', () => {
      expect(adapter.detectMarket('0700.HK')).toBe('HK')
      expect(adapter.detectMarket('9988.HK')).toBe('HK')
    })

    it('应该识别A股代码', () => {
      expect(adapter.detectMarket('000001.SS')).toBe('CN')
      expect(adapter.detectMarket('000001.SZ')).toBe('CN')
    })

    it('应该识别加密货币代码', () => {
      expect(adapter.detectMarket('BTC-USD')).toBe('CRYPTO')
      expect(adapter.detectMarket('ETH-USD')).toBe('CRYPTO')
    })

    it('应该识别期货代码', () => {
      expect(adapter.detectMarket('ES=F')).toBe('FUTURES')
      expect(adapter.detectMarket('GC=F')).toBe('FUTURES')
    })

    it('应该处理小写代码', () => {
      expect(adapter.detectMarket('aapl')).toBe('US')
      expect(adapter.detectMarket('btc-usd')).toBe('CRYPTO')
    })

    it('应该在无效输入时抛出错误', () => {
      expect(() => adapter.detectMarket('')).toThrow('Invalid symbol')
      expect(() => adapter.detectMarket(null)).toThrow('Invalid symbol')
      expect(() => adapter.detectMarket(undefined)).toThrow('Invalid symbol')
    })
  })

  describe('normalizeData', () => {
    it('应该标准化有效的市场数据', () => {
      const rawData = {
        timestamp: 1609459200, // Unix timestamp
        open: 100,
        high: 105,
        low: 98,
        close: 103,
        volume: 1000000
      }

      const normalized = adapter.normalizeData(rawData, 'AAPL', 'US', '1d')

      expect(normalized).toHaveProperty('timestamp')
      expect(normalized.timestamp).toBeInstanceOf(Date)
      expect(normalized.symbol).toBe('AAPL')
      expect(normalized.market).toBe('US')
      expect(normalized.open).toBe(100)
      expect(normalized.high).toBe(105)
      expect(normalized.low).toBe(98)
      expect(normalized.close).toBe(103)
      expect(normalized.volume).toBe(1000000)
      expect(normalized.interval).toBe('1d')
    })

    it('应该处理Date对象作为时间戳', () => {
      const date = new Date('2024-01-01')
      const rawData = {
        timestamp: date,
        open: 100,
        high: 105,
        low: 98,
        close: 103,
        volume: 1000000
      }

      const normalized = adapter.normalizeData(rawData, 'AAPL', 'US', '1d')
      expect(normalized.timestamp).toBe(date)
    })

    it('应该修正无效的价格关系', () => {
      const rawData = {
        timestamp: new Date(),
        open: 100,
        high: 95, // 错误：high < open
        low: 105, // 错误：low > close
        close: 103,
        volume: 1000000
      }

      const normalized = adapter.normalizeData(rawData, 'AAPL', 'US', '1d')

      // high应该被修正为至少等于max(open, close)
      expect(normalized.high).toBeGreaterThanOrEqual(Math.max(100, 103))

      // low应该被修正为不大于min(open, close)
      expect(normalized.low).toBeLessThanOrEqual(Math.min(100, 103))
    })

    it('应该确保价格为正数', () => {
      const rawData = {
        timestamp: new Date(),
        open: -100,
        high: -95,
        low: -105,
        close: -103,
        volume: -1000
      }

      const normalized = adapter.normalizeData(rawData, 'AAPL', 'US', '1d')

      expect(normalized.open).toBeGreaterThanOrEqual(0)
      expect(normalized.high).toBeGreaterThanOrEqual(0)
      expect(normalized.low).toBeGreaterThanOrEqual(0)
      expect(normalized.close).toBeGreaterThanOrEqual(0)
      expect(normalized.volume).toBeGreaterThanOrEqual(0)
    })

    it('应该处理缺失的可选参数', () => {
      const rawData = {
        timestamp: new Date(),
        open: 100,
        high: 105,
        low: 98,
        close: 103,
        volume: 1000000
      }

      const normalized = adapter.normalizeData(rawData)

      expect(normalized.symbol).toBe('')
      expect(normalized.market).toBe('US')
      expect(normalized.interval).toBe('1d')
    })

    it('应该在无效输入时抛出错误', () => {
      expect(() => adapter.normalizeData(null)).toThrow('Invalid raw data')
      expect(() => adapter.normalizeData(undefined)).toThrow('Invalid raw data')
      expect(() => adapter.normalizeData('invalid')).toThrow('Invalid raw data')
    })
  })

  describe('validateMarketData', () => {
    it('应该验证有效的市场数据', () => {
      const validData = {
        timestamp: new Date(),
        symbol: 'AAPL',
        market: 'US',
        open: 100,
        high: 105,
        low: 98,
        close: 103,
        volume: 1000000,
        interval: '1d'
      }

      expect(adapter.validateMarketData(validData)).toBe(true)
    })

    it('应该拒绝缺少必需字段的数据', () => {
      const invalidData = {
        timestamp: new Date(),
        symbol: 'AAPL',
        // 缺少其他字段
      }

      expect(adapter.validateMarketData(invalidData)).toBe(false)
    })

    it('应该拒绝负价格', () => {
      const invalidData = {
        timestamp: new Date(),
        symbol: 'AAPL',
        market: 'US',
        open: -100,
        high: 105,
        low: 98,
        close: 103,
        volume: 1000000,
        interval: '1d'
      }

      expect(adapter.validateMarketData(invalidData)).toBe(false)
    })

    it('应该拒绝无效的价格关系', () => {
      const invalidData = {
        timestamp: new Date(),
        symbol: 'AAPL',
        market: 'US',
        open: 100,
        high: 95, // high < open
        low: 98,
        close: 103,
        volume: 1000000,
        interval: '1d'
      }

      expect(adapter.validateMarketData(invalidData)).toBe(false)
    })

    it('应该拒绝负成交量', () => {
      const invalidData = {
        timestamp: new Date(),
        symbol: 'AAPL',
        market: 'US',
        open: 100,
        high: 105,
        low: 98,
        close: 103,
        volume: -1000,
        interval: '1d'
      }

      expect(adapter.validateMarketData(invalidData)).toBe(false)
    })

    it('应该拒绝无效的时间戳', () => {
      const invalidData = {
        timestamp: 'invalid',
        symbol: 'AAPL',
        market: 'US',
        open: 100,
        high: 105,
        low: 98,
        close: 103,
        volume: 1000000,
        interval: '1d'
      }

      expect(adapter.validateMarketData(invalidData)).toBe(false)
    })

    it('应该拒绝null或undefined', () => {
      expect(adapter.validateMarketData(null)).toBe(false)
      expect(adapter.validateMarketData(undefined)).toBe(false)
    })
  })
})


  describe('缓存功能', () => {
    it('应该能够启用缓存', () => {
      const adapterWithCache = new MarketDataAdapter({ cacheEnabled: true })
      expect(adapterWithCache.cacheEnabled).toBe(true)
      expect(adapterWithCache.cache).not.toBeNull()
      adapterWithCache.close()
    })

    it('应该能够禁用缓存', () => {
      const adapterWithoutCache = new MarketDataAdapter({ cacheEnabled: false })
      expect(adapterWithoutCache.cacheEnabled).toBe(false)
      expect(adapterWithoutCache.cache).toBeNull()
    })

    it('应该能够设置自定义缓存TTL', () => {
      const customTTL = 10 * 60 * 1000 // 10分钟
      const adapterWithCustomTTL = new MarketDataAdapter({ cacheTTL: customTTL })
      expect(adapterWithCustomTTL.cacheTTL).toBe(customTTL)
      adapterWithCustomTTL.close()
    })

    it('应该能够清空缓存', async () => {
      const adapterWithCache = new MarketDataAdapter({ cacheEnabled: true })
      await adapterWithCache.clearCache()
      adapterWithCache.close()
    })

    it('应该能够清理过期缓存', async () => {
      const adapterWithCache = new MarketDataAdapter({ cacheEnabled: true })
      const count = await adapterWithCache.cleanExpiredCache()
      expect(typeof count).toBe('number')
      adapterWithCache.close()
    })

    it('应该能够获取缓存统计', async () => {
      const adapterWithCache = new MarketDataAdapter({ cacheEnabled: true })
      const stats = await adapterWithCache.getCacheStats()
      
      if (stats) {
        expect(stats).toHaveProperty('totalEntries')
        expect(stats).toHaveProperty('activeEntries')
        expect(stats).toHaveProperty('maxSize')
      }
      
      adapterWithCache.close()
    })

    it('禁用缓存时getCacheStats应该返回null', async () => {
      const adapterWithoutCache = new MarketDataAdapter({ cacheEnabled: false })
      const stats = await adapterWithoutCache.getCacheStats()
      expect(stats).toBeNull()
    })
  })

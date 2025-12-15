/**
 * SignalGenerator 单元测试
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import SignalGenerator from './SignalGenerator.js'

describe('SignalGenerator', () => {
  let generator
  let mockStrategy
  let mockData

  beforeEach(() => {
    generator = new SignalGenerator()

    mockStrategy = {
      id: 'strategy_123',
      name: 'Test Strategy',
      code: `
        function onSignal(data, indicators) {
          if (data.close > 100) {
            return {
              type: 'BUY',
              price: data.close,
              strength: 75,
              conditions: ['price > 100']
            }
          }
          return null
        }
      `
    }

    mockData = {
      symbol: 'AAPL',
      market: 'US',
      close: 150,
      open: 145,
      high: 155,
      low: 144,
      volume: 1000000,
      timestamp: new Date()
    }
  })

  afterEach(async () => {
    // 清理测试数据
    if (generator.db) {
      await generator.clearSignalHistory()
    }
  })

  // ========== 信号生成测试 ==========

  describe('generateSignal', () => {
    test('should generate valid signal when strategy conditions are met', () => {
      const signal = generator.generateSignal(mockStrategy, mockData)

      expect(signal).toBeDefined()
      expect(signal.id).toBeDefined()
      expect(signal.strategyId).toBe('strategy_123')
      expect(signal.strategyName).toBe('Test Strategy')
      expect(signal.symbol).toBe('AAPL')
      expect(signal.market).toBe('US')
      expect(signal.type).toBe('BUY')
      expect(signal.price).toBe(150)
      expect(signal.strength).toBe(75)
      expect(signal.timestamp).toBeInstanceOf(Date)
      expect(signal.conditions).toEqual(['price > 100'])
    })

    test('should return null when strategy conditions are not met', () => {
      const lowPriceData = { ...mockData, close: 50 }
      const signal = generator.generateSignal(mockStrategy, lowPriceData)

      expect(signal).toBeNull()
    })

    test('should throw error when strategy is missing', () => {
      expect(() => {
        generator.generateSignal(null, mockData)
      }).toThrow('Strategy and current data are required')
    })

    test('should throw error when current data is missing', () => {
      expect(() => {
        generator.generateSignal(mockStrategy, null)
      }).toThrow('Strategy and current data are required')
    })

    test('should throw error when strategy code is missing', () => {
      const invalidStrategy = { ...mockStrategy, code: '' }
      expect(() => {
        generator.generateSignal(invalidStrategy, mockData)
      }).toThrow('Strategy code is required')
    })

    test('should throw error for invalid signal type', () => {
      const invalidStrategy = {
        ...mockStrategy,
        code: `
          function onSignal(data) {
            return { type: 'INVALID', price: data.close }
          }
        `
      }

      expect(() => {
        generator.generateSignal(invalidStrategy, mockData)
      }).toThrow('Invalid signal type')
    })

    test('should throw error for invalid signal strength', () => {
      const invalidStrategy = {
        ...mockStrategy,
        code: `
          function onSignal(data) {
            return { type: 'BUY', price: data.close, strength: 150 }
          }
        `
      }

      expect(() => {
        generator.generateSignal(invalidStrategy, mockData)
      }).toThrow('Signal strength must be between 0 and 100')
    })

    test('should use default strength when not provided', () => {
      const simpleStrategy = {
        ...mockStrategy,
        code: `
          function onSignal(data) {
            return { type: 'BUY', price: data.close }
          }
        `
      }

      const signal = generator.generateSignal(simpleStrategy, mockData)
      expect(signal.strength).toBe(50)
    })

    test('should use close price when signal price not provided', () => {
      const simpleStrategy = {
        ...mockStrategy,
        code: `
          function onSignal(data) {
            return { type: 'BUY', strength: 60 }
          }
        `
      }

      const signal = generator.generateSignal(simpleStrategy, mockData)
      expect(signal.price).toBe(150)
    })

    test('should include indicators in signal', () => {
      const indicators = {
        ma20: 145,
        rsi: 65,
        macd: { macd: 2.5, signal: 2.0, histogram: 0.5 }
      }

      const signal = generator.generateSignal(mockStrategy, mockData, indicators)
      expect(signal.indicators).toEqual(indicators)
    })

    test('should generate SELL signal', () => {
      const sellStrategy = {
        ...mockStrategy,
        code: `
          function onSignal(data) {
            if (data.close < 100) {
              return { type: 'SELL', price: data.close, strength: 80 }
            }
            return null
          }
        `
      }

      const lowPriceData = { ...mockData, close: 50 }
      const signal = generator.generateSignal(sellStrategy, lowPriceData)

      expect(signal.type).toBe('SELL')
      expect(signal.strength).toBe(80)
    })

    test('should handle strategy execution errors', () => {
      const errorStrategy = {
        ...mockStrategy,
        code: `
          function onSignal(data) {
            throw new Error('Strategy error')
          }
        `
      }

      expect(() => {
        generator.generateSignal(errorStrategy, mockData)
      }).toThrow('Failed to generate signal')
    })
  })

  // ========== 信号强度评估测试 ==========

  describe('evaluateSignalStrength', () => {
    test('should return original strength with no context', () => {
      const signal = { type: 'BUY', strength: 60 }
      const strength = generator.evaluateSignalStrength(signal)

      expect(strength).toBe(60)
    })

    test('should increase strength for high volume', () => {
      const signal = { type: 'BUY', strength: 60 }
      const context = { volume: 1500000, avgVolume: 1000000 }
      const strength = generator.evaluateSignalStrength(signal, context)

      expect(strength).toBeGreaterThan(60)
      expect(strength).toBeLessThanOrEqual(100)
    })

    test('should decrease strength for high volatility', () => {
      const signal = { type: 'BUY', strength: 60 }
      const context = { volatility: 0.05 }
      const strength = generator.evaluateSignalStrength(signal, context)

      expect(strength).toBeLessThan(60)
      expect(strength).toBeGreaterThanOrEqual(0)
    })

    test('should increase strength when trend matches signal', () => {
      const buySignal = { type: 'BUY', strength: 60 }
      const context = { trend: 'UP' }
      const strength = generator.evaluateSignalStrength(buySignal, context)

      expect(strength).toBeGreaterThan(60)
    })

    test('should not increase strength when trend opposes signal', () => {
      const buySignal = { type: 'BUY', strength: 60 }
      const context = { trend: 'DOWN' }
      const strength = generator.evaluateSignalStrength(buySignal, context)

      expect(strength).toBe(60)
    })

    test('should cap strength at 100', () => {
      const signal = { type: 'BUY', strength: 95 }
      const context = { volume: 2000000, avgVolume: 1000000, trend: 'UP' }
      const strength = generator.evaluateSignalStrength(signal, context)

      expect(strength).toBe(100)
    })

    test('should floor strength at 0', () => {
      const signal = { type: 'BUY', strength: 5 }
      const context = { volatility: 0.1 }
      const strength = generator.evaluateSignalStrength(signal, context)

      expect(strength).toBe(0)
    })

    test('should throw error when signal is missing', () => {
      expect(() => {
        generator.evaluateSignalStrength(null)
      }).toThrow('Signal is required')
    })

    test('should use default strength of 50 when not provided', () => {
      const signal = { type: 'BUY' }
      const strength = generator.evaluateSignalStrength(signal)

      expect(strength).toBe(50)
    })
  })

  // ========== 信号记录测试 ==========

  describe('logSignal', () => {
    test('should log signal to IndexedDB', async () => {
      const signal = generator.generateSignal(mockStrategy, mockData)
      await generator.logSignal(signal)

      const history = await generator.getSignalHistory()
      expect(history.length).toBeGreaterThan(0)
      expect(history[0].id).toBe(signal.id)
    })

    test('should throw error when signal is missing', async () => {
      await expect(generator.logSignal(null)).rejects.toThrow('Signal is required')
    })

    test('should throw error when required field is missing', async () => {
      const invalidSignal = { id: '123', type: 'BUY' }
      await expect(generator.logSignal(invalidSignal)).rejects.toThrow('Signal missing required field')
    })

    test('should log multiple signals', async () => {
      const signal1 = generator.generateSignal(mockStrategy, mockData)
      const signal2 = generator.generateSignal(mockStrategy, { ...mockData, close: 160 })

      await generator.logSignal(signal1)
      await generator.logSignal(signal2)

      const history = await generator.getSignalHistory()
      expect(history.length).toBeGreaterThanOrEqual(2)
    })
  })

  // ========== 信号历史查询测试 ==========

  describe('getSignalHistory', () => {
    beforeEach(async () => {
      // 创建测试信号
      const signal1 = generator.generateSignal(mockStrategy, mockData)
      const signal2 = generator.generateSignal(mockStrategy, { ...mockData, symbol: 'MSFT' })

      await generator.logSignal(signal1)
      await generator.logSignal(signal2)
    })

    test('should get all signals without filters', async () => {
      const history = await generator.getSignalHistory()
      expect(history.length).toBeGreaterThanOrEqual(2)
    })

    test('should filter by strategyId', async () => {
      const history = await generator.getSignalHistory({ strategyId: 'strategy_123' })
      expect(history.length).toBeGreaterThanOrEqual(2)
      expect(history.every(s => s.strategyId === 'strategy_123')).toBe(true)
    })

    test('should filter by symbol', async () => {
      const history = await generator.getSignalHistory({ symbol: 'AAPL' })
      expect(history.every(s => s.symbol === 'AAPL')).toBe(true)
    })

    test('should filter by type', async () => {
      const history = await generator.getSignalHistory({ type: 'BUY' })
      expect(history.every(s => s.type === 'BUY')).toBe(true)
    })

    test('should filter by date range', async () => {
      const startDate = new Date(Date.now() - 1000)
      const endDate = new Date(Date.now() + 1000)

      const history = await generator.getSignalHistory({ startDate, endDate })
      expect(history.every(s => {
        const timestamp = new Date(s.timestamp)
        return timestamp >= startDate && timestamp <= endDate
      })).toBe(true)
    })

    test('should limit results', async () => {
      const history = await generator.getSignalHistory({ limit: 1 })
      expect(history.length).toBe(1)
    })

    test('should sort by timestamp descending', async () => {
      const history = await generator.getSignalHistory()
      if (history.length > 1) {
        for (let i = 0; i < history.length - 1; i++) {
          expect(new Date(history[i].timestamp) >= new Date(history[i + 1].timestamp)).toBe(true)
        }
      }
    })
  })

  // ========== 信号清除测试 ==========

  describe('clearSignalHistory', () => {
    beforeEach(async () => {
      const signal1 = generator.generateSignal(mockStrategy, mockData)
      const signal2 = generator.generateSignal(mockStrategy, { ...mockData, symbol: 'MSFT' })

      await generator.logSignal(signal1)
      await generator.logSignal(signal2)
    })

    test('should clear all signals', async () => {
      const count = await generator.clearSignalHistory()
      expect(count).toBe(-1)

      const history = await generator.getSignalHistory()
      expect(history.length).toBe(0)
    })

    test('should clear signals by filter', async () => {
      const count = await generator.clearSignalHistory({ symbol: 'AAPL' })
      expect(count).toBeGreaterThan(0)

      const history = await generator.getSignalHistory({ symbol: 'AAPL' })
      expect(history.length).toBe(0)
    })
  })

  // ========== 信号统计测试 ==========

  describe('getSignalStats', () => {
    beforeEach(async () => {
      // 创建多个测试信号
      const buySignal1 = generator.generateSignal(mockStrategy, mockData)
      const buySignal2 = generator.generateSignal(mockStrategy, { ...mockData, symbol: 'MSFT' })

      const sellStrategy = {
        ...mockStrategy,
        code: `
          function onSignal(data) {
            return { type: 'SELL', price: data.close, strength: 70 }
          }
        `
      }
      const sellSignal = generator.generateSignal(sellStrategy, mockData)

      await generator.logSignal(buySignal1)
      await generator.logSignal(buySignal2)
      await generator.logSignal(sellSignal)
    })

    test('should calculate total signals', async () => {
      const stats = await generator.getSignalStats()
      expect(stats.total).toBeGreaterThanOrEqual(3)
    })

    test('should count buy and sell signals', async () => {
      const stats = await generator.getSignalStats()
      expect(stats.buySignals).toBeGreaterThanOrEqual(2)
      expect(stats.sellSignals).toBeGreaterThanOrEqual(1)
    })

    test('should calculate average strength', async () => {
      const stats = await generator.getSignalStats()
      expect(stats.avgStrength).toBeGreaterThan(0)
      expect(stats.avgStrength).toBeLessThanOrEqual(100)
    })

    test('should group by symbol', async () => {
      const stats = await generator.getSignalStats()
      expect(stats.bySymbol).toBeDefined()
      expect(stats.bySymbol['AAPL']).toBeDefined()
      expect(stats.bySymbol['MSFT']).toBeDefined()
    })

    test('should group by strategy', async () => {
      const stats = await generator.getSignalStats()
      expect(stats.byStrategy).toBeDefined()
      expect(stats.byStrategy['strategy_123']).toBeDefined()
      expect(stats.byStrategy['strategy_123'].name).toBe('Test Strategy')
    })

    test('should filter stats by strategyId', async () => {
      const stats = await generator.getSignalStats('strategy_123')
      expect(stats.total).toBeGreaterThanOrEqual(3)
    })

    test('should return empty stats for no signals', async () => {
      await generator.clearSignalHistory()
      const stats = await generator.getSignalStats()

      expect(stats.total).toBe(0)
      expect(stats.buySignals).toBe(0)
      expect(stats.sellSignals).toBe(0)
      expect(stats.avgStrength).toBe(0)
    })
  })

  // ========== ID生成测试 ==========

  describe('_generateId', () => {
    test('should generate unique IDs', () => {
      const id1 = generator._generateId()
      const id2 = generator._generateId()

      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^signal_\d+_[a-z0-9]+$/)
    })
  })
})

